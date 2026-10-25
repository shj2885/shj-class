// 친구들 작품 전시판(누구나): 학생이 올린 그림은 바로 전시된다. 선생님은 /api/gallery-admin으로 숨기거나 지울 수 있다.
// 서버 키는 여기(서버)에서만 쓰고 브라우저로 보내지 않는다.
const crypto = require('node:crypto');
const SB_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const sbHeaders = () => ({
  apikey: SB_KEY,
  ...(String(SB_KEY).startsWith('eyJ') ? { Authorization: `Bearer ${SB_KEY}` } : {}),
  'Content-Type': 'application/json',
});
const validId = (id) => Number.isInteger(id) && id > 0;

const PAGE = 24;
const MAX_B64 = 700000;          // 그림 한 장 최대 약 500KB
const PER_IP = 40;               // 한 곳(교실 하나)에서 10분에 올릴 수 있는 그림 수
const PER_HOUR = 300;            // 사이트 전체에서 1시간에 올라올 수 있는 그림 수 (장난 막기)

function body(req) {
  let b;
  try { b = req.body || {}; } catch { b = {}; } // 잘못된 JSON이면 Vercel이 읽는 순간 오류를 낸다
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  return b && typeof b === 'object' ? b : {};
}
// 별명·제목: 줄바꿈·꺾쇠 같은 것은 빼고 짧게
const cleanText = (s, max) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
const tokenHash = (t) => crypto.createHash('sha256').update(t).digest('hex');
const same = (a, b) => {
  const h = (s) => crypto.createHash('sha256').update(String(s)).digest();
  return crypto.timingSafeEqual(h(a), h(b));
};
// 진짜 IP는 저장하지 않고, 서버 키로 섞은 값만 남긴다
function ipHash(req) {
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || '';
  return crypto.createHmac('sha256', String(SB_KEY)).update(ip).digest('hex').slice(0, 32);
}

module.exports = async (req, res) => {
  if (!SB_URL || !SB_KEY) return res.status(500).json({ error: 'Supabase 연결 정보가 없어요.' });
  const base = `${SB_URL}/rest/v1/artworks`;
  const q = new URL(req.url, 'http://x').searchParams;

  if (req.method === 'GET' && q.has('img')) {
    // 그림 한 장: 승인된 그림만 내보낸다
    const id = Number(q.get('img'));
    if (!validId(id)) return res.status(400).json({ error: '잘못된 요청이에요.' });
    const r = await fetch(`${base}?select=image&id=eq.${id}&status=eq.approved`, { headers: sbHeaders() });
    const row = r.ok ? (await r.json())[0] : null;
    if (!row) return res.status(404).json({ error: '그림이 없어요.' });
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).send(Buffer.from(row.image, 'base64'));
  }

  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    const offset = Math.max(0, Math.min(10000, Number(q.get('offset')) || 0));
    const r = await fetch(`${base}?select=id,nickname,title,created_at&status=eq.approved&order=created_at.desc,id.desc&limit=${PAGE + 1}&offset=${offset}`, { headers: sbHeaders() });
    if (!r.ok) return res.status(500).json({ error: '전시판을 불러오지 못했어요.' });
    const rows = await r.json();
    return res.status(200).json({ items: rows.slice(0, PAGE), more: rows.length > PAGE });
  }

  if (req.method === 'POST') {
    const b = body(req);
    const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(b.image || ''));
    if (!m) return res.status(400).json({ error: '그림을 다시 올려 주세요.' });
    if (m[1].length > MAX_B64) return res.status(413).json({ error: '그림이 너무 커요.' });
    const bytes = Buffer.from(m[1], 'base64');
    if (bytes.length < 200 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return res.status(400).json({ error: '그림을 다시 올려 주세요.' });

    const ip_hash = ipHash(req);
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const [mine, recent] = await Promise.all([
      fetch(`${base}?select=id&ip_hash=eq.${ip_hash}&created_at=gte.${since}&limit=${PER_IP}`, { headers: sbHeaders() }),
      fetch(`${base}?select=id&created_at=gte.${hourAgo}&limit=${PER_HOUR}`, { headers: sbHeaders() }),
    ]);
    if (!mine.ok || !recent.ok) return res.status(500).json({ error: '올리지 못했어요. 잠시 뒤 다시 해 보세요.' });
    if ((await mine.json()).length >= PER_IP) return res.status(429).json({ error: '그림이 너무 많이 올라왔어요. 10분 뒤에 다시 올려 주세요.' });
    if ((await recent.json()).length >= PER_HOUR) return res.status(429).json({ error: '그림이 너무 많이 올라왔어요. 조금 뒤에 다시 올려 주세요.' });

    // 올린 사람만 지울 수 있게: 열쇠(token)는 올린 브라우저에만 주고, 서버에는 섞은 값만 둔다
    const token = crypto.randomBytes(24).toString('hex');
    const row = {
      nickname: cleanText(b.nickname, 12) || null,
      title: cleanText(b.title, 20) || null,
      image: m[1],
      status: 'approved',
      ip_hash,
      owner_hash: tokenHash(token),
    };
    const r = await fetch(`${base}?select=id`, { method: 'POST', headers: { ...sbHeaders(), Prefer: 'return=representation' }, body: JSON.stringify(row) });
    if (!r.ok) return res.status(500).json({ error: '올리지 못했어요. 잠시 뒤 다시 해 보세요.' });
    const [made] = await r.json();
    return res.status(200).json({ ok: true, id: made.id, token });
  }

  if (req.method === 'DELETE') {
    // 학생이 자기 그림 지우기: 그림을 올린 브라우저에만 있는 열쇠가 맞아야 한다
    const id = Number(q.get('id'));
    const token = String(req.headers['x-owner-token'] || '');
    if (!validId(id) || !/^[0-9a-f]{48}$/.test(token)) return res.status(400).json({ error: '잘못된 요청이에요.' });
    const r = await fetch(`${base}?select=owner_hash&id=eq.${id}`, { headers: sbHeaders() });
    const row = r.ok ? (await r.json())[0] : null;
    if (!row) return res.status(404).json({ error: '이미 지워진 그림이에요.' });
    if (!row.owner_hash || !same(row.owner_hash, tokenHash(token))) return res.status(403).json({ error: '내가 올린 그림만 지울 수 있어요.' });
    const d = await fetch(`${base}?id=eq.${id}`, { method: 'DELETE', headers: { ...sbHeaders(), Prefer: 'return=minimal' } });
    if (!d.ok) return res.status(500).json({ error: '지우지 못했어요. 잠시 뒤 다시 해 보세요.' });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: '지원하지 않는 요청이에요.' });
};
