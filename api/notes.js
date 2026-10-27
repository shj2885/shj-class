// 자료실 탐색기: 폴더(폴더 안에 폴더도), 강의 자료(notes/catalog.js)의 자리, 선생님이 더한 링크와 올린 파일.
// 모두 settings 표의 notes_tree 칸 하나에 저장한다.
//   { folders: [{ id, name, emoji, parent }], notes: { slug: folderId }, links: [{ id, title, url, folder }],
//     files: [{ id, title, path, size, type, folder }] }   (parent·folder가 null이면 자료실 맨 위)
// 파일 내용은 Supabase Storage의 비공개 버킷(notes-files)에 두고, 볼 때마다 1분짜리 주소를 만들어 보낸다.
// 읽기(GET)는 자료실 비밀번호를 넣은 사람(middleware.js가 확인), 바꾸기(PUT·POST)는 관리자 비밀번호가 맞을 때만.
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
const BUCKET = 'notes-files';
const MAX_FILE = 50 * 1024 * 1024; // Supabase 무료 요금제의 파일 하나 최대 크기
const LIMIT = { folders: 300, links: 1000, files: 1000 };
const validId = (id) => /^[a-z0-9]{8,20}$/.test(String(id ?? ''));
const text = (v, n) => String(v ?? '').trim().slice(0, n);

function body(req) {
  let b;
  try { b = req.body || {}; } catch { b = {}; }
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  return b && typeof b === 'object' ? b : {};
}

function cleanUrl(raw) {
  let s = text(raw, 1000);
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    return ['http:', 'https:'].includes(u.protocol) && u.hostname.includes('.') ? u.href : null;
  } catch { return null; }
}

/* ---------- 저장된 값 읽기·쓰기 ---------- */
async function readSetting(key) {
  const r = await fetch(`${SB_URL}/rest/v1/settings?select=value&key=eq.${key}`, { headers: sbHeaders() });
  if (!r.ok) throw new Error('read');
  return (await r.json())[0]?.value;
}
async function writeTree(tree) {
  const r = await fetch(`${SB_URL}/rest/v1/settings?on_conflict=key`, {
    method: 'POST',
    headers: { ...sbHeaders(), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ key: 'notes_tree', value: tree, updated_at: new Date().toISOString() }),
  });
  if (!r.ok) throw new Error('write');
}
async function readTree() {
  const v = await readSetting('notes_tree');
  if (v && typeof v === 'object') return clean(v, v.files) || empty();
  // 예전 방식(notes_folders: 한 층짜리 폴더)에서 옮겨 온다
  const old = await readSetting('notes_folders');
  const tree = empty();
  if (Array.isArray(old)) {
    for (const f of old) {
      if (!f || !validId(f.id)) continue;
      tree.folders.push({ id: f.id, name: text(f.name, 30) || '폴더', emoji: text(f.emoji, 8) || '📁', parent: null });
      (f.notes || []).forEach((s) => { if (SLUGS.includes(s)) tree.notes[s] = f.id; });
    }
  }
  return tree;
}
const empty = () => ({ folders: [], notes: {}, links: [], files: [] });

// 받은 나무를 검사하고 다듬는다. 파일은 서버에 이미 있는 것(known)만 남기고, 저장 위치(path)는 서버 것을 쓴다.
function clean(t, known) {
  if (!t || typeof t !== 'object') return null;
  const folders = Array.isArray(t.folders) ? t.folders : [];
  const links = Array.isArray(t.links) ? t.links : [];
  const files = Array.isArray(t.files) ? t.files : [];
  if (folders.length > LIMIT.folders || links.length > LIMIT.links || files.length > LIMIT.files) return null;

  const out = empty();
  const ids = new Set();
  for (const f of folders) {
    if (!f || !validId(f.id) || ids.has(f.id)) return null;
    const name = text(f.name, 30);
    if (!name) return null;
    ids.add(f.id);
    out.folders.push({ id: f.id, name, emoji: text(f.emoji, 8) || '📁', parent: f.parent ?? null });
  }
  // 없는 폴더를 가리키거나, 자기 자신 아래로 들어가는(빙빙 도는) 폴더는 맨 위로 올린다
  const byId = new Map(out.folders.map((f) => [f.id, f]));
  for (const f of out.folders) {
    if (f.parent !== null && !byId.has(f.parent)) f.parent = null;
    const seen = new Set([f.id]);
    for (let p = f.parent; p !== null; p = byId.get(p).parent) {
      if (seen.has(p)) { f.parent = null; break; }
      seen.add(p);
    }
  }
  const folderOk = (id) => (id && byId.has(id) ? id : null);

  if (t.notes && typeof t.notes === 'object') {
    for (const [slug, id] of Object.entries(t.notes)) if (SLUGS.includes(slug) && folderOk(id)) out.notes[slug] = id;
  }
  for (const l of links) {
    const url = cleanUrl(l?.url);
    if (!l || !validId(l.id) || ids.has(l.id) || !url) return null;
    ids.add(l.id);
    out.links.push({ id: l.id, title: text(l.title, 80) || new URL(url).hostname, url, folder: folderOk(l.folder) });
  }
  const knownById = new Map((Array.isArray(known) ? known : []).map((f) => [f?.id, f]));
  for (const f of files) {
    const k = knownById.get(f?.id);
    if (!k || ids.has(f.id)) continue;
    ids.add(f.id);
    out.files.push({ id: k.id, title: text(f.title, 120) || k.title, path: k.path, size: k.size, type: k.type, folder: folderOk(f.folder) });
  }
  return out;
}

// 학생에게 보낼 때는 파일 저장 위치(path)를 빼고 보낸다
const publicTree = (t) => ({ ...t, files: t.files.map(({ path, ...f }) => f) });

/* ---------- 파일 저장소 ---------- */
const storage = (p) => `${SB_URL}/storage/v1${p}`;
const encPath = (p) => p.split('/').map(encodeURIComponent).join('/');

async function ensureBucket() {
  const r = await fetch(storage(`/bucket/${BUCKET}`), { headers: sbHeaders() });
  if (r.ok) return;
  const c = await fetch(storage('/bucket'), {
    method: 'POST', headers: sbHeaders(),
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false, file_size_limit: MAX_FILE }),
  });
  if (!c.ok && c.status !== 409) throw new Error('bucket');
}

// 파일 이름에서 저장소가 싫어하는 글자를 뺀다(보여 주는 이름은 따로 title에 둔다)
function safeName(name) {
  const dot = name.lastIndexOf('.');
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) : '';
  return `file${ext ? `.${ext}` : ''}`;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!SB_URL || !SB_KEY) return res.status(500).json({ error: 'Supabase 연결 정보가 없어요.' });
  const q = new URL(req.url, 'http://x').searchParams;

  if (req.method === 'GET') {
    let tree;
    try { tree = await readTree(); } catch { return res.status(500).json({ error: '자료실을 불러오지 못했어요.' }); }

    // 파일 열기: /api/notes?file=○○ → 1분 동안만 열리는 주소로 보낸다
    if (q.has('file')) {
      const f = tree.files.find((x) => x.id === q.get('file'));
      if (!f) return res.status(404).json({ error: '파일이 없어요.' });
      const r = await fetch(storage(`/object/sign/${BUCKET}/${encPath(f.path)}`), {
        method: 'POST', headers: sbHeaders(), body: JSON.stringify({ expiresIn: 60 }),
      });
      const data = r.ok ? await r.json() : null;
      if (!data?.signedURL) return res.status(500).json({ error: '파일을 열지 못했어요.' });
      const dl = q.get('download') === '1' ? `&download=${encodeURIComponent(f.title)}` : '';
      res.statusCode = 302;
      res.setHeader('Location', storage(data.signedURL) + dl);
      return res.end();
    }
    return res.status(200).json(publicTree(tree));
  }

  // 여기부터는 선생님만
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass) return res.status(500).json({ error: 'Vercel 환경변수에 ADMIN_PASSWORD를 넣고 다시 배포해 주세요.' });
  if (!same(req.headers['x-admin-password'] || '', pass)) return res.status(401).json({ error: '비밀번호가 맞지 않아요.' });
  const b = body(req);

  // 나무 통째로 저장(폴더 만들기·옮기기·이름 바꾸기·지우기, 링크 더하기 등). 빠진 파일은 저장소에서도 지운다.
  if (req.method === 'PUT') {
    let old;
    try { old = await readTree(); } catch { return res.status(500).json({ error: '자료실을 불러오지 못했어요.' }); }
    const tree = clean(b.tree, old.files);
    if (!tree) return res.status(400).json({ error: '자료실 정보가 올바르지 않아요.' });
    try { await writeTree(tree); } catch { return res.status(500).json({ error: '저장하지 못했어요. 잠시 뒤 다시 해 보세요.' }); }
    const gone = old.files.filter((f) => !tree.files.some((x) => x.id === f.id)).map((f) => f.path);
    if (gone.length) {
      await fetch(storage(`/object/${BUCKET}`), { method: 'DELETE', headers: sbHeaders(), body: JSON.stringify({ prefixes: gone }) }).catch(() => {});
    }
    return res.status(200).json({ ok: true, tree: publicTree(tree) });
  }

  if (req.method === 'POST') {
    // 1단계: 올릴 자리 받기 { action: 'sign', name, size } → 브라우저가 그 주소로 파일을 바로 올린다
    if (b.action === 'sign') {
      const name = text(b.name, 120);
      const size = Number(b.size);
      if (!name) return res.status(400).json({ error: '파일 이름이 없어요.' });
      if (!(size > 0) || size > MAX_FILE) return res.status(400).json({ error: '파일은 50MB까지 올릴 수 있어요.' });
      try { await ensureBucket(); } catch { return res.status(500).json({ error: '파일 저장소를 준비하지 못했어요.' }); }
      const id = crypto.randomBytes(8).toString('hex').slice(0, 12);
      const path = `${id}/${safeName(name)}`;
      const r = await fetch(storage(`/object/upload/sign/${BUCKET}/${encPath(path)}`), { method: 'POST', headers: sbHeaders(), body: '{}' });
      const data = r.ok ? await r.json() : null;
      if (!data?.url) return res.status(500).json({ error: '올릴 준비를 하지 못했어요.' });
      return res.status(200).json({ id, path, uploadUrl: storage(data.url) });
    }

    // 2단계: 다 올렸으면 자료실에 더하기 { action: 'add-file', id, path, title, size, type, folder }
    if (b.action === 'add-file') {
      if (!validId(b.id) || typeof b.path !== 'string' || !b.path.startsWith(`${b.id}/`)) return res.status(400).json({ error: '잘못된 요청이에요.' });
      const info = await fetch(storage(`/object/info/${BUCKET}/${encPath(b.path)}`), { headers: sbHeaders() }).catch(() => null);
      if (!info || !info.ok) return res.status(400).json({ error: '파일이 다 올라가지 않았어요. 다시 올려 주세요.' });
      let tree;
      try { tree = await readTree(); } catch { return res.status(500).json({ error: '자료실을 불러오지 못했어요.' }); }
      if (tree.files.length >= LIMIT.files) return res.status(400).json({ error: '파일이 너무 많아요.' });
      const file = {
        id: b.id, path: b.path, title: text(b.title, 120) || '파일',
        size: Math.max(0, Number(b.size) || 0), type: text(b.type, 100),
        folder: tree.folders.some((f) => f.id === b.folder) ? b.folder : null,
      };
      tree.files.push(file);
      try { await writeTree(tree); } catch { return res.status(500).json({ error: '저장하지 못했어요.' }); }
      return res.status(200).json({ ok: true, tree: publicTree(tree) });
    }
    return res.status(400).json({ error: '잘못된 요청이에요.' });
  }

  return res.status(405).json({ error: '지원하지 않는 요청이에요.' });
};
