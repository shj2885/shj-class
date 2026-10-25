// 친구들 작품 전시판(선생님): 비밀번호(ADMIN_PASSWORD) 확인 뒤 그림을 보고·승인하고·숨기고·지운다.
const crypto = require('node:crypto');
const SB_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const sbHeaders = () => ({
  apikey: SB_KEY,
  ...(String(SB_KEY).startsWith('eyJ') ? { Authorization: `Bearer ${SB_KEY}` } : {}),
  'Content-Type': 'application/json',
});
const same = (a, b) => {
  const h = (s) => crypto.createHash('sha256').update(String(s)).digest();
  return crypto.timingSafeEqual(h(a), h(b));
};
const validId = (id) => Number.isInteger(id) && id > 0;
const STATUSES = ['pending', 'approved', 'hidden'];

function body(req) {
  let b;
  try { b = req.body || {}; } catch { b = {}; }
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  return b && typeof b === 'object' ? b : {};
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass) return res.status(500).json({ error: 'Vercel 환경변수에 ADMIN_PASSWORD를 넣고 다시 배포해 주세요.' });
  if (!same(req.headers['x-admin-password'] || '', pass)) return res.status(401).json({ error: '비밀번호가 맞지 않아요.' });
  if (!SB_URL || !SB_KEY) return res.status(500).json({ error: 'Supabase 연결 정보가 없어요.' });
  const base = `${SB_URL}/rest/v1/artworks`;
  const q = new URL(req.url, 'http://x').searchParams;

  if (req.method === 'GET' && q.has('img')) {
    const id = Number(q.get('img'));
    if (!validId(id)) return res.status(400).json({ error: '잘못된 요청이에요.' });
    const r = await fetch(`${base}?select=image&id=eq.${id}`, { headers: sbHeaders() });
    const row = r.ok ? (await r.json())[0] : null;
    if (!row) return res.status(404).json({ error: '그림이 없어요.' });
    res.setHeader('Content-Type', 'image/jpeg');
    return res.status(200).send(Buffer.from(row.image, 'base64'));
  }

  if (req.method === 'GET') {
    const status = STATUSES.includes(q.get('status')) ? q.get('status') : 'pending';
    const [list, all] = await Promise.all([
      fetch(`${base}?select=id,nickname,title,status,created_at&status=eq.${status}&order=created_at.desc,id.desc&limit=200`, { headers: sbHeaders() }),
      fetch(`${base}?select=status&limit=5000`, { headers: sbHeaders() }),
    ]);
    if (!list.ok || !all.ok) return res.status(500).json({ error: '목록을 불러오지 못했어요.' });
    const counts = { pending: 0, approved: 0, hidden: 0 };
    for (const r of await all.json()) counts[r.status] = (counts[r.status] || 0) + 1;
    return res.status(200).json({ items: await list.json(), counts });
  }

  if (req.method === 'PATCH') {
    const b = body(req);
    const id = Number(b.id);
    if (!validId(id) || !STATUSES.includes(b.status)) return res.status(400).json({ error: '잘못된 요청이에요.' });
    const r = await fetch(`${base}?id=eq.${id}`, {
      method: 'PATCH', headers: { ...sbHeaders(), Prefer: 'return=minimal' },
      body: JSON.stringify({ status: b.status, updated_at: new Date().toISOString() }),
    });
    if (!r.ok) return res.status(500).json({ error: '바꾸지 못했어요.' });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const id = Number(q.get('id'));
    if (!validId(id)) return res.status(400).json({ error: '잘못된 요청이에요.' });
    const r = await fetch(`${base}?id=eq.${id}`, { method: 'DELETE', headers: { ...sbHeaders(), Prefer: 'return=minimal' } });
    if (!r.ok) return res.status(500).json({ error: '지우지 못했어요.' });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: '지원하지 않는 요청이에요.' });
};
