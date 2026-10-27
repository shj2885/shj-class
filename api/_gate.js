// 입장 비밀번호: 사이트에 들어올 때 넣는 숫자 4자리. settings 표의 site_password 칸에 있다.
// 맞게 넣은 브라우저에는 쿠키(ek)를 준다. 쿠키에는 비밀번호를 그대로 담지 않고 섞은 값을 담는다.
// 이 섞는 방법은 middleware.js에도 똑같이 있다(그쪽은 Edge라서 Web Crypto로 같은 값을 만든다).
const crypto = require('node:crypto');
const SB_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const DAYS = 30; // 한 번 넣으면 이 기간 동안 다시 묻지 않는다

const valid = (pw) => /^\d{4}$/.test(pw);
const token = (pw) => crypto.createHash('sha256').update(`${pw}|${process.env.ADMIN_PASSWORD || ''}`).digest('hex');
const cookie = (pw) => `ek=${token(pw)}; Path=/; Max-Age=${DAYS * 86400}; HttpOnly; Secure; SameSite=Lax`;

async function readSitePassword() {
  const r = await fetch(`${SB_URL}/rest/v1/settings?select=value&key=eq.site_password`, {
    headers: { apikey: SB_KEY, ...(String(SB_KEY).startsWith('eyJ') ? { Authorization: `Bearer ${SB_KEY}` } : {}) },
  });
  if (!r.ok) throw new Error('read');
  const rows = await r.json();
  return typeof rows[0]?.value === 'string' ? rows[0].value : '';
}

module.exports = { valid, token, cookie, readSitePassword };
