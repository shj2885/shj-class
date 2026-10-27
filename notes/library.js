// 자료실 첫 화면: /api/notes 에서 폴더를 받아 폴더 카드와 '폴더에 안 넣은 자료'를 그린다.
// 폴더를 누르면 주소 끝이 #folder=○○ 로 바뀌고 그 폴더의 자료만 보인다.
// 선생님 모드에서는 폴더 만들기·이름 바꾸기·지우기와 자료를 폴더에 넣기를 할 수 있다.
const NOTES = window.NOTES;
const PW_KEY = 'admin-pw'; // 첫 화면 선생님 모드와 같은 칸이라, 거기서 켜 두었으면 여기서도 켜져 있다
const EMOJIS = ['📁', '💻', '🎬', '📺', '🤖', '🎨', '🧩', '✨', '📚', '📝', '🎵', '⭐'];
let folders = [];
let TEACHER = false;

function getPw() { try { return sessionStorage.getItem(PW_KEY) || ''; } catch { return ''; } }
function setPw(v) { try { v ? sessionStorage.setItem(PW_KEY, v) : sessionStorage.removeItem(PW_KEY); } catch {} }
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let toastTimer;
function toast(text) {
  const t = $('toast');
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ---------- 그리기 ---------- */
const folderOf = (slug) => folders.find((f) => f.notes.includes(slug));
const currentId = () => new URLSearchParams(location.hash.slice(1)).get('folder');

function noteItem(n) {
  const opts = [`<option value="">폴더 없음</option>`]
    .concat(folders.map((f) => `<option value="${f.id}"${folderOf(n.slug) === f ? ' selected' : ''}>${esc(f.emoji)} ${esc(f.name)}</option>`))
    .join('');
  return `<li class="item">
    <a href="/notes/${n.slug}">
      <span class="emo" aria-hidden="true">${n.emoji}</span>
      <span><span class="no">${esc(n.tag)}</span><b>${esc(n.title)}</b><small>${esc(n.sub)}</small></span>
      <span class="go" aria-hidden="true">→</span>
    </a>
    <label class="teacher-only move">📁 넣을 폴더 <select data-slug="${n.slug}">${opts}</select></label>
  </li>`;
}

function render() {
  const id = currentId();
  const folder = folders.find((f) => f.id === id);
  $('home-view').hidden = !!folder;
  $('folder-view').hidden = !folder;

  if (folder) {
    $('folder-name').textContent = folder.name;
    $('folder-title').textContent = folder.name;
    $('folder-emoji').textContent = folder.emoji;
    document.title = `${folder.name} · 자료실`;
    const list = NOTES.filter((n) => folder.notes.includes(n.slug));
    $('in-folder').innerHTML = list.length
      ? list.map(noteItem).join('')
      : `<li class="empty">아직 이 폴더에 자료가 없어요.${TEACHER ? '<br>자료실 첫 화면에서 자료 카드 아래 \'넣을 폴더\'를 이 폴더로 골라 주세요.' : ''}</li>`;
    return;
  }

  document.title = '자료실 · 에듀깨비';
  $('folders').innerHTML = folders.map((f) => `
    <a class="folder" href="#folder=${f.id}">
      <span class="f-emo" aria-hidden="true">${esc(f.emoji)}</span>
      <b>${esc(f.name)}</b>
      <small>자료 ${f.notes.length}개</small>
    </a>`).join('')
    + (TEACHER ? '<button type="button" class="folder add" id="grid-new"><span class="f-emo" aria-hidden="true">＋</span><b>새 폴더</b><small>이름을 정해 만들어요</small></button>' : '');
  const add = $('grid-new');
  if (add) add.addEventListener('click', () => openFolderDlg());

  const loose = NOTES.filter((n) => !folderOf(n.slug));
  $('loose').innerHTML = loose.map(noteItem).join('');
  $('loose-title').hidden = !loose.length;
  // 폴더가 하나도 없으면 제목 없이 자료만 보인다
  if (!folders.length && !TEACHER) $('loose-title').hidden = true;
}

/* ---------- 불러오기·저장 ---------- */
async function load() {
  try {
    const r = await fetch('/api/notes', { cache: 'no-store' });
    if (!r.ok) throw new Error();
    folders = (await r.json()).folders || [];
  } catch {
    folders = [];
    $('load-error').hidden = false;
  }
  render();
}

// 바꾼 폴더 목록을 통째로 저장한다. 실패하면 화면을 바꾸기 전으로 되돌린다.
async function save(next, done) {
  const before = folders;
  folders = next;
  render();
  try {
    const r = await fetch('/api/notes', {
      method: 'PUT',
      headers: { 'x-admin-password': getPw(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ folders: next }),
    });
    const data = await r.json().catch(() => ({}));
    if (r.status === 401) { teacherOff(); throw new Error('비밀번호가 바뀌었어요. 다시 들어가 주세요.'); }
    if (!r.ok) throw new Error(data.error || '저장하지 못했어요. 잠시 뒤 다시 해 보세요.');
    folders = data.folders;
    render();
    if (done) toast(done);
  } catch (e) {
    folders = before;
    render();
    toast(e.message);
  }
}

const newId = () => Math.random().toString(36).slice(2, 10).padEnd(8, '0');
const copy = () => folders.map((f) => ({ ...f, notes: [...f.notes] }));

/* ---------- 폴더 만들기·고치기·지우기 ---------- */
let editing = null; // 이름을 바꾸는 중인 폴더 id (새로 만들 때는 null)
let pickedEmoji = EMOJIS[0];

function paintEmojis() {
  $('emoji-pick').innerHTML = EMOJIS.map((e) =>
    `<button type="button" class="emo-btn" aria-pressed="${e === pickedEmoji}" data-emoji="${e}">${e}</button>`).join('');
}

function openFolderDlg(folder) {
  editing = folder ? folder.id : null;
  pickedEmoji = folder ? folder.emoji : EMOJIS[0];
  $('folder-dlg-title').textContent = folder ? '폴더 이름 바꾸기' : '새 폴더';
  $('folder-submit').textContent = folder ? '바꾸기' : '만들기';
  $('folder-input').value = folder ? folder.name : '';
  $('folder-msg').textContent = '';
  paintEmojis();
  $('folder-dlg').showModal();
  $('folder-input').focus();
}

function setupFolders() {
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
    if (folders.some((f) => f.name === name && f.id !== editing)) { $('folder-msg').textContent = '같은 이름의 폴더가 이미 있어요.'; return; }
    $('folder-dlg').close();
    if (editing) {
      save(copy().map((f) => (f.id === editing ? { ...f, name, emoji: pickedEmoji } : f)), '폴더 이름을 바꿨어요');
    } else {
      save([...copy(), { id: newId(), name, emoji: pickedEmoji, notes: [] }], `'${name}' 폴더를 만들었어요`);
    }
  });

  $('folder-rename').addEventListener('click', () => openFolderDlg(folders.find((f) => f.id === currentId())));
  $('folder-delete').addEventListener('click', () => {
    const f = folders.find((x) => x.id === currentId());
    if (!f) return;
    const msg = f.notes.length
      ? `'${f.name}' 폴더를 지울까요?\n안에 있던 자료 ${f.notes.length}개는 지워지지 않고 '폴더에 안 넣은 자료'로 돌아가요.`
      : `'${f.name}' 폴더를 지울까요?`;
    if (!confirm(msg)) return;
    history.replaceState(null, '', location.pathname);
    save(copy().filter((x) => x.id !== f.id), '폴더를 지웠어요');
  });

  // 자료 카드 아래 '넣을 폴더' 고르기
  document.querySelector('main').addEventListener('change', (e) => {
    const sel = e.target.closest('select[data-slug]');
    if (!sel) return;
    const slug = sel.dataset.slug;
    const next = copy().map((f) => ({ ...f, notes: f.notes.filter((s) => s !== slug) }));
    const to = next.find((f) => f.id === sel.value);
    if (to) to.notes.push(slug);
    save(next, to ? `'${to.name}' 폴더에 넣었어요` : '폴더에서 뺐어요');
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
  document.querySelectorAll('.dlg [data-close]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
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
  $('bar-new').addEventListener('click', () => openFolderDlg());
  $('bar-off').addEventListener('click', () => { teacherOff(); toast('선생님 모드를 껐어요'); });

  // 첫 화면에서 이미 선생님 모드를 켰다면 비밀번호가 아직 맞는지 확인하고 이어서 켠다
  if (getPw()) {
    fetch('/api/admin', { headers: { 'x-admin-password': getPw() } })
      .then((r) => { if (r.ok) teacherOn(); else setPw(''); })
      .catch(() => {});
  }
}

window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
setupFolders();
setupTeacher();
load();
