// 입장 화면(/enter)에서 넣은 비밀번호를 확인하고, 맞으면 쿠키를 준다.
const crypto = require('node:crypto');
const { cookie, readSitePassword } = require('./_gate.js');

const same = (a, b) => {
  const h = (s) => crypto.createHash('sha256').update(String(s)).digest();
  return crypto.timingSafeEqual(h(a), h(b));
};

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 가능해요' });
  let b;
  try { b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}; } catch { b = {}; }
  const typed = String(b.password ?? '').trim();
  let pw;
  try { pw = await readSitePassword(); } catch { return res.status(500).json({ error: '확인하지 못했어요. 잠시 뒤 다시 해 보세요.' }); }
  if (pw && !same(typed, pw)) {
    await new Promise((r) => setTimeout(r, 600)); // 마구 넣어 보기 어렵게 조금 늦춘다
    return res.status(401).json({ error: '비밀번호가 맞지 않아요.' });
  }
  res.setHeader('Set-Cookie', cookie(pw));
  return res.status(200).json({ ok: true });
};
