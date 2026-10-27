// 입장 비밀번호: 사이트에 들어올 때 넣는 숫자 4자리. settings 표의 site_password 칸에 있다.
// 자료실(/notes)은 그것과 다른 숫자 4자리(notes_password)를 한 번 더 넣는다.
// 맞게 넣은 브라우저에는 쿠키를 준다(사이트는 ek, 자료실은 nk). 쿠키에는 비밀번호를 그대로 담지 않고 섞은 값을 담는다.
// 통과는 3시간만 유효하다. 브라우저가 탭을 복원하며 쿠키를 되살려도, 3시간이 지나면 서버가 다시 비밀번호를 묻는다.
// 쿠키 값은 '끝나는 시각(초).섞은 값'이고, 섞은 값에 끝나는 시각도 넣어서 시각만 고쳐서는 통과할 수 없다.
// 이 섞는 방법은 middleware.js에도 똑같이 있다(그쪽은 Edge라서 Web Crypto로 같은 값을 만든다).
const crypto = require('node:crypto');
const SB_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
// 섞을 때 붙이는 판 번호. 바꾸면 그동안 나눠 준 쿠키가 모두 무효가 된다(middleware.js도 같이 바꾼다).
const VERSION = 'v3';
const PASS_SECONDS = 3 * 60 * 60; // 통과 유지 시간 (middleware.js는 쿠키에 적힌 끝나는 시각으로 확인한다)

const valid = (pw) => /^\d{4}$/.test(pw);
// 어느 문(AREAS)의 비밀번호인지도 섞어서, 입장 쿠키로 자료실을 통과할 수는 없다
const AREAS = {
  site: { key: 'site_password', cookie: 'ek' },
  notes: { key: 'notes_password', cookie: 'nk' },
};
const token = (area, pw, exp) => crypto.createHash('sha256').update(`${VERSION}|${area}|${exp}|${pw}|${process.env.ADMIN_PASSWORD || ''}`).digest('hex');
const cookie = (area, pw) => {
  const exp = Math.floor(Date.now() / 1000) + PASS_SECONDS;
  return `${AREAS[area].cookie}=${exp}.${token(area, pw, exp)}; Path=/; Max-Age=${PASS_SECONDS}; HttpOnly; Secure; SameSite=Lax`;
};

async function readPassword(area) {
  const r = await fetch(`${SB_URL}/rest/v1/settings?select=value&key=eq.${AREAS[area].key}`, {
    headers: { apikey: SB_KEY, ...(String(SB_KEY).startsWith('eyJ') ? { Authorization: `Bearer ${SB_KEY}` } : {}) },
  });
  if (!r.ok) throw new Error('read');
  const rows = await r.json();
  return typeof rows[0]?.value === 'string' ? rows[0].value : '';
}

module.exports = { AREAS, valid, token, cookie, readPassword };
