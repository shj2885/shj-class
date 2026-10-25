// 첫 화면용: 링크 목록을 읽기만 한다. 서버 키는 여기(서버)에서만 쓰고 브라우저로 보내지 않는다.
const SB_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const sbHeaders = () => ({
  apikey: SB_KEY,
  ...(String(SB_KEY).startsWith('eyJ') ? { Authorization: `Bearer ${SB_KEY}` } : {}),
});

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET만 가능해요' });
  if (!SB_URL || !SB_KEY) return res.status(500).json({ error: 'Supabase 연결 정보가 없어요.' });
  const r = await fetch(`${SB_URL}/rest/v1/links?select=id,name,url,category,today,sort&order=sort.asc,id.asc&limit=500`, { headers: sbHeaders() });
  if (!r.ok) return res.status(500).json({ error: '목록을 불러오지 못했어요.' });
  return res.status(200).json({ links: await r.json() });
};
