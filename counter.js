/**
 * Counter akses ESA — Vercel Serverless Function
 *
 * Penyimpanan: Upstash Redis (Vercel Dashboard > Storage / Marketplace > Upstash Redis).
 * Variabel lingkungan yang dipakai (otomatis terisi saat Redis dihubungkan ke project):
 *   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 *   (atau KV_REST_API_URL + KV_REST_API_TOKEN pada integrasi lama)
 *
 * Endpoint:
 *   GET /api/counter?action=hit&id=<id-anonim>   -> catat kunjungan, kembalikan statistik
 *   GET /api/counter?action=stats                -> kembalikan statistik saja
 *
 * Respons: { total, today, unique }
 * Yang tersimpan: hitungan total, hitungan harian, dan jumlah ID anonim unik (HyperLogLog).
 * Tidak ada nama, file, atau isi bukti dukung yang dikirim/disimpan.
 */

const TZ = 'Asia/Jakarta';

function todayKey() {
  // en-CA menghasilkan format YYYY-MM-DD
  const d = new Date().toLocaleDateString('en-CA', { timeZone: TZ });
  return 'esa:day:' + d;
}

async function redisPipeline(commands) {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('Redis belum dihubungkan (env UPSTASH_REDIS_REST_URL/TOKEN kosong)');

  const res = await fetch(url.replace(/\/$/, '') + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands)
  });
  if (!res.ok) throw new Error('Redis HTTP ' + res.status);
  const data = await res.json();
  return data.map(function (item) {
    if (item && item.error) throw new Error(item.error);
    return item ? item.result : null;
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  try {
    const query = req.query || {};
    const action = query.action === 'hit' ? 'hit' : 'stats';
    const id = String(query.id || '').replace(/[^A-Za-z0-9-]/g, '').slice(0, 64);
    const dayKey = todayKey();

    let commands;
    if (action === 'hit') {
      commands = [
        ['INCR', 'esa:total'],
        ['INCR', dayKey],
        ['EXPIRE', dayKey, 60 * 60 * 24 * 400],
        id ? ['PFADD', 'esa:visitors', id] : ['PFCOUNT', 'esa:visitors'],
        ['PFCOUNT', 'esa:visitors']
      ];
    } else {
      commands = [
        ['GET', 'esa:total'],
        ['GET', dayKey],
        ['PFCOUNT', 'esa:visitors']
      ];
    }

    const r = await redisPipeline(commands);
    const out = action === 'hit'
      ? { total: Number(r[0]), today: Number(r[1]), unique: Number(r[4]) }
      : { total: Number(r[0] || 0), today: Number(r[1] || 0), unique: Number(r[2] || 0) };

    res.statusCode = 200;
    return res.end(JSON.stringify(out));
  } catch (err) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: String(err.message || err) }));
  }
};
