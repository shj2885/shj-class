// 입장 비밀번호 문지기: 쿠키(ek)가 없거나 비밀번호가 바뀌었으면 /enter(비밀번호 넣는 화면)로 보낸다.
// 비밀번호(숫자 4자리)는 settings 표의 site_password에 있다. 비밀번호를 넣지 않으면 누구도 내용을 볼 수 없다.
// 관리자 화면(/admin)은 막지 않는다. 입장 비밀번호를 잊어도 관리자 비밀번호로 들어가 바꿀 수 있게.
export const config = {
  matcher: ['/((?!enter|api/enter|admin|api/admin|favicon\\.png|apple-touch-icon\\.png|logo\\.png|menus\\.js).*)'],
};

let cache = { at: 0, pw: null }; // 매번 데이터베이스에 묻지 않게 30초 동안 기억한다

async function sitePassword() {
  if (cache.pw !== null && Date.now() - cache.at < 30000) return cache.pw;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  const r = await fetch(`${url}/rest/v1/settings?select=value&key=eq.site_password`, {
    headers: { apikey: key, ...(String(key).startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}) },
  });
  if (!r.ok) throw new Error('read');
  const rows = await r.json();
  cache = { at: Date.now(), pw: typeof rows[0]?.value === 'string' ? rows[0].value : '' };
  return cache.pw;
}

// api/_gate.js의 token()과 같은 값 (판 번호 VERSION도 같아야 한다)
const VERSION = 'v2';
async function token(pw) {
  const data = new TextEncoder().encode(`${VERSION}|${pw}|${process.env.ADMIN_PASSWORD || ''}`);
  const d = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default async function middleware(req) {
  let pw = '';
  try { pw = await sitePassword(); } catch {} // 비밀번호를 읽지 못해도 열어 주지 않는다
  const got = (req.headers.get('cookie') || '').match(/(?:^|;\s*)ek=([0-9a-f]{64})/)?.[1];
  if (pw && got && got === await token(pw)) return;

  const url = new URL(req.url);
  if (url.pathname.startsWith('/api/')) {
    return new Response(JSON.stringify({ error: '입장 비밀번호가 필요해요.' }), {
      status: 401, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });
  }
  const to = new URL('/enter', url);
  if (url.pathname !== '/') to.searchParams.set('next', url.pathname + url.search);
  return Response.redirect(to, 302);
}
