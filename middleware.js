// 입장 비밀번호 문지기: 쿠키(ek)가 없거나, 3시간이 지났거나, 비밀번호가 바뀌었으면 /enter(비밀번호 넣는 화면)로 보낸다.
// 비밀번호(숫자 4자리)는 settings 표의 site_password에 있다. 비밀번호를 넣지 않으면 누구도 내용을 볼 수 없다.
// 자료실(/notes, /api/notes)은 한 번 더 막는다. 입장 비밀번호와 다른 notes_password를 넣어야(쿠키 nk) 들어갈 수 있고,
// 아니면 /notes-enter(자료실 비밀번호 넣는 화면)로 보낸다.
// 관리자 화면(/admin)은 막지 않는다. 입장 비밀번호를 잊어도 관리자 비밀번호로 들어가 바꿀 수 있게.
export const config = {
  matcher: ['/((?!enter|api/enter|admin|api/admin|favicon\\.png|apple-touch-icon\\.png|logo\\.png|menus\\.js).*)'],
};

let cache = { at: 0, site: null, notes: null }; // 매번 데이터베이스에 묻지 않게 30초 동안 기억한다

async function passwords() {
  if (cache.site !== null && Date.now() - cache.at < 30000) return cache;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  const r = await fetch(`${url}/rest/v1/settings?select=key,value&key=in.(site_password,notes_password)`, {
    headers: { apikey: key, ...(String(key).startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}) },
  });
  if (!r.ok) throw new Error('read');
  const rows = await r.json();
  const val = (k) => { const v = rows.find((x) => x.key === k)?.value; return typeof v === 'string' ? v : ''; };
  cache = { at: Date.now(), site: val('site_password'), notes: val('notes_password') };
  return cache;
}

// api/_gate.js의 token()과 같은 값 (판 번호 VERSION도 같아야 한다)
const VERSION = 'v3';
async function token(area, pw, exp) {
  const data = new TextEncoder().encode(`${VERSION}|${area}|${exp}|${pw}|${process.env.ADMIN_PASSWORD || ''}`);
  const d = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// 쿠키 name이 '끝나는 시각.섞은 값'이고, 아직 안 끝났고, 지금 비밀번호로 만든 값과 같으면 통과
async function passes(req, name, area, pw) {
  if (!pw) return false;
  const got = (req.headers.get('cookie') || '').match(new RegExp(`(?:^|;\\s*)${name}=(\\d{10})\\.([0-9a-f]{64})`));
  if (!got) return false;
  const exp = Number(got[1]);
  return exp > Date.now() / 1000 && got[2] === await token(area, pw, exp);
}

function block(url, page, message) {
  if (url.pathname.startsWith('/api/')) {
    return new Response(JSON.stringify({ error: message }), {
      status: 401, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });
  }
  const to = new URL(page, url);
  if (url.pathname !== '/') to.searchParams.set('next', url.pathname + url.search);
  return Response.redirect(to, 302);
}

export default async function middleware(req) {
  let pw = { site: '', notes: '' };
  try { pw = await passwords(); } catch {} // 비밀번호를 읽지 못해도 열어 주지 않는다
  const url = new URL(req.url);

  if (!(await passes(req, 'ek', 'site', pw.site))) return block(url, '/enter', '입장 비밀번호가 필요해요.');

  const isNotes = /^\/notes(\/|$)/.test(url.pathname) || url.pathname === '/api/notes';
  if (isNotes && !(await passes(req, 'nk', 'notes', pw.notes))) return block(url, '/notes-enter', '자료실 비밀번호가 필요해요.');
}
