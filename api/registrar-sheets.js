const ALLOWED_HOSTS = ['www.estudiamostufactura.es', 'estudiamostufactura.es'];
const SUPABASE_HOST = 'etnypsdzfwmtxdfokwqm.supabase.co';

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

function archivosValidos(archivos) {
  if (!Array.isArray(archivos)) return [];
  return archivos
    .filter((a) => a && typeof a.nombre === 'string' && typeof a.url === 'string')
    .filter((a) => {
      try {
        const { hostname, protocol } = new URL(a.url);
        return protocol === 'https:' && hostname === SUPABASE_HOST;
      } catch {
        return false;
      }
    })
    .slice(0, 10)
    .map((a) => ({ nombre: a.nombre.slice(0, 200), url: a.url }));
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
  const { id, nombre, email, telefono, suministro, num_archivos, archivos_nombres, archivos, fecha } = req.body || {};
  if (!nombre || !email || !telefono) {
    res.status(400).json({ ok: false, error: 'missing_fields' });
    return;
  }

  const GOOGLE_SHEETS_URL = (process.env.GOOGLE_SHEETS_URL || '').trim();
  const GOOGLE_SHEETS_SECRET = (process.env.GOOGLE_SHEETS_SECRET || '').trim();
  try {
    const sheetsRes = await fetch(GOOGLE_SHEETS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ id, nombre, email, telefono, suministro, num_archivos, archivos_nombres, archivos: archivosValidos(archivos), fecha, secret: GOOGLE_SHEETS_SECRET })
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
