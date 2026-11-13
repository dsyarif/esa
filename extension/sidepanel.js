(() => {
  const MAX_BYTES = 500 * 1024;
  const ALLOWED_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'pdf']);
  const DB_NAME = 'esaPamomongDB';
  const STORE_NAME = 'handles';
  const FOLDER_KEY = 'buktiDir';

  const els = {
    btnRefreshTab: document.getElementById('btnRefreshTab'),
    connBadge: document.getElementById('connBadge'),
    connMessage: document.getElementById('connMessage'),
    modalAlert: document.getElementById('modalAlert'),
    folderStatusBox: document.getElementById('folderStatusBox'),
    btnChooseFolder: document.getElementById('btnChooseFolder'),
    btnRefreshFolder: document.getElementById('btnRefreshFolder'),
    btnClearFolder: document.getElementById('btnClearFolder'),
    folderInput: document.getElementById('folderInput'),
    fileCountBadge: document.getElementById('fileCountBadge'),
    monthYearInput: document.getElementById('monthYearInput'),
    dayFilterSelect: document.getElementById('dayFilterSelect'),
    btnToggleDefaults: document.getElementById('btnToggleDefaults'),
    defaultsBody: document.getElementById('defaultsBody'),
    defaultRhk: document.getElementById('defaultRhk'),
    defaultAktivitas: document.getElementById('defaultAktivitas'),
    defaultLokasi: document.getElementById('defaultLokasi'),
    defaultPj: document.getElementById('defaultPj'),
    emptyState: document.getElementById('emptyState'),
    loadingState: document.getElementById('loadingState'),
    entryList: document.getElementById('entryList'),
    doneCountText: document.getElementById('doneCountText')
  };

  let entries = [];
  let activeTabId = null;
  let activeDirHandle = null;
  let pendingDirHandle = null;
  let modalState = {
    found: false,
    visible: false,
    existingRows: []
  };

  // --- IndexedDB untuk menyimpan DirectoryHandle antar-sesi ---
  function idbOpen() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbSet(key, val) {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(val, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function idbGet(key) {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbDel(key) {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  function getCurrentMonthYear() {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = String(now.getFullYear());
    return `${mm}-${yyyy}`;
  }

  // Pola penamaan file identik dengan parseFilename() di index.html ESA
  function parseFilename(name) {
    const rNewDot = /^(\d+)\.(\d+)\s*·\s*(\d{2}\.\d{2}|--\.--)-(\d{2}\.\d{2}|--\.--)\s*·\s*(.+)\.([^.]+)$/;
    const rNewDash = /^(\d+)\.(\d+)\s*-\s*(\d{2}\.\d{2}|--\.--)-(\d{2}\.\d{2}|--\.--)\s*-\s*(.+)\.([^.]+)$/;
    const rOld = /^(\d+)\.(\d+)\s*-\s*(.+)\.([^.]+)$/;
    let m = name.match(rNewDot) || name.match(rNewDash);
    if (m) {
      return {
        day: parseInt(m[1], 10),
        seq: parseInt(m[2], 10),
        start: m[3] === '--.--' ? '' : m[3].replace('.', ':'),
        end: m[4] === '--.--' ? '' : m[4].replace('.', ':'),
        title: m[5].trim(),
        ext: m[6].toLowerCase()
      };
    }
    m = name.match(rOld);
    if (m) {
      return {
        day: parseInt(m[1], 10),
        seq: parseInt(m[2], 10),
        start: '',
        end: '',
        title: m[3].trim(),
        ext: m[4].toLowerCase()
      };
    }
    const dot = name.lastIndexOf('.');
    return {
      day: null,
      seq: 0,
      start: '',
      end: '',
      title: dot > -1 ? name.slice(0, dot).trim() : name,
      ext: dot > -1 ? name.slice(dot + 1).toLowerCase() : ''
    };
  }

  function formatSizeKB(bytes) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  function showModalAlert(message, type = 'warn') {
    els.modalAlert.textContent = message;
    els.modalAlert.className = `alert alert-${type}`;
  }

  function clearModalAlert() {
    els.modalAlert.textContent = '';
    els.modalAlert.className = 'alert hidden';
  }

  function setConnectionStatus(badgeText, badgeKind, message) {
    els.connBadge.textContent = badgeText;
    els.connBadge.className = `badge badge-${badgeKind}`;
    els.connMessage.textContent = message;
  }

  function updateFolderUI() {
    if (activeDirHandle) {
      els.folderStatusBox.textContent = `Folder aktif: ${activeDirHandle.name}`;
      els.folderStatusBox.className = 'folder-label set';
      els.btnChooseFolder.textContent = 'Ganti Folder';
      els.btnRefreshFolder.classList.remove('hidden');
      els.btnClearFolder.classList.remove('hidden');
    } else if (pendingDirHandle) {
      els.folderStatusBox.textContent = `Folder tersimpan: ${pendingDirHandle.name} (klik "Aktifkan Folder Tersimpan" untuk memuat)`;
      els.folderStatusBox.className = 'folder-label pending';
      els.btnChooseFolder.textContent = 'Aktifkan Folder Tersimpan';
      els.btnRefreshFolder.classList.add('hidden');
      els.btnClearFolder.classList.remove('hidden');
    } else if (entries.length > 0) {
      els.folderStatusBox.textContent = 'Folder dimuat melalui pemilih berkas sementara';
      els.folderStatusBox.className = 'folder-label set';
      els.btnChooseFolder.textContent = 'Ganti Folder';
      els.btnRefreshFolder.classList.add('hidden');
      els.btnClearFolder.classList.remove('hidden');
    } else {
      els.folderStatusBox.textContent = 'Belum ada folder bukti yang dipilih';
      els.folderStatusBox.className = 'folder-label';
      els.btnChooseFolder.textContent = 'Atur Folder Bukti';
      els.btnRefreshFolder.classList.add('hidden');
      els.btnClearFolder.classList.add('hidden');
    }
  }

  function buildFullDate(day) {
    const raw = (els.monthYearInput.value || '').trim();
    const my = /^\d{2}-\d{4}$/.test(raw) ? raw : getCurrentMonthYear();
    const dd = day ? String(day).padStart(2, '0') : '01';
    return `${dd}-${my}`;
  }

  function populateSelect(selectEl, options, previousVal) {
    selectEl.innerHTML = '<option value="">Ikuti pilihan di modal</option>';
    options.forEach((opt) => {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.text;
      selectEl.appendChild(o);
    });
    if (previousVal && options.some((o) => o.value === previousVal)) {
      selectEl.value = previousVal;
    }
  }

  async function getActiveTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs && tabs.length ? tabs[0] : null;
  }

  async function syncSelect2InPage(rhkVal, aktivitasVal) {
    if (!activeTabId) return;
    try {
      await chrome.scripting.executeScript({
        target: { tabId: activeTabId },
        world: 'MAIN',
        func: (rhk, akt) => {
          const $ = window.jQuery || window.$;
          if (!$) return;
          if (rhk) {
            $('#rhk').val(rhk).trigger('change');
          }
          if (akt) {
            setTimeout(() => {
              $('#aktivitas').val(akt).trigger('change');
            }, 350);
          }
        },
        args: [rhkVal || '', aktivitasVal || '']
      });
    } catch (err) {
      console.warn('Sinkronisasi Select2 gagal:', err);
    }
  }

  async function inspectActiveTab() {
    clearModalAlert();
    const tab = await getActiveTab();
    if (!tab || !tab.id) {
      activeTabId = null;
      modalState = { found: false, visible: false, existingRows: [] };
      setConnectionStatus('Tidak ada tab', 'bad', 'Tidak dapat menemukan tab browser yang aktif.');
      renderEntries();
      return;
    }

    activeTabId = tab.id;
    const isPamomong = (tab.url || '').startsWith('https://kinerja.pekalongankota.go.id/');
    if (!isPamomong) {
      modalState = { found: false, visible: false, existingRows: [] };
      setConnectionStatus('Bukan Pamomong', 'warn', 'Buka halaman e-Kinerja Pamomong Kota Pekalongan terlebih dahulu.');
      renderEntries();
      return;
    }

    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'INSPECT_MODAL' });
      if (!response || !response.found) {
        modalState = { found: false, visible: false, existingRows: [] };
        setConnectionStatus('Modal belum ada', 'warn', 'Buka menu dan modal Form Resume Kegiatan ASN di Pamomong.');
        renderEntries();
        return;
      }

      modalState = response;
      if (response.visible) {
        setConnectionStatus('Modal siap', 'good', 'Modal Form Resume Kegiatan ASN terdeteksi dan siap diisi.');
      } else {
        setConnectionStatus('Modal tertutup', 'warn', 'Form ditemukan di halaman, silakan buka modalnya sebelum klik Isi ke Modal.');
      }

      if (response.currentTanggal && /^\d{1,2}-\d{2}-\d{4}$/.test(response.currentTanggal)) {
        const parts = response.currentTanggal.split('-');
        if (!els.monthYearInput.value) {
          els.monthYearInput.value = `${parts[1]}-${parts[2]}`;
        }
      }

      const savedRhk = els.defaultRhk.value || response.selectedRhk;
      const savedAkt = els.defaultAktivitas.value || response.selectedAktivitas;
      populateSelect(els.defaultRhk, response.rhkOptions || [], savedRhk);
      populateSelect(els.defaultAktivitas, response.aktivitasOptions || [], savedAkt);

      renderEntries();
    } catch (_err) {
      modalState = { found: false, visible: false, existingRows: [] };
      setConnectionStatus(
        'Perlu muat ulang',
        'bad',
        'Skrip halaman belum aktif. Muat ulang (F5) tab Pamomong lalu klik Periksa Modal.'
      );
      renderEntries();
    }
  }

  async function compressImageToJpegLimit(file, maxBytes) {
    const imgUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Gagal membaca gambar untuk kompresi.'));
        image.src = imgUrl;
      });

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      let quality = 0.86;
      let blob = null;

      for (let attempt = 0; attempt < 8; attempt++) {
        canvas.width = Math.max(1, Math.round(width));
        canvas.height = Math.max(1, Math.round(height));
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
        if (blob && blob.size <= maxBytes) {
          break;
        }
        if (quality > 0.5) {
          quality -= 0.12;
        } else {
          width *= 0.8;
          height *= 0.8;
        }
      }

      if (!blob) {
        throw new Error('Kompresi gambar menghasilkan berkas kosong.');
      }

      const baseName = file.name.replace(/\.[^.]+$/, '');
      return {
        name: `${baseName}.jpg`,
        type: 'image/jpeg',
        blob
      };
    } finally {
      URL.revokeObjectURL(imgUrl);
    }
  }

  async function prepareFilePayload(file, ext) {
    if (ext === 'pdf') {
      if (file.size > MAX_BYTES) {
        throw new Error(`Berkas PDF "${file.name}" berukuran ${formatSizeKB(file.size)} (melebihi batas 500 KB Pamomong).`);
      }
      const buffer = await file.arrayBuffer();
      return {
        name: file.name,
        type: 'application/pdf',
        bytes: Array.from(new Uint8Array(buffer))
      };
    }

    const needsConvert = ext === 'png' || ext === 'webp' || file.size > MAX_BYTES;
    let finalName = file.name;
    let finalType = file.type || 'image/jpeg';
    let targetBlob = file;

    if (needsConvert) {
      const compressed = await compressImageToJpegLimit(file, MAX_BYTES);
      finalName = compressed.name;
      finalType = compressed.type;
      targetBlob = compressed.blob;
    }

    if (targetBlob.size > MAX_BYTES) {
      throw new Error(`Gambar tetap ${formatSizeKB(targetBlob.size)} setelah kompresi (batas 500 KB).`);
    }

    const buffer = await targetBlob.arrayBuffer();
    return {
      name: finalName,
      type: finalType,
      bytes: Array.from(new Uint8Array(buffer))
    };
  }

  function isAlreadyInModalTable(entry) {
    if (!modalState.existingRows || !modalState.existingRows.length) return false;
    const normTitle = entry.resumeText.trim().toLowerCase();
    return modalState.existingRows.some((row) => {
      const sameTime = entry.start && entry.end && row.mulai === entry.start && row.selesai === entry.end;
      const sameResume = row.resume.toLowerCase() === normTitle;
      return sameTime || sameResume;
    });
  }

  function updateDayFilterOptions() {
    const prev = els.dayFilterSelect.value;
    const days = Array.from(
      new Set(entries.map((e) => e.day).filter((d) => d !== null))
    ).sort((a, b) => a - b);

    els.dayFilterSelect.innerHTML = '<option value="all">Semua tanggal</option>';
    days.forEach((d) => {
      const opt = document.createElement('option');
      opt.value = String(d);
      opt.textContent = `Tanggal ${String(d).padStart(2, '0')}`;
      els.dayFilterSelect.appendChild(opt);
    });

    if (prev && (prev === 'all' || days.includes(Number(prev)))) {
      els.dayFilterSelect.value = prev;
    }
  }

  function applyFileList(fileObjects) {
    const parsed = [];
    fileObjects.forEach((file, idx) => {
      if (file.name.startsWith('.')) return;
      const info = parseFilename(file.name);
      if (!ALLOWED_EXTS.has(info.ext)) return;

      parsed.push({
        id: `${Date.now()}-${idx}`,
        file,
        day: info.day,
        seq: info.seq,
        start: info.start,
        end: info.end,
        resumeText: info.title,
        ext: info.ext,
        filledInSession: false
      });
    });

    parsed.sort((a, b) => {
      const dayDiff = (a.day ?? 99) - (b.day ?? 99);
      if (dayDiff !== 0) return dayDiff;
      return a.seq - b.seq;
    });

    entries = parsed;
    updateDayFilterOptions();
    updateFolderUI();
    renderEntries();
  }

  async function loadFilesFromDirHandle(handle) {
    els.loadingState.classList.remove('hidden');
    els.emptyState.classList.add('hidden');
    try {
      const files = [];
      for await (const [name, entryHandle] of handle.entries()) {
        if (entryHandle.kind !== 'file' || name.startsWith('.')) continue;
        const info = parseFilename(name);
        if (!ALLOWED_EXTS.has(info.ext)) continue;
        const f = await entryHandle.getFile();
        files.push(f);
      }
      applyFileList(files);
    } finally {
      els.loadingState.classList.add('hidden');
    }
  }

  async function ensureDirReadPermission(handle) {
    let perm = await handle.queryPermission({ mode: 'read' });
    if (perm !== 'granted') {
      perm = await handle.requestPermission({ mode: 'read' });
    }
    if (perm !== 'granted') {
      throw new Error('Izin baca folder ditolak oleh pengguna.');
    }
  }

  async function handleChooseFolderClick() {
    clearModalAlert();

    if (pendingDirHandle) {
      try {
        await ensureDirReadPermission(pendingDirHandle);
        activeDirHandle = pendingDirHandle;
        pendingDirHandle = null;
        await loadFilesFromDirHandle(activeDirHandle);
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
        pendingDirHandle = null;
      }
    }

    if (typeof window.showDirectoryPicker === 'function') {
      try {
        const handle = await window.showDirectoryPicker({ mode: 'read' });
        await ensureDirReadPermission(handle);
        activeDirHandle = handle;
        pendingDirHandle = null;
        try {
          await idbSet(FOLDER_KEY, handle);
        } catch (err) {
          console.warn('Gagal menyimpan handle folder ke IndexedDB:', err);
        }
        await loadFilesFromDirHandle(handle);
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
        console.warn('showDirectoryPicker gagal, beralih ke pemilih folder cadangan:', err);
      }
    }

    els.folderInput.click();
  }

  async function handleRefreshFolderClick() {
    clearModalAlert();
    if (!activeDirHandle) return;
    try {
      await ensureDirReadPermission(activeDirHandle);
      await loadFilesFromDirHandle(activeDirHandle);
    } catch (err) {
      showModalAlert(String(err && err.message ? err.message : err), 'warn');
    }
  }

  async function handleClearFolderClick() {
    clearModalAlert();
    activeDirHandle = null;
    pendingDirHandle = null;
    entries = [];
    els.folderInput.value = '';
    try {
      await idbDel(FOLDER_KEY);
    } catch (err) {
      console.warn('Gagal menghapus folder tersimpan:', err);
    }
    updateDayFilterOptions();
    updateFolderUI();
    renderEntries();
  }

  async function initSavedFolder() {
    if (!('indexedDB' in window) || typeof window.showDirectoryPicker !== 'function') {
      updateFolderUI();
      return;
    }
    try {
      const handle = await idbGet(FOLDER_KEY);
      if (handle) {
        const perm = await handle.queryPermission({ mode: 'read' });
        if (perm === 'granted') {
          activeDirHandle = handle;
          await loadFilesFromDirHandle(handle);
          return;
        }
        pendingDirHandle = handle;
      }
    } catch (err) {
      console.warn('Folder tersimpan tidak dapat dipulihkan:', err);
    }
    updateFolderUI();
  }

  async function handleFillEntry(entry, btnEl) {
    clearModalAlert();
    if (!activeTabId || !modalState.found) {
      await inspectActiveTab();
      if (!activeTabId || !modalState.found) {
        showModalAlert('Buka tab e-Kinerja Pamomong dan tampilkan modal Form Resume Kegiatan ASN terlebih dahulu.', 'bad');
        return;
      }
    }

    if (!entry.start || !entry.end) {
      showModalAlert(`Jam mulai/selesai pada "${entry.file.name}" kosong. Pastikan format nama file ESA memiliki jam (contoh: 12.1 - 08.00-09.30 - Judul.jpg).`, 'warn');
      return;
    }

    btnEl.disabled = true;
    const originalText = btnEl.textContent;
    btnEl.textContent = 'Mengisi...';

    try {
      const filePayload = await prepareFilePayload(entry.file, entry.ext);
      const rhkVal = els.defaultRhk.value;
      const aktVal = els.defaultAktivitas.value;

      const res = await chrome.tabs.sendMessage(activeTabId, {
        type: 'FILL_MODAL',
        payload: {
          tanggal: buildFullDate(entry.day),
          mulai: entry.start,
          selesai: entry.end,
          lokasi: els.defaultLokasi.value.trim(),
          penanggungjawab: els.defaultPj.value.trim(),
          rhk: rhkVal,
          aktivitas: aktVal,
          output: entry.resumeText.trim(),
          fileData: filePayload
        }
      });

      if (!res || !res.ok) {
        showModalAlert((res && res.error) || 'Gagal mengisi form modal.', 'bad');
        return;
      }

      if (rhkVal || aktVal) {
        await syncSelect2InPage(rhkVal, aktVal);
      }

      entry.filledInSession = true;
      showModalAlert(
        `Berhasil mengisi ${entry.day ? `tgl ${String(entry.day).padStart(2, '0')}` : 'form'} (${entry.start}-${entry.end}) dan melampirkan ${res.attachedName}. Cek SKP/Kegiatan lalu klik SIMPAN di Pamomong.`,
        'good'
      );
      renderEntries();
    } catch (err) {
      showModalAlert(String(err && err.message ? err.message : err), 'bad');
    } finally {
      btnEl.disabled = false;
      btnEl.textContent = originalText;
    }
  }

  function renderEntries() {
    els.entryList.innerHTML = '';

    if (entries.length === 0) {
      els.emptyState.classList.remove('hidden');
      els.doneCountText.textContent = '';
      els.fileCountBadge.textContent = '0 berkas';
      return;
    }

    els.emptyState.classList.add('hidden');
    const selectedDay = els.dayFilterSelect.value;
    const visibleEntries = selectedDay === 'all'
      ? entries
      : entries.filter((e) => String(e.day) === selectedDay);

    els.fileCountBadge.textContent = `${visibleEntries.length} berkas`;

    let doneCount = 0;
    visibleEntries.forEach((entry) => {
      const inTable = isAlreadyInModalTable(entry);
      if (entry.filledInSession || inTable) doneCount += 1;

      const li = document.createElement('li');
      li.className = `entry-card${entry.filledInSession || inTable ? ' is-synced' : ''}`;

      const top = document.createElement('div');
      top.className = 'entry-top';

      const meta = document.createElement('div');
      meta.className = 'entry-meta';

      const seqBadge = document.createElement('span');
      seqBadge.className = 'entry-seq';
      seqBadge.textContent = entry.day !== null ? `${entry.day}.${entry.seq}` : 'File';

      const dateSpan = document.createElement('span');
      dateSpan.className = 'entry-date';
      dateSpan.textContent = buildFullDate(entry.day);

      const timeSpan = document.createElement('span');
      timeSpan.className = 'entry-time';
      timeSpan.textContent = entry.start && entry.end ? `${entry.start} - ${entry.end}` : 'Jam belum terisi';

      const sizeSpan = document.createElement('span');
      sizeSpan.className = `entry-size${entry.file.size > MAX_BYTES ? ' over-limit' : ''}`;
      sizeSpan.textContent = entry.file.size > MAX_BYTES
        ? `${formatSizeKB(entry.file.size)} (akan dikompresi)`
        : formatSizeKB(entry.file.size);

      meta.append(seqBadge, dateSpan, timeSpan, sizeSpan);
      top.appendChild(meta);

      if (inTable) {
        const statusBadge = document.createElement('span');
        statusBadge.className = 'badge badge-good';
        statusBadge.textContent = 'Sudah di tabel';
        top.appendChild(statusBadge);
      } else if (entry.filledInSession) {
        const statusBadge = document.createElement('span');
        statusBadge.className = 'badge badge-good';
        statusBadge.textContent = 'Terisi ke modal';
        top.appendChild(statusBadge);
      }

      const resumeField = document.createElement('div');
      resumeField.className = 'field';
      const resumeLabel = document.createElement('label');
      const inputId = `resume-${entry.id}`;
      resumeLabel.setAttribute('for', inputId);
      resumeLabel.textContent = 'Resume / Ringkasan Kegiatan';

      const resumeInput = document.createElement('textarea');
      resumeInput.id = inputId;
      resumeInput.value = entry.resumeText;
      resumeInput.addEventListener('input', (ev) => {
        entry.resumeText = ev.target.value;
      });
      resumeField.append(resumeLabel, resumeInput);

      const actions = document.createElement('div');
      actions.className = 'entry-actions';

      const filenameEl = document.createElement('span');
      filenameEl.className = 'entry-filename';
      filenameEl.title = entry.file.name;
      filenameEl.textContent = entry.file.name;

      const fillBtn = document.createElement('button');
      fillBtn.type = 'button';
      fillBtn.className = 'btn btn-primary btn-sm';
      fillBtn.textContent = 'Isi ke Modal';
      fillBtn.disabled = !modalState.found;
      fillBtn.addEventListener('click', () => handleFillEntry(entry, fillBtn));

      actions.append(filenameEl, fillBtn);
      li.append(top, resumeField, actions);
      els.entryList.appendChild(li);
    });

    els.doneCountText.textContent = `${doneCount}/${visibleEntries.length} siap/terisi`;
  }

  function handleFolderInputFallback(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    activeDirHandle = null;
    pendingDirHandle = null;
    applyFileList(files);
  }

  function saveDefaults() {
    chrome.storage.local.set({
      esaPamomongDefaults: {
        monthYear: els.monthYearInput.value.trim(),
        lokasi: els.defaultLokasi.value,
        pj: els.defaultPj.value,
        rhk: els.defaultRhk.value
      }
    });
  }

  async function loadDefaults() {
    const data = await chrome.storage.local.get('esaPamomongDefaults');
    const saved = data && data.esaPamomongDefaults ? data.esaPamomongDefaults : {};
    els.monthYearInput.value = saved.monthYear || getCurrentMonthYear();
    els.defaultLokasi.value = saved.lokasi || '';
    els.defaultPj.value = saved.pj || '';
    if (saved.rhk) {
      const opt = document.createElement('option');
      opt.value = saved.rhk;
      opt.textContent = 'SKP tersimpan (sinkronkan modal)';
      els.defaultRhk.appendChild(opt);
      els.defaultRhk.value = saved.rhk;
    }
  }

  els.btnRefreshTab.addEventListener('click', inspectActiveTab);
  els.btnChooseFolder.addEventListener('click', handleChooseFolderClick);
  els.btnRefreshFolder.addEventListener('click', handleRefreshFolderClick);
  els.btnClearFolder.addEventListener('click', handleClearFolderClick);
  els.folderInput.addEventListener('change', handleFolderInputFallback);
  els.dayFilterSelect.addEventListener('change', renderEntries);

  els.monthYearInput.addEventListener('input', () => {
    saveDefaults();
    renderEntries();
  });
  els.defaultLokasi.addEventListener('input', saveDefaults);
  els.defaultPj.addEventListener('input', saveDefaults);
  els.defaultAktivitas.addEventListener('change', saveDefaults);

  els.defaultRhk.addEventListener('change', async () => {
    saveDefaults();
    if (activeTabId && modalState.found && els.defaultRhk.value) {
      await syncSelect2InPage(els.defaultRhk.value, '');
      setTimeout(inspectActiveTab, 600);
    }
  });

  els.btnToggleDefaults.addEventListener('click', () => {
    const collapsed = els.defaultsBody.classList.toggle('hidden');
    els.btnToggleDefaults.textContent = collapsed ? 'Tampilkan' : 'Sembunyikan';
    els.btnToggleDefaults.setAttribute('aria-expanded', String(!collapsed));
  });

  chrome.tabs.onActivated.addListener(inspectActiveTab);
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (tabId === activeTabId && changeInfo.status === 'complete') {
      inspectActiveTab();
    }
  });

  Promise.all([loadDefaults(), initSavedFolder()]).then(inspectActiveTab);
})();
