export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return;
  }
  const { GOOGLE_SHEETS_URL, GOOGLE_SHEETS_SECRET } = process.env;
  try {
    const sheetsRes = await fetch(GOOGLE_SHEETS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...req.body, secret: GOOGLE_SHEETS_SECRET })
    });
    if (!sheetsRes.ok) throw new Error('Google Sheets respondió ' + sheetsRes.status);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(502).json({ ok: false, error: String(e.message || e) });
  }
}
