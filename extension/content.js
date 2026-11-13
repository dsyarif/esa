(() => {
  if (window.__esaPamomongContentLoaded) return;
  window.__esaPamomongContentLoaded = true;

  function setFieldValue(selector, value, onlyIfProvided = false) {
    const el = document.querySelector(selector);
    if (!el) return false;
    if (onlyIfProvided && (value === undefined || value === null || value === '')) {
      return true;
    }
    el.value = value ?? '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function readSelectOptions(selector) {
    const select = document.querySelector(selector);
    if (!select) return [];
    return Array.from(select.options)
      .filter((opt) => opt.value !== '')
      .map((opt) => ({
        value: opt.value,
        text: (opt.textContent || '').trim()
      }));
  }

  function readExistingRows() {
    const rows = document.querySelectorAll('#data-kegiatan-asn-diform tbody tr');
    const result = [];
    rows.forEach((tr) => {
      if (tr.querySelector('.dataTables_empty')) return;
      const cells = tr.querySelectorAll('td');
      if (cells.length < 5) return;
      result.push({
        no: (cells[0].textContent || '').trim(),
        mulai: (cells[1].textContent || '').trim(),
        selesai: (cells[2].textContent || '').trim(),
        kegiatan: (cells[3].textContent || '').trim(),
        resume: (cells[4].textContent || '').trim()
      });
    });
    return result;
  }

  function inspectModal() {
    const form = document.getElementById('formKegiatanAsn');
    if (!form) {
      return { found: false, visible: false };
    }
    const modal = form.closest('.modal');
    const visible = modal
      ? modal.classList.contains('show') || modal.style.display === 'block' || form.offsetParent !== null
      : form.offsetParent !== null;

    const tanggalEl = document.getElementById('tanggal');
    const rhkEl = document.getElementById('rhk');
    const aktivitasEl = document.getElementById('aktivitas');

    return {
      found: true,
      visible,
      currentTanggal: tanggalEl ? tanggalEl.value : '',
      selectedRhk: rhkEl ? rhkEl.value : '',
      selectedAktivitas: aktivitasEl ? aktivitasEl.value : '',
      rhkOptions: readSelectOptions('#rhk'),
      aktivitasOptions: readSelectOptions('#aktivitas'),
      existingRows: readExistingRows()
    };
  }

  function attachFileToInput(fileData) {
    const fileInput = document.getElementById('file');
    if (!fileInput) {
      return { ok: false, error: 'Elemen input #file tidak ditemukan di modal.' };
    }
    if (!fileData || !Array.isArray(fileData.bytes)) {
      return { ok: false, error: 'Data berkas tidak valid.' };
    }

    const uint8 = new Uint8Array(fileData.bytes);
    const file = new File([uint8], fileData.name, {
      type: fileData.type || 'image/jpeg',
      lastModified: Date.now()
    });

    const dt = new DataTransfer();
    dt.items.add(file);
    fileInput.files = dt.files;
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));

    return {
      ok: true,
      attachedCount: fileInput.files.length,
      attachedName: fileInput.files[0] ? fileInput.files[0].name : ''
    };
  }

  function fillModal(payload) {
    const form = document.getElementById('formKegiatanAsn');
    if (!form) {
      return { ok: false, error: 'Form #formKegiatanAsn tidak ditemukan. Buka modal Form Resume Kegiatan ASN terlebih dahulu.' };
    }

    setFieldValue('#tanggal', payload.tanggal);
    setFieldValue('#mulai', payload.mulai);
    setFieldValue('#selesai', payload.selesai);
    setFieldValue('#lokasi', payload.lokasi, true);
    setFieldValue('#output', payload.output);
    setFieldValue('#penanggungjawab', payload.penanggungjawab, true);

    if (payload.rhk) {
      setFieldValue('#rhk', payload.rhk);
    }
    if (payload.aktivitas) {
      setFieldValue('#aktivitas', payload.aktivitas);
    }

    let fileResult = { ok: true };
    if (payload.fileData) {
      fileResult = attachFileToInput(payload.fileData);
      if (!fileResult.ok) return fileResult;
    }

    const outputEl = document.getElementById('output');
    if (outputEl) {
      outputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return {
      ok: true,
      attachedName: fileResult.attachedName || ''
    };
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || !message.type) return;

    if (message.type === 'INSPECT_MODAL') {
      sendResponse(inspectModal());
      return true;
    }

    if (message.type === 'FILL_MODAL') {
      try {
        sendResponse(fillModal(message.payload || {}));
      } catch (err) {
        sendResponse({ ok: false, error: String(err && err.message ? err.message : err) });
      }
      return true;
    }
  });
})();
