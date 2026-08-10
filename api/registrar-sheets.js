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
  if (req.query && req.query.debug === 'd6629ee61eeaf26f68ce4d47b1ac6c0e') {
    const { GOOGLE_SHEETS_URL, GOOGLE_SHEETS_SECRET } = process.env;
    res.status(200).json({
      url_presente: !!GOOGLE_SHEETS_URL,
      url_termina_en: GOOGLE_SHEETS_URL ? GOOGLE_SHEETS_URL.slice(-25) : null,
      secret_presente: !!GOOGLE_SHEETS_SECRET,
      secret_longitud: GOOGLE_SHEETS_SECRET ? GOOGLE_SHEETS_SECRET.length : 0,
      secret_primeros4: GOOGLE_SHEETS_SECRET ? GOOGLE_SHEETS_SECRET.slice(0, 4) : null,
      secret_ultimos4: GOOGLE_SHEETS_SECRET ? GOOGLE_SHEETS_SECRET.slice(-4) : null
    });
    return;
  }
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
    const texto = await sheetsRes.text();
    let cuerpo;
    try { cuerpo = JSON.parse(texto); } catch { cuerpo = null; }
    if (!sheetsRes.ok || !cuerpo || cuerpo.ok !== true) {
      console.error('[registrar-sheets] respuesta inesperada de Google', sheetsRes.status, texto.slice(0, 500));
      res.status(502).json({ ok: false, error: 'sheets_failed', status: sheetsRes.status, detail: texto.slice(0, 300) });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(502).json({ ok: false, error: String(e.message || e) });
  }
}
