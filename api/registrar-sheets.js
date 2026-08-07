const ALLOWED_HOSTS = ['www.estudiamostufactura.es', 'estudiamostufactura.es'];

function origenPermitido(req) {
  const origen = req.headers.origin || req.headers.referer || '';
  try {
    const { hostname, protocol } = new URL(origen);
    if (protocol !== 'https:') return false;
    return ALLOWED_HOSTS.includes(hostname) || hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return;
  }
  if (!origenPermitido(req)) {
    res.status(403).json({ ok: false, error: 'forbidden_origin' });
    return;
  }
  const { id, nombre, email, telefono, suministro, num_archivos, archivos_nombres, fecha } = req.body || {};
  if (!nombre || !email || !telefono) {
    res.status(400).json({ ok: false, error: 'missing_fields' });
    return;
  }

  const { GOOGLE_SHEETS_URL, GOOGLE_SHEETS_SECRET } = process.env;
  try {
    const sheetsRes = await fetch(GOOGLE_SHEETS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ id, nombre, email, telefono, suministro, num_archivos, archivos_nombres, fecha, secret: GOOGLE_SHEETS_SECRET })
    });
    if (!sheetsRes.ok) throw new Error('Google Sheets respondió ' + sheetsRes.status);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(502).json({ ok: false, error: String(e.message || e) });
  }
}
