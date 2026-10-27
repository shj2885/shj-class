// 자료실 탐색기: /api/notes 에서 폴더 나무를 받아, 지금 폴더(주소 끝 #f=○○)의 하위 폴더와 자료를 그린다.
// 자료는 세 가지 — 강의 자료(notes/catalog.js), 선생님이 더한 링크, 선생님이 올린 파일.
// 선생님 모드에서는 폴더 만들기·이름 바꾸기·옮기기·지우기, 카드 끌어 놓기, 링크 더하기, 파일 올리기를 한다.
// 바꿀 때마다 나무를 통째로 저장한다(PUT /api/notes). 파일은 저장소에 바로 올린 뒤 나무에 더한다.
const NOTES = window.NOTES;
const PW_KEY = 'admin-pw'; // 첫 화면 선생님 모드와 같은 칸이라, 거기서 켜 두었으면 여기서도 켜져 있다
const EMOJIS = ['📁', '💻', '🎬', '📺', '🤖', '🎨', '🧩', '✨', '📚', '📝', '🎵', '⭐'];
let tree = { folders: [], notes: {}, links: [], files: [] };
let TEACHER = false;

function getPw() { try { return sessionStorage.getItem(PW_KEY) || ''; } catch { return ''; } }
function setPw(v) { try { v ? sessionStorage.setItem(PW_KEY, v) : sessionStorage.removeItem(PW_KEY); } catch {} }
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(16).padStart(2, '0')).join('');
const copyTree = () => JSON.parse(JSON.stringify(tree));

let toastTimer;
function toast(text, stay) {
  const t = $('toast');
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(toastTimer);
  if (!stay) toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ---------- 나무 살펴보기 ---------- */
const current = () => {
  const id = new URLSearchParams(location.hash.slice(1)).get('f');
  return tree.folders.some((f) => f.id === id) ? id : null;
};
const folderById = (id) => tree.folders.find((f) => f.id === id);
const childrenOf = (id) => tree.folders.filter((f) => f.parent === id);
// 자료실 맨 위부터 그 폴더까지의 길
function pathTo(id) {
  const out = [];
  for (let f = folderById(id); f; f = folderById(f.parent)) out.unshift(f);
  return out;
}
// 그 폴더와 그 아래 모든 폴더의 id
function descendants(id) {
  const out = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const f of tree.folders) if (f.parent && out.has(f.parent) && !out.has(f.id)) { out.add(f.id); grew = true; }
  }
  return out;
}
// 폴더 안 자료 개수(하위 폴더 안까지)
function countIn(id) {
  const all = descendants(id);
  return Object.values(tree.notes).filter((x) => all.has(x)).length
    + tree.links.filter((l) => all.has(l.folder)).length
    + tree.files.filter((f) => all.has(f.folder)).length
    + all.size - 1;
}
function itemsIn(id) {
  return [
    ...NOTES.filter((n) => (tree.notes[n.slug] || null) === id).map((n) => ({ kind: 'note', id: n.slug, n })),
    ...tree.links.filter((l) => l.folder === id).map((l) => ({ kind: 'link', id: l.id, l })),
    ...tree.files.filter((f) => f.folder === id).map((f) => ({ kind: 'file', id: f.id, f })),
  ];
}

/* ---------- 그리기 ---------- */
function fileIcon(f) {
  const t = `${f.type} ${f.title}`.toLowerCase();
  if (/pdf/.test(t)) return '📕';
  if (/image|\.(png|jpe?g|gif|webp|svg)$/.test(t)) return '🖼️';
  if (/video|\.(mp4|mov|webm)$/.test(t)) return '🎞️';
  if (/audio|\.(mp3|wav|m4a)$/.test(t)) return '🎵';
  if (/sheet|excel|\.(xlsx?|csv)$/.test(t)) return '📊';
  if (/presentation|powerpoint|\.(pptx?|key)$/.test(t)) return '📽️';
  if (/zip|\.(zip|7z)$/.test(t)) return '🗜️';
  if (/hwp|word|\.(docx?|hwpx?|txt)$/.test(t)) return '📝';
  return '📄';
}
const size = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)}MB` : `${Math.max(1, Math.round(n / 1024))}KB`);
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };

function itemCard(it) {
  let href; let emo; let tag = ''; let title; let sub; let tools;
  let attrs = TEACHER ? ' draggable="false"' : ''; // 선생님 모드에서는 링크 대신 카드 전체를 끈다
  if (it.kind === 'note') {
    ({ emoji: emo, title, sub } = it.n);
    href = `/notes/${it.n.slug}`;
    tag = `<span class="no">${esc(it.n.tag)}</span>`;
    tools = `<button type="button" class="tool" data-act="move">📁 옮기기</button>`;
  } else if (it.kind === 'link') {
    emo = '🔗'; title = it.l.title; sub = host(it.l.url);
    href = esc(it.l.url);
    attrs += ' target="_blank" rel="noopener"';
    tag = '<span class="no kind">링크</span>';
    tools = `<button type="button" class="tool" data-act="edit-link">✏️ 고치기</button><button type="button" class="tool" data-act="move">📁 옮기기</button><button type="button" class="tool danger" data-act="delete">🗑 지우기</button>`;
  } else {
    emo = fileIcon(it.f); title = it.f.title; sub = `${size(it.f.size)} · 누르면 열려요`;
    href = `/api/notes?file=${it.f.id}`;
    attrs += ' target="_blank" rel="noopener"';
    tag = '<span class="no kind">파일</span>';
    tools = `<a class="tool" href="/api/notes?file=${it.f.id}&download=1">⬇ 내려받기</a><button type="button" class="tool" data-act="rename">✏️ 이름</button><button type="button" class="tool" data-act="move">📁 옮기기</button><button type="button" class="tool danger" data-act="delete">🗑 지우기</button>`;
  }
  return `<li class="item" data-kind="${it.kind}" data-id="${esc(it.id)}"${TEACHER ? ' draggable="true"' : ''}>
    <a href="${href}"${attrs}>
      <span class="emo" aria-hidden="true">${emo}</span>
      <span>${tag}<b>${esc(title)}</b><small>${esc(sub)}</small></span>
      <span class="go" aria-hidden="true">→</span>
    </a>
    <span class="item-tools teacher-only">${tools}</span>
  </li>`;
}

function render() {
  const cur = current();
  const path = pathTo(cur);
  const here = folderById(cur);

  $('crumb').innerHTML = [`<a href="#" data-drop="">📚 자료실</a>`]
    .concat(path.map((f, i) => (i === path.length - 1
      ? `<b>${esc(f.emoji)} ${esc(f.name)}</b>`
      : `<a href="#f=${f.id}" data-drop="${f.id}">${esc(f.emoji)} ${esc(f.name)}</a>`)))
    .join(' <span aria-hidden="true">›</span> ');
  $('crumb').hidden = !here;
  $('title').innerHTML = here ? `${esc(here.emoji)} <span class="hl">${esc(here.name)}</span>` : '<span class="hl">자료실</span>';
  $('intro').hidden = !!here;
  $('folder-tools').classList.toggle('on', !!here);
  $('drop-where').textContent = here ? here.name : '자료실';
  document.title = here ? `${here.name} · 자료실` : '자료실 · 에듀깨비';

  const subs = childrenOf(cur);
  $('folders').innerHTML = subs.map((f) => `
    <a class="folder" href="#f=${f.id}" data-drop="${f.id}" data-folder="${f.id}"${TEACHER ? ' draggable="true"' : ''}>
      <span class="f-emo" aria-hidden="true">${esc(f.emoji)}</span>
      <b>${esc(f.name)}</b>
      <small>${countIn(f.id) ? `${countIn(f.id)}개` : '비어 있음'}</small>
    </a>`).join('');

  const items = itemsIn(cur);
  $('items').innerHTML = items.map(itemCard).join('');
  $('empty').hidden = !!(subs.length || items.length);
  $('empty').textContent = TEACHER ? '이 폴더는 비어 있어요. 위의 버튼으로 폴더·링크·파일을 더하거나, 다른 폴더의 카드를 위쪽 경로로 끌어 오세요.' : '이 폴더는 비어 있어요.';
}

/* ---------- 불러오기·저장 ---------- */
async function load() {
  try {
    const r = await fetch('/api/notes', { cache: 'no-store' });
    if (r.status === 401) { location.href = `/notes-enter?next=${encodeURIComponent(location.pathname + location.hash)}`; return; }
    if (!r.ok) throw new Error();
    tree = await r.json();
  } catch {
    $('load-error').hidden = false;
  }
  render();
}

async function adminFetch(method, data) {
  const r = await fetch('/api/notes', {
    method,
    headers: { 'x-admin-password': getPw(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const out = await r.json().catch(() => ({}));
  if (r.status === 401) { teacherOff(); throw new Error('비밀번호가 바뀌었어요. 다시 들어가 주세요.'); }
  if (!r.ok) throw new Error(out.error || '저장하지 못했어요. 잠시 뒤 다시 해 보세요.');
  return out;
}

// 바꾼 나무를 저장한다. 화면은 먼저 바꾸고, 실패하면 되돌린다.
async function save(next, done) {
  const before = tree;
  tree = next;
  render();
  try {
    tree = (await adminFetch('PUT', { tree: next })).tree;
    render();
    if (done) toast(done);
  } catch (e) {
    tree = before;
    render();
    toast(e.message);
  }
}

/* ---------- 옮기기 ---------- */
// what: { kind: 'folder'|'note'|'link'|'file', id }, to: 폴더 id 또는 null(맨 위)
function moved(what, to) {
  const t = copyTree();
  if (what.kind === 'folder') {
    if (to && descendants(what.id).has(to)) return null; // 자기 안으로는 못 들어간다
    t.folders.find((f) => f.id === what.id).parent = to;
  } else if (what.kind === 'note') {
    if (to) t.notes[what.id] = to; else delete t.notes[what.id];
  } else {
    t[what.kind === 'link' ? 'links' : 'files'].find((x) => x.id === what.id).folder = to;
  }
  return t;
}
function nameOf(what) {
  if (what.kind === 'folder') return folderById(what.id)?.name;
  if (what.kind === 'note') return NOTES.find((n) => n.slug === what.id)?.title;
  return tree[what.kind === 'link' ? 'links' : 'files'].find((x) => x.id === what.id)?.title;
}
function moveTo(what, to) {
  const cur = what.kind === 'folder' ? folderById(what.id)?.parent
    : what.kind === 'note' ? (tree.notes[what.id] || null)
      : tree[what.kind === 'link' ? 'links' : 'files'].find((x) => x.id === what.id)?.folder;
  if ((cur ?? null) === (to ?? null)) return;
  const next = moved(what, to);
  if (!next) { toast('폴더를 자기 안으로는 옮길 수 없어요'); return; }
  save(next, `'${nameOf(what)}'을(를) ${to ? `'${folderById(to).name}'` : '자료실 맨 위'}(으)로 옮겼어요`);
}
// 폴더 순서 바꾸기: dragged를 target 앞(before) 또는 뒤로, target과 같은 층에 놓는다
function reorder(draggedId, targetId, before) {
  if (draggedId === targetId || descendants(draggedId).has(targetId)) return;
  const t = copyTree();
  const d = t.folders.find((f) => f.id === draggedId);
  const target = t.folders.find((f) => f.id === targetId);
  t.folders = t.folders.filter((f) => f.id !== draggedId);
  d.parent = target.parent;
  t.folders.splice(t.folders.indexOf(target) + (before ? 0 : 1), 0, d);
  save(t, '폴더 순서를 바꿨어요');
}

let moving = null;
function openMove(what) {
  moving = what;
  const banned = what.kind === 'folder' ? descendants(what.id) : new Set();
  const opts = ['<option value="">📚 자료실 맨 위</option>'];
  (function walk(parent, depth) {
    for (const f of childrenOf(parent)) {
      if (banned.has(f.id)) continue;
      opts.push(`<option value="${f.id}">${'　'.repeat(depth)}${esc(f.emoji)} ${esc(f.name)}</option>`);
      walk(f.id, depth + 1);
    }
  })(null, 1);
  $('move-select').innerHTML = opts.join('');
  $('move-select').value = (what.kind === 'folder' ? folderById(what.id).parent : current()) || '';
  $('move-title').textContent = `'${nameOf(what)}' 옮기기`;
  $('move-dlg').showModal();
}

/* ---------- 끌어 놓기 ---------- */
let dragging = null; // 끌고 있는 카드나 폴더
function setupDrag() {
  const main = document.querySelector('main');
  main.addEventListener('dragstart', (e) => {
    if (!TEACHER) return;
    const folder = e.target.closest?.('[data-folder]');
    const item = e.target.closest?.('.item');
    dragging = folder ? { kind: 'folder', id: folder.dataset.folder } : item ? { kind: item.dataset.kind, id: item.dataset.id } : null;
    if (!dragging) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', nameOf(dragging) || '');
    (folder || item).classList.add('dragging');
  });
  main.addEventListener('dragend', () => {
    dragging = null;
    document.querySelectorAll('.dragging, .drop-in, .drop-before, .drop-after').forEach((el) => el.classList.remove('dragging', 'drop-in', 'drop-before', 'drop-after'));
  });

  // 폴더 위: 가운데면 안으로, 폴더를 끌 때 왼쪽·오른쪽 끝이면 순서 바꾸기
  const zone = (el, e) => {
    if (dragging?.kind !== 'folder' || !el.matches('.folder')) return 'in';
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    return x < 0.22 ? 'before' : x > 0.78 ? 'after' : 'in';
  };
  main.addEventListener('dragover', (e) => {
    if (!dragging) return;
    const el = e.target.closest('[data-drop]');
    document.querySelectorAll('.drop-in, .drop-before, .drop-after').forEach((x) => x.classList.remove('drop-in', 'drop-before', 'drop-after'));
    if (!el || (dragging.kind === 'folder' && el.dataset.drop === dragging.id)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    el.classList.add(`drop-${zone(el, e)}`);
  });
  main.addEventListener('drop', (e) => {
    if (!dragging) return;
    const el = e.target.closest('[data-drop]');
    if (!el) return;
    e.preventDefault();
    const what = dragging;
    const z = zone(el, e);
    if (z === 'in') moveTo(what, el.dataset.drop || null);
    else reorder(what.id, el.dataset.drop, z === 'before');
  });

  // 내 컴퓨터 파일을 화면에 끌어 오면 지금 폴더에 올린다
  let depth = 0;
  const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes('Files');
  window.addEventListener('dragenter', (e) => { if (TEACHER && hasFiles(e)) { depth++; $('drop-cover').hidden = false; } });
  window.addEventListener('dragleave', (e) => { if (TEACHER && hasFiles(e) && --depth <= 0) { depth = 0; $('drop-cover').hidden = true; } });
  window.addEventListener('dragover', (e) => { if (TEACHER && hasFiles(e)) e.preventDefault(); });
  window.addEventListener('drop', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth = 0;
    $('drop-cover').hidden = true;
    if (TEACHER) upload([...e.dataTransfer.files]);
  });
}

/* ---------- 파일 올리기 ---------- */
let uploading = false;
async function upload(files) {
  if (uploading || !files.length) return;
  uploading = true;
  const folder = current();
  let ok = 0;
  for (const [i, file] of files.entries()) {
    toast(`올리는 중 ${i + 1}/${files.length} · ${file.name}`, true);
    try {
      if (file.size > 50 * 1024 * 1024) throw new Error(`'${file.name}'은(는) 50MB가 넘어서 올릴 수 없어요.`);
      const s = await adminFetch('POST', { action: 'sign', name: file.name, size: file.size });
      const put = await fetch(s.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file });
      if (!put.ok) throw new Error(`'${file.name}'을(를) 올리지 못했어요.`);
      tree = (await adminFetch('POST', { action: 'add-file', id: s.id, path: s.path, title: file.name, size: file.size, type: file.type, folder })).tree;
      ok++;
      render();
    } catch (e) {
      toast(e.message);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  uploading = false;
  $('upload-input').value = '';
  if (ok) toast(`파일 ${ok}개를 올렸어요`);
}

/* ---------- 폴더 만들기·고치기·지우기 ---------- */
let editingFolder = null; // 이름을 바꾸는 중인 폴더 id (새로 만들 때는 null)
let pickedEmoji = EMOJIS[0];
function paintEmojis() {
  $('emoji-pick').innerHTML = EMOJIS.map((e) =>
    `<button type="button" class="emo-btn" aria-pressed="${e === pickedEmoji}" data-emoji="${e}">${e}</button>`).join('');
}
function openFolderDlg(folder) {
  editingFolder = folder ? folder.id : null;
  pickedEmoji = folder ? folder.emoji : EMOJIS[0];
  $('folder-dlg-title').textContent = folder ? '폴더 이름 바꾸기' : (current() ? `'${folderById(current()).name}' 안에 새 폴더` : '새 폴더');
  $('folder-submit').textContent = folder ? '바꾸기' : '만들기';
  $('folder-input').value = folder ? folder.name : '';
  $('folder-msg').textContent = '';
  paintEmojis();
  $('folder-dlg').showModal();
  $('folder-input').focus();
}

let editingLink = null;
function openLinkDlg(link) {
  editingLink = link ? link.id : null;
  $('link-dlg-title').textContent = link ? '링크 고치기' : '링크 추가';
  $('link-submit').textContent = link ? '바꾸기' : '추가하기';
  $('link-url').value = link ? link.url : '';
  $('link-title').value = link ? link.title : '';
  $('link-msg').textContent = '';
  $('link-dlg').showModal();
  $('link-url').focus();
}

let renaming = null;

function setupEditing() {
  document.querySelectorAll('.dlg [data-close]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));

  $('emoji-pick').addEventListener('click', (e) => {
    const b = e.target.closest('[data-emoji]');
    if (!b) return;
    pickedEmoji = b.dataset.emoji;
    paintEmojis();
  });
  $('folder-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('folder-input').value.trim();
    if (!name) { $('folder-msg').textContent = '폴더 이름을 적어 주세요.'; return; }
    const parent = editingFolder ? folderById(editingFolder).parent : current();
    if (tree.folders.some((f) => f.parent === parent && f.name === name && f.id !== editingFolder)) { $('folder-msg').textContent = '같은 곳에 같은 이름의 폴더가 이미 있어요.'; return; }
    $('folder-dlg').close();
    const t = copyTree();
    if (editingFolder) {
      Object.assign(t.folders.find((f) => f.id === editingFolder), { name, emoji: pickedEmoji });
      save(t, '폴더 이름을 바꿨어요');
    } else {
      t.folders.push({ id: newId(), name, emoji: pickedEmoji, parent });
      save(t, `'${name}' 폴더를 만들었어요`);
    }
  });

  $('link-form').addEventListener('submit', (e) => {
    e.preventDefault();
    let url = $('link-url').value.trim();
    if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
    try { if (!new URL(url).hostname.includes('.')) throw 0; } catch { $('link-msg').textContent = '주소를 확인해 주세요. 예: https://www.notion.so/...'; return; }
    const title = $('link-title').value.trim() || host(url);
    $('link-dlg').close();
    const t = copyTree();
    if (editingLink) {
      Object.assign(t.links.find((l) => l.id === editingLink), { url, title });
      save(t, '링크를 고쳤어요');
    } else {
      t.links.push({ id: newId(), title, url, folder: current() });
      save(t, `'${title}' 링크를 더했어요`);
    }
  });

  $('rename-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = $('rename-input').value.trim();
    if (!title || !renaming) return;
    $('rename-dlg').close();
    const t = copyTree();
    t.files.find((f) => f.id === renaming).title = title;
    save(t, '이름을 바꿨어요');
  });

  $('move-form').addEventListener('submit', (e) => {
    e.preventDefault();
    $('move-dlg').close();
    if (moving) moveTo(moving, $('move-select').value || null);
  });

  // 카드 아래 도구
  $('items').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const li = b.closest('.item');
    const what = { kind: li.dataset.kind, id: li.dataset.id };
    const act = b.dataset.act;
    if (act === 'move') openMove(what);
    if (act === 'edit-link') openLinkDlg(tree.links.find((l) => l.id === what.id));
    if (act === 'rename') {
      renaming = what.id;
      $('rename-input').value = tree.files.find((f) => f.id === what.id).title;
      $('rename-dlg').showModal();
      $('rename-input').select();
    }
    if (act === 'delete') {
      const name = nameOf(what);
      if (!confirm(`'${name}'을(를) 지울까요?${what.kind === 'file' ? '\n올린 파일도 함께 지워지고 되돌릴 수 없어요.' : ''}`)) return;
      const t = copyTree();
      const key = what.kind === 'link' ? 'links' : 'files';
      t[key] = t[key].filter((x) => x.id !== what.id);
      save(t, `'${name}'을(를) 지웠어요`);
    }
  });

  $('new-folder').addEventListener('click', () => openFolderDlg());
  $('new-link').addEventListener('click', () => openLinkDlg());
  $('upload-input').addEventListener('change', (e) => upload([...e.target.files]));
  $('folder-rename').addEventListener('click', () => openFolderDlg(folderById(current())));
  $('folder-move').addEventListener('click', () => openMove({ kind: 'folder', id: current() }));
  $('folder-delete').addEventListener('click', () => {
    const f = folderById(current());
    if (!f) return;
    const n = countIn(f.id);
    if (!confirm(n
      ? `'${f.name}' 폴더를 지울까요?\n안에 있던 것 ${n}개는 지워지지 않고 바로 위 폴더로 옮겨져요.`
      : `'${f.name}' 폴더를 지울까요?`)) return;
    // 안에 있던 폴더와 자료는 바로 위 폴더로 올린다
    const t = copyTree();
    const up = f.parent;
    t.folders = t.folders.filter((x) => x.id !== f.id);
    t.folders.forEach((x) => { if (x.parent === f.id) x.parent = up; });
    for (const [slug, id] of Object.entries(t.notes)) if (id === f.id) { if (up) t.notes[slug] = up; else delete t.notes[slug]; }
    t.links.forEach((x) => { if (x.folder === f.id) x.folder = up; });
    t.files.forEach((x) => { if (x.folder === f.id) x.folder = up; });
    location.hash = up ? `f=${up}` : '';
    save(t, '폴더를 지웠어요');
  });
}

/* ---------- 선생님 모드 ---------- */
function teacherOn() {
  TEACHER = true;
  document.body.classList.add('teacher');
  $('teacher-btn').textContent = '✏️ 선생님 모드';
  $('teacher-bar').hidden = false;
  render();
}
function teacherOff() {
  TEACHER = false;
  setPw('');
  document.body.classList.remove('teacher');
  $('teacher-btn').textContent = '🔒 선생님';
  $('teacher-bar').hidden = true;
  render();
}
function setupTeacher() {
  $('teacher-btn').addEventListener('click', () => {
    if (TEACHER) return;
    $('login-msg').textContent = '';
    $('login-pw').value = '';
    $('login-dlg').showModal();
  });
  $('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    setPw($('login-pw').value);
    const r = await fetch('/api/admin', { headers: { 'x-admin-password': getPw() } }).catch(() => null);
    if (!r || !r.ok) {
      setPw('');
      $('login-msg').textContent = r && r.status === 401 ? '비밀번호가 맞지 않아요.' : '확인하지 못했어요. 잠시 뒤 다시 해 보세요.';
      $('login-pw').select();
      return;
    }
    $('login-dlg').close();
    teacherOn();
    toast('선생님 모드가 켜졌어요');
  });
  $('bar-off').addEventListener('click', () => { teacherOff(); toast('선생님 모드를 껐어요'); });

  // 첫 화면에서 이미 선생님 모드를 켰다면 비밀번호가 아직 맞는지 확인하고 이어서 켠다
  if (getPw()) {
    fetch('/api/admin', { headers: { 'x-admin-password': getPw() } })
      .then((r) => { if (r.ok) teacherOn(); else setPw(''); })
      .catch(() => {});
  }
}

window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
setupEditing();
setupDrag();
setupTeacher();
load();
