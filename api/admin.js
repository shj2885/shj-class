// 관리자용: 비밀번호(ADMIN_PASSWORD) 확인 뒤 링크를 보고·더하고·고치고·뺀다. 서버 키는 이 함수 안에서만 쓴다.
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
const MENUS = require('../menus.js');
const validId = (id) => Number.isInteger(id) && id > 0;

function cleanUrl(raw) {
  let s = String(raw ?? '').trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (!['http:', 'https:'].includes(u.protocol) || !u.hostname.includes('.')) return null;
    return u.href.slice(0, 500);
  } catch { return null; }
}

// 받은 값 중 허용된 칸만 골라 검사한다. partial이면 빠진 칸은 그대로 둔다.
function pick(b, partial) {
  const row = {};
  if (!partial || 'url' in b) {
    const url = cleanUrl(b.url);
    if (!url) return { error: '주소를 확인해 주세요. 예: https://playentry.org' };
    row.url = url;
  }
  if (!partial || 'name' in b) {
    let name = String(b.name ?? '').trim().slice(0, 60);
    // 새로 넣을 때 이름을 비우면 주소에서 따온다 (예: playentry.org)
    if (!name && !partial && row.url) name = new URL(row.url).hostname.replace(/^www\./, '').slice(0, 60);
    if (!name) return { error: '사이트 이름을 적어 주세요.' };
    row.name = name;
  }
  if (!partial || 'category' in b) {
    const menu = MENUS.find((m) => m.key === b.category);
    if (!menu) return { error: '메뉴를 골라 주세요.' };
    row.category = menu.key;
    // 펼침 메뉴는 고르지 않아도 된다(빈 값 → '그 밖의 사이트')
    const sub = String(b.sub ?? '').trim();
    if (sub && !menu.subs.includes(sub)) return { error: '펼침 메뉴를 다시 골라 주세요.' };
    row.sub = sub || null;
  }
  if ('today' in b) row.today = b.today === true;
  // 선생님용은 학생 화면에 안 나오니 '오늘'로 올리지 않는다
  if (row.category && MENUS.find((m) => m.key === row.category).hidden) row.today = false;
  if ('sort' in b) {
    const sort = Number(b.sort);
    if (!Number.isInteger(sort)) return { error: '잘못된 요청이에요.' };
    row.sort = sort;
  }
  return { row };
}

function body(req) {
  let b;
  try { b = req.body || {}; } catch { b = {}; } // 잘못된 JSON이면 Vercel이 읽는 순간 오류를 낸다
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
  const base = `${SB_URL}/rest/v1/links`;

  if (req.method === 'GET') {
    const r = await fetch(`${base}?select=*&order=sort.asc,id.asc&limit=500`, { headers: sbHeaders() });
    if (!r.ok) return res.status(500).json({ error: '목록을 불러오지 못했어요.' });
    return res.status(200).json({ links: await r.json() });
  }

  if (req.method === 'POST') {
    const { row, error } = pick(body(req), false);
    if (error) return res.status(400).json({ error });
    row.sort = Math.floor(Date.now() / 1000);
    const r = await fetch(base, { method: 'POST', headers: { ...sbHeaders(), Prefer: 'return=representation' }, body: JSON.stringify(row) });
    if (!r.ok) return res.status(500).json({ error: '추가하지 못했어요. 잠시 뒤 다시 해 보세요.' });
    return res.status(200).json({ link: (await r.json())[0] });
  }

  if (req.method === 'PATCH') {
    const b = body(req);
    const id = Number(b.id);
    if (!validId(id)) return res.status(400).json({ error: '잘못된 요청이에요.' });
    const { row, error } = pick(b, true);
    if (error) return res.status(400).json({ error });
    if (!Object.keys(row).length) return res.status(400).json({ error: '바꿀 내용이 없어요.' });
    row.updated_at = new Date().toISOString();
    const r = await fetch(`${base}?id=eq.${id}`, { method: 'PATCH', headers: { ...sbHeaders(), Prefer: 'return=minimal' }, body: JSON.stringify(row) });
    if (!r.ok) return res.status(500).json({ error: '바꾸지 못했어요.' });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const id = Number(new URL(req.url, 'http://x').searchParams.get('id'));
    if (!validId(id)) return res.status(400).json({ error: '잘못된 요청이에요.' });
    const r = await fetch(`${base}?id=eq.${id}`, { method: 'DELETE', headers: { ...sbHeaders(), Prefer: 'return=minimal' } });
    if (!r.ok) return res.status(500).json({ error: '빼지 못했어요.' });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: '지원하지 않는 요청이에요.' });
};
