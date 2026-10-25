// 링크 관리 화면. 비밀번호는 sessionStorage(탭을 닫으면 사라짐)에만 잠깐 둔다.
const CATS = [
  { key: 'ai', ko: 'AI 도구' },
  { key: 'design', ko: '디자인·이미지 도구' },
  { key: 'class', ko: '수업 자료·과제' },
  { key: 'collab', ko: '협업·저장 도구' },
];
const KEY = 'admin-pw';
const $ = (id) => document.getElementById(id);
let links = [];
let editingId = null;

function getPw() { try { return sessionStorage.getItem(KEY) || ''; } catch { return ''; } }
function setPw(v) { try { v ? sessionStorage.setItem(KEY, v) : sessionStorage.removeItem(KEY); } catch {} }

async function api(method, { body, query = '' } = {}) {
  const r = await fetch(`/api/admin${query}`, {
    method,
    headers: { 'x-admin-password': getPw(), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (r.status === 401) { logout('비밀번호가 맞지 않아요.'); throw new Error('401'); }
  if (!r.ok) throw new Error(data.error || '문제가 생겼어요. 잠시 뒤 다시 해 보세요.');
  return data;
}

let toastTimer;
function toast(text) {
  const t = $('toast');
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

function el(tag, attrs = {}, children = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children) if (c) n.append(c);
  return n;
}

function render() {
  $('today-count').textContent = String(links.filter((l) => l.today).length);
  $('groups').replaceChildren(...CATS.map((cat) => {
    const items = links.filter((l) => l.category === cat.key);
    return el('section', { class: 'group', 'data-cat': cat.key }, [
      el('h2', { text: `${cat.ko} (${items.length})` }),
      items.length
        ? el('ul', { class: 'items' }, items.map((l, i) => itemNode(l, items, i)))
        : el('p', { class: 'none', text: '아직 없어요. 위에서 추가해 보세요.' }),
    ]);
  }));
}

function itemNode(l, items, i) {
  return el('li', { class: `item${l.today ? ' is-today' : ''}`, 'data-cat': l.category }, [
    el('div', {}, [
      el('span', { class: 'item-name', text: l.name }),
      l.today ? el('span', { class: 'badge', text: '오늘' }) : null,
      el('span', { class: 'item-url', text: l.url }),
    ]),
    el('div', { class: 'actions' }, [
      el('button', {
        type: 'button', class: `ghost${l.today ? ' on' : ''}`, 'aria-pressed': String(!!l.today),
        text: l.today ? '오늘에서 내리기' : '오늘에 올리기',
        onclick: () => update(l, { today: !l.today }, l.today ? `'${l.name}'을(를) 오늘에서 내렸어요` : `'${l.name}'을(를) 오늘에 올렸어요`),
      }),
      el('button', { type: 'button', class: 'ghost', text: '위로', 'aria-label': `${l.name} 위로`, disabled: i === 0, onclick: () => move(items, i, -1) }),
      el('button', { type: 'button', class: 'ghost', text: '아래로', 'aria-label': `${l.name} 아래로`, disabled: i === items.length - 1, onclick: () => move(items, i, 1) }),
      el('button', { type: 'button', class: 'ghost', text: '고치기', onclick: () => startEdit(l) }),
      el('button', { type: 'button', class: 'ghost danger', text: '빼기', onclick: () => remove(l) }),
    ]),
  ]);
}

async function refresh() {
  const data = await api('GET');
  links = data.links || [];
  render();
}

async function update(l, fields, done) {
  try {
    await api('PATCH', { body: { id: l.id, ...fields } });
    await refresh();
    if (done) toast(done);
  } catch (e) { if (e.message !== '401') toast(e.message); }
}

async function move(items, i, dir) {
  const a = items[i];
  const b = items[i + dir];
  let sa = b.sort;
  let sb = a.sort;
  if (sa === sb) sa = sb + dir; // 순서 값이 같으면 하나만 비켜 놓는다
  try {
    await api('PATCH', { body: { id: a.id, sort: sa } });
    await api('PATCH', { body: { id: b.id, sort: sb } });
    await refresh();
  } catch (e) { if (e.message !== '401') toast(e.message); }
}

async function remove(l) {
  if (!confirm(`'${l.name}'을(를) 목록에서 뺄까요? 되돌릴 수 없어요.`)) return;
  try {
    await api('DELETE', { query: `?id=${encodeURIComponent(l.id)}` });
    if (editingId === l.id) stopEdit();
    await refresh();
    toast(`'${l.name}'을(를) 뺐어요`);
  } catch (e) { if (e.message !== '401') toast(e.message); }
}

function startEdit(l) {
  editingId = l.id;
  const f = $('add-form');
  f.name.value = l.name;
  f.url.value = l.url;
  f.category.value = l.category;
  f.today.checked = !!l.today;
  f.classList.add('editing');
  $('form-title').textContent = `'${l.name}' 고치기`;
  $('form-submit').textContent = '고친 내용 저장';
  $('form-cancel').hidden = false;
  $('form-msg').textContent = '';
  f.scrollIntoView({ behavior: 'smooth', block: 'start' });
  f.name.focus({ preventScroll: true });
}

function stopEdit() {
  editingId = null;
  const f = $('add-form');
  f.reset();
  f.classList.remove('editing');
  $('form-title').textContent = '사이트 추가';
  $('form-submit').textContent = '사이트 추가';
  $('form-cancel').hidden = true;
}

$('add-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  const body = { name: f.name.value, url: f.url.value, category: f.category.value, today: f.today.checked };
  const btn = $('form-submit');
  btn.disabled = true;
  $('form-msg').textContent = '';
  try {
    if (editingId) {
      await api('PATCH', { body: { id: editingId, ...body } });
      toast(`'${body.name.trim()}'을(를) 고쳤어요`);
      stopEdit();
    } else {
      await api('POST', { body });
      toast(`'${body.name.trim()}'을(를) 추가했어요`);
      f.reset();
      f.name.focus();
    }
    await refresh();
  } catch (err) {
    if (err.message !== '401') $('form-msg').textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});
$('form-cancel').addEventListener('click', stopEdit);

function showPanel(on) {
  $('login-form').hidden = on;
  $('panel').hidden = !on;
  $('logout').hidden = !on;
}

function logout(msg) {
  setPw('');
  showPanel(false);
  $('login-msg').textContent = msg || '';
  $('pw').value = '';
  $('pw').focus();
}
$('logout').addEventListener('click', () => logout());

$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  setPw($('pw').value);
  $('login-msg').textContent = '';
  try {
    await refresh();
    $('pw').value = '';
    showPanel(true);
  } catch (err) {
    if (err.message !== '401') { setPw(''); $('login-msg').textContent = err.message; }
  }
});

if (getPw()) {
  refresh().then(() => showPanel(true)).catch(() => {});
} else {
  $('pw').focus();
}
