// 링크 관리 화면. 비밀번호는 sessionStorage(탭을 닫으면 사라짐)에만 잠깐 둔다.
// 메뉴 목록은 /menus.js(window.MENUS)에 있다.
const MENUS = window.MENUS;
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

/* ---------- 메뉴 고르기: 메뉴를 바꾸면 펼침 메뉴 목록이 따라 바뀐다 ---------- */
function fillMenuSelect() {
  $('menu-select').replaceChildren(...MENUS.map((m) => el('option', { value: m.key, text: `${m.emoji} ${m.ko}` })));
  fillSubSelect();
}
function fillSubSelect(selected = '') {
  const menu = MENUS.find((m) => m.key === $('menu-select').value) || MENUS[0];
  const subs = [...menu.subs];
  if (selected && !subs.includes(selected)) subs.push(selected); // 예전 값도 고칠 때 보이게
  $('sub-select').replaceChildren(
    el('option', { value: '', text: '고르지 않음 (그 밖의 사이트)' }),
    ...subs.map((s) => el('option', { value: s, text: s })),
  );
  $('sub-select').value = selected;
  $('teacher-hint').hidden = !menu.hidden;
  const today = $('add-form').today;
  today.closest('label').hidden = !!menu.hidden;
  if (menu.hidden) today.checked = false;
}
$('menu-select').addEventListener('change', () => fillSubSelect());

/* ---------- 추천 사이트: 누르면 그 펼침 메뉴에 바로 들어간다 (공식 주소만) ---------- */
const RECOMMEND = {
  block: {
    '엔트리': [['엔트리', 'https://playentry.org']],
    '스크래치': [['스크래치', 'https://scratch.mit.edu']],
    '코드닷오알지': [['코드닷오알지', 'https://code.org'], ['Hour of Code', 'https://hourofcode.com']],
    '코딩 게임': [['블록리 게임', 'https://blockly.games']],
  },
  robot: {
    '마이크로비트': [['메이크코드 마이크로비트', 'https://makecode.microbit.org']],
    '아두이노': [['틴커캐드', 'https://www.tinkercad.com']],
  },
  ai: {
    '머신러닝 체험': [['티처블 머신', 'https://teachablemachine.withgoogle.com']],
    '그림 AI': [['퀵드로우', 'https://quickdraw.withgoogle.com'], ['오토드로우', 'https://www.autodraw.com']],
    '엔트리 AI': [['엔트리', 'https://playentry.org']],
  },
  design: {
    '그림·포스터': [['미리캔버스', 'https://www.miricanvas.com'], ['캔바', 'https://www.canva.com']],
    '픽셀아트': [['픽실아트', 'https://www.pixilart.com']],
    '3D 만들기': [['틴커캐드', 'https://www.tinkercad.com']],
  },
  tools: {
    '과제 제출': [['패들렛', 'https://padlet.com']],
    '학급방': [['구글 클래스룸', 'https://classroom.google.com']],
  },
  play: {
    '코딩 게임': [['블록리 게임', 'https://blockly.games']],
    '퍼즐': [['블록리 게임', 'https://blockly.games']],
  },
};
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };

const openMenus = new Set(); // 다시 그려도 펼쳐 둔 메뉴는 그대로
let firstRender = true;

function render() {
  $('today-count').textContent = String(links.filter((l) => l.today).length);
  if (firstRender) {
    MENUS.forEach((m) => { if (links.some((l) => l.category === m.key)) openMenus.add(m.key); });
    firstRender = false;
  }
  const known = new Set(MENUS.map((m) => m.key));
  const orphans = links.filter((l) => !known.has(l.category));
  const sections = MENUS.map(menuSection);
  if (orphans.length) {
    sections.unshift(el('section', { class: 'group' }, [
      el('h2', { class: 'loose', text: `메뉴를 다시 골라 주세요 (${orphans.length})` }),
      el('ul', { class: 'items' }, orphans.map((l, i) => itemNode(l, orphans, i))),
    ]));
  }
  $('groups').replaceChildren(
    el('nav', { class: 'jump', 'aria-label': '메뉴로 이동' }, MENUS.map((m) => el('a', {
      href: `#menu-${m.key}`, 'data-cat': m.key, text: `${m.emoji} ${m.ko}`,
      onclick: () => { openMenus.add(m.key); const d = $(`menu-${m.key}`); if (d) d.open = true; },
    }))),
    ...sections,
  );
}

// 메뉴 하나: 접었다 펼 수 있고, 안에 펼침 메뉴마다 목록·바로 추가 칸·추천 사이트가 있다
function menuSection(menu) {
  const items = links.filter((l) => l.category === menu.key);
  const subs = [...menu.subs.map((s) => ({ sub: s, title: s })), { sub: '', title: '그 밖의 사이트' }];
  const details = el('details', { class: 'group', id: `menu-${menu.key}`, 'data-cat': menu.key, open: openMenus.has(menu.key) }, [
    el('summary', {}, [
      el('span', { class: 'sum-title', text: `${menu.emoji} ${menu.ko}` }),
      el('span', { class: 'sum-count', text: `${items.length}개` }),
      menu.hidden ? el('span', { class: 'sum-note', text: '학생 화면에 안 보임' }) : null,
    ]),
    ...subs.map(({ sub, title }) => {
      const subItems = sub
        ? items.filter((l) => l.sub === sub)
        : items.filter((l) => !menu.subs.includes(l.sub));
      if (!sub && !subItems.length) return null; // '그 밖의 사이트'는 있을 때만
      return subBlock(menu, sub, title, subItems);
    }),
  ]);
  details.addEventListener('toggle', () => { if (details.open) openMenus.add(menu.key); else openMenus.delete(menu.key); });
  return details;
}

function subBlock(menu, sub, title, subItems) {
  const have = new Set(links.filter((l) => l.category === menu.key && (l.sub || '') === sub).map((l) => hostOf(l.url)));
  const recs = ((RECOMMEND[menu.key] || {})[sub] || []).filter(([, url]) => !have.has(hostOf(url)));
  return el('div', { class: 'subgroup', 'data-sub': sub }, [
    el('h3', {}, [el('span', { text: title }), el('span', { class: 'sub-count', text: String(subItems.length) })]),
    subItems.length
      ? el('ul', { class: 'items' }, subItems.map((l, i) => itemNode(l, subItems, i)))
      : null,
    sub ? quickAdd(menu, sub, title) : null,
    recs.length
      ? el('div', { class: 'recs' }, [
        el('span', { class: 'recs-label', text: '추천' }),
        ...recs.map(([name, url]) => el('button', {
          type: 'button', class: 'rec', title: url, text: `+ ${name}`,
          onclick: () => add({ name, url, category: menu.key, sub, today: false }),
        })),
      ])
      : null,
  ]);
}

// 주소만 붙여 넣고 추가. 이름은 비우면 주소에서 따온다.
function quickAdd(menu, sub, title) {
  const form = el('form', { class: 'quick', autocomplete: 'off' }, [
    el('input', { name: 'url', inputmode: 'url', required: true, placeholder: '주소 붙여 넣기', 'aria-label': `${title}에 넣을 주소` }),
    el('input', { name: 'name', maxlength: '60', placeholder: '이름 (비워도 돼요)', 'aria-label': `${title}에 넣을 사이트 이름` }),
    el('button', { type: 'submit', class: 'solid', text: '추가' }),
  ]);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ok = await add({ name: form.name.value, url: form.url.value, category: menu.key, sub, today: false });
    if (ok) form.reset();
  });
  return form;
}

async function add(body) {
  try {
    const { link } = await api('POST', { body });
    openMenus.add(body.category);
    await refresh();
    toast(`'${link?.name || body.name}'을(를) 추가했어요`);
    return true;
  } catch (e) {
    if (e.message !== '401') toast(e.message);
    return false;
  }
}

function itemNode(l, items, i) {
  const hidden = MENUS.find((m) => m.key === l.category)?.hidden; // 선생님용은 학생 화면에 안 나오니 '오늘' 버튼이 없다
  return el('li', { class: `item${l.today ? ' is-today' : ''}`, 'data-cat': l.category }, [
    el('div', {}, [
      el('span', { class: 'item-name', text: l.name }),
      l.today ? el('span', { class: 'badge', text: '오늘' }) : null,
      el('a', { class: 'item-url', href: l.url, target: '_blank', rel: 'noopener noreferrer', text: l.url }),
    ]),
    el('div', { class: 'actions' }, [
      hidden ? null : el('button', {
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
  window.sortMenus(MENUS, data.menuOrder); // 첫 화면에서 끌어서 바꾼 메뉴 순서를 여기도 따른다
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
  f.category.value = MENUS.some((m) => m.key === l.category) ? l.category : MENUS[0].key;
  fillSubSelect(l.sub || '');
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
  fillSubSelect();
  f.classList.remove('editing');
  $('form-title').textContent = '사이트 추가';
  $('form-submit').textContent = '사이트 추가';
  $('form-cancel').hidden = true;
}

$('add-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  const body = { name: f.name.value, url: f.url.value, category: f.category.value, sub: f.sub.value, today: f.today.checked };
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
      // 같은 메뉴에 여러 개를 이어서 넣기 쉽게 메뉴 선택은 남겨 둔다
      f.category.value = body.category;
      fillSubSelect(body.sub);
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
  if (on) jumpToTarget();
}

// 첫 화면의 '+ 사이트 추가'에서 왔으면(/admin?menu=block&sub=엔트리) 그 칸을 열고 주소 칸에 커서를 둔다
let jumped = false;
function jumpToTarget() {
  if (jumped) return;
  jumped = true;
  const q = new URLSearchParams(location.search);
  const menu = MENUS.find((m) => m.key === q.get('menu'));
  if (!menu) return;
  openMenus.add(menu.key);
  const box = $(`menu-${menu.key}`);
  if (!box) return;
  box.open = true;
  const sub = q.get('sub') || '';
  const block = [...box.querySelectorAll('.subgroup')].find((s) => s.dataset.sub === sub) || box.querySelector('.subgroup');
  const target = block || box;
  target.scrollIntoView({ block: 'start' });
  target.classList.add('flash');
  setTimeout(() => target.classList.remove('flash'), 1600);
  block?.querySelector('form.quick input[name="url"]')?.focus({ preventScroll: true });
}

function logout(msg) {
  setPw('');
  try { localStorage.removeItem('kd-admin'); } catch {} // 예전 버전이 남긴 표시 정리
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

fillMenuSelect();
if (getPw()) {
  refresh().then(() => showPanel(true)).catch(() => {});
} else {
  $('pw').focus();
}
