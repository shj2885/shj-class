// 자료실 폴더: 선생님이 만든 폴더 이름과, 폴더마다 어떤 자료(notes/catalog.js의 slug)가 들어 있는지.
// settings 표의 notes_folders 칸에 [{ id, name, emoji, notes: [slug, ...] }, ...] 모양으로 저장한다.
// 읽기(GET)는 입장한 사람 누구나, 저장(PUT)은 관리자 비밀번호가 맞을 때만.
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
const NOTES = require('../notes/catalog.js');
const SLUGS = NOTES.map((n) => n.slug);
const MAX_FOLDERS = 50;

function body(req) {
  let b;
  try { b = req.body || {}; } catch { b = {}; }
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  return b && typeof b === 'object' ? b : {};
}

// 받은 폴더 목록을 검사하고 다듬는다. 한 자료는 한 폴더에만 들어간다(먼저 나온 폴더 우선).
function clean(list) {
  if (!Array.isArray(list) || list.length > MAX_FOLDERS) return null;
  const used = new Set();
  const ids = new Set();
  const out = [];
  for (const f of list) {
    if (!f || typeof f !== 'object') return null;
    const id = String(f.id ?? '');
    const name = String(f.name ?? '').trim().slice(0, 30);
    if (!/^[a-z0-9]{4,20}$/.test(id) || ids.has(id) || !name) return null;
    ids.add(id);
    const emoji = String(f.emoji ?? '').trim().slice(0, 8) || '📁';
    const notes = (Array.isArray(f.notes) ? f.notes : [])
      .map(String).filter((s) => SLUGS.includes(s) && !used.has(s));
    notes.forEach((s) => used.add(s));
    out.push({ id, name, emoji, notes });
  }
  return out;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!SB_URL || !SB_KEY) return res.status(500).json({ error: 'Supabase 연결 정보가 없어요.' });
  const url = `${SB_URL}/rest/v1/settings`;

  if (req.method === 'GET') {
    const r = await fetch(`${url}?select=value&key=eq.notes_folders`, { headers: sbHeaders() }).catch(() => null);
    if (!r || !r.ok) return res.status(500).json({ error: '폴더를 불러오지 못했어요.' });
    const rows = await r.json();
    return res.status(200).json({ folders: clean(rows[0]?.value) || [] });
  }

  if (req.method === 'PUT') {
    const pass = process.env.ADMIN_PASSWORD;
    if (!pass) return res.status(500).json({ error: 'Vercel 환경변수에 ADMIN_PASSWORD를 넣고 다시 배포해 주세요.' });
    if (!same(req.headers['x-admin-password'] || '', pass)) return res.status(401).json({ error: '비밀번호가 맞지 않아요.' });
    const folders = clean(body(req).folders);
    if (!folders) return res.status(400).json({ error: '폴더 정보가 올바르지 않아요.' });
    const r = await fetch(`${url}?on_conflict=key`, {
      method: 'POST',
      headers: { ...sbHeaders(), Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ key: 'notes_folders', value: folders, updated_at: new Date().toISOString() }),
    });
    if (!r.ok) return res.status(500).json({ error: '폴더를 저장하지 못했어요.' });
    return res.status(200).json({ ok: true, folders });
  }

  return res.status(405).json({ error: '지원하지 않는 요청이에요.' });
};
