// 첫 화면: /api/links 에서 링크를 받아 '오늘 수업'과 메뉴별 목록, 위쪽 펼침 메뉴를 그린다.
// 메뉴 목록은 menus.js(window.MENUS)에 있다.
const MENUS = window.MENUS.filter((m) => !m.hidden);

const ARROW = '<svg class="go" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>';
const OPEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const CARET = '<svg class="caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else node.setAttribute(k, v);
  }
  for (const c of children) if (c) node.append(c);
  return node;
}

function safeUrl(raw) {
  try {
    const u = new URL(raw);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u : null;
  } catch { return null; }
}

const initial = (name) => [...name.trim()][0]?.toUpperCase() || '·';

/* ---------- 선생님 모드 ----------
   오른쪽 위 '🔒 선생님'에서 비밀번호를 넣으면 이 화면에서 바로 추가·고치기·빼기를 할 수 있다.
   비밀번호는 관리자 화면과 같은 sessionStorage 칸(탭을 닫으면 사라짐)에만 둔다. */
const PW_KEY = 'admin-pw';
const ALL_MENUS = window.MENUS; // 선생님용 포함 (추가 창의 메뉴 고르기용)
let TEACHER = false;
let current = []; // 지금 화면에 그린 링크

function getPw() { try { return sessionStorage.getItem(PW_KEY) || ''; } catch { return ''; } }
function setPw(v) { try { v ? sessionStorage.setItem(PW_KEY, v) : sessionStorage.removeItem(PW_KEY); } catch {} }

async function adminApi(method, { body, query = '' } = {}) {
  const r = await fetch(`/api/admin${query}`, {
    method,
    headers: { 'x-admin-password': getPw(), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (r.status === 401) { teacherOff(); toast('비밀번호가 바뀌었어요. 다시 들어가 주세요.'); throw new Error('401'); }
  if (!r.ok) throw new Error(data.error || '문제가 생겼어요. 잠시 뒤 다시 해 보세요.');
  return data;
}

let toastTimer;
function toast(text) {
  const t = document.getElementById('toast');
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

function tbtn(text, label, onClick, cls = '') {
  const b = el('button', { type: 'button', class: `tool ${cls}`.trim(), 'aria-label': label, title: label, text });
  b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); onClick(); });
  return b;
}
const addBtn = (menu, sub, text) => tbtn(text, sub ? `${menu.ko} > ${sub}에 사이트 추가` : `${menu.ko}에 사이트 추가`,
  () => openEdit({ category: menu.key, sub: sub || '' }), 'add-btn');

// 사이트 하나에 붙는 선생님 도구: 고치기 · 오늘 수업 올리기/내리기 · 빼기
function toolsFor(item) {
  return el('div', { class: 'tools' }, [
    tbtn('✏️ 고치기', `${item.name} 고치기`, () => openEdit(item)),
    tbtn(item.today ? '⭐ 오늘에서 내리기' : '☆ 오늘에 올리기', item.today ? `${item.name} 오늘 수업에서 내리기` : `${item.name} 오늘 수업에 올리기`,
      () => saveFields(item, { today: !item.today }, item.today ? `'${item.name}'을(를) 오늘 수업에서 내렸어요` : `'${item.name}'을(를) 오늘 수업에 올렸어요`), item.today ? 'on' : ''),
    tbtn('🗑 빼기', `${item.name} 빼기`, () => removeItem(item), 'danger'),
  ]);
}

const menuOf = (key) => MENUS.find((m) => m.key === key);
// 펼침 메뉴 이름이 목록에 없으면(예전 데이터) '그 밖의 사이트'로 모은다
const subIndex = (menu, sub) => (menu && sub ? menu.subs.indexOf(sub) : -1);
const anchor = (menu, i) => (i >= 0 ? `${menu.key}-s${i}` : `${menu.key}-etc`);

function linkNode(item, cls) {
  const u = safeUrl(item.url);
  if (!u) return null;
  const host = u.hostname.replace(/^www\./, '');
  const menu = menuOf(item.category);
  const attrs = {
    class: cls, href: u.href, target: '_blank', rel: 'noopener noreferrer',
    'aria-label': `${item.name} (${host}) 새 탭에서 열기`,
  };

  if (cls === 'today-card') {
    const tag = menu ? (subIndex(menu, item.sub) >= 0 ? `${menu.ko} · ${item.sub}` : menu.ko) : '';
    const a = el('a', attrs, [
      el('span', { class: 'panel' }, [
        el('span', {}, [
          el('span', { class: 'tag', text: tag }),
          el('span', { class: 'name' }, [el('span', { text: item.name })]),
          el('span', { class: 'meta', text: host }),
        ]),
        el('span', { class: 'badge', 'aria-hidden': 'true', text: initial(item.name) }, [
          el('span', { class: 'emoji', text: menu?.emoji || '' }),
        ]),
      ]),
      el('span', { class: 'open', 'aria-hidden': 'true', html: `<span>눌러서 들어가기</span>${OPEN}` }),
    ]);
    return el('li', {}, [a, TEACHER ? toolsFor(item) : null]);
  }

  const a = el('a', attrs, [
    el('span', { class: 'mark', 'aria-hidden': 'true', text: initial(item.name) }),
    el('span', {}, [
      el('span', { class: 'name', text: item.name }),
      el('span', { class: 'meta', text: host }),
    ]),
  ]);
  a.insertAdjacentHTML('beforeend', ARROW);
  return el('li', {}, [a, TEACHER ? toolsFor(item) : null]);
}

// 메뉴 하나의 링크를 펼침 메뉴별로 나눈다. 빈 펼침 메뉴는 빼고, 이름 없는 것은 맨 뒤 '그 밖의 사이트'로.
function groupsOf(menu, links) {
  const items = links.filter((l) => l.category === menu.key);
  const groups = menu.subs
    .map((sub, i) => ({ id: anchor(menu, i), title: sub, items: items.filter((l) => l.sub === sub) }))
    .filter((g) => g.items.length);
  const etc = items.filter((l) => subIndex(menu, l.sub) < 0);
  if (etc.length) groups.push({ id: anchor(menu, -1), title: '그 밖의 사이트', items: etc });
  return groups;
}

/* ---------- 위쪽 펼침 메뉴 ---------- */
function dropSite(item) {
  const u = safeUrl(item.url);
  if (!u) return null;
  const a = el('a', {
    class: 'drop-site', href: u.href, target: '_blank', rel: 'noopener noreferrer',
    'aria-label': `${item.name} 새 탭에서 열기`,
  }, [el('span', { text: item.name })]);
  a.insertAdjacentHTML('beforeend', ARROW);
  return el('li', {}, [a]);
}

function renderMenubar(links) {
  const list = document.getElementById('menu-list');
  const home = el('li', { class: 'menu' }, [
    el('a', { class: 'menu-btn', href: '#today' }, [el('span', { class: 'menu-emoji', 'aria-hidden': 'true', text: '🏠' }), document.createTextNode('오늘 수업')]),
  ]);
  list.replaceChildren(home, ...MENUS.map((menu) => {
    const groups = groupsOf(menu, links);
    const dropId = `drop-${menu.key}`;
    const btn = el('button', { type: 'button', class: 'menu-btn', 'aria-expanded': 'false', 'aria-controls': dropId }, [
      el('span', { class: 'menu-emoji', 'aria-hidden': 'true', text: menu.emoji }),
      document.createTextNode(menu.ko),
    ]);
    btn.insertAdjacentHTML('beforeend', CARET);
    // 펼침 메뉴에서 사이트를 누르면 바로 새 탭으로 열린다. 펼침 메뉴 이름은 작은 제목으로만 둔다.
    const drop = el('ul', { class: 'dropdown', id: dropId }, [
      el('li', {}, [el('a', { href: `#${menu.key}`, class: 'drop-all', text: `${menu.ko} 전체 보기` })]),
      ...(groups.length
        ? groups.flatMap((g) => {
          // 사이트가 하나뿐이고 이름이 펼침 메뉴와 같으면(예: 엔트리 > 엔트리) 제목은 생략
          const same = g.items.length === 1 && g.items[0].name.trim() === g.title;
          return [
            same ? null : el('li', { class: 'drop-head', text: g.title }),
            ...g.items.map(dropSite),
          ].filter(Boolean);
        })
        : [el('li', { class: 'drop-empty', text: '아직 사이트가 없어요' })]),
    ]);
    return el('li', { class: 'menu' }, [btn, drop]);
  }));
}

function closeMenus(except) {
  document.querySelectorAll('.menu-btn[aria-expanded="true"]').forEach((b) => {
    if (b !== except) b.setAttribute('aria-expanded', 'false');
  });
}

function setupMenubar() {
  const bar = document.getElementById('menubar');
  const toggle = document.getElementById('menu-toggle');

  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('button.menu-btn');
    if (btn) {
      const open = btn.getAttribute('aria-expanded') === 'true';
      closeMenus(btn);
      btn.setAttribute('aria-expanded', String(!open));
      return;
    }
    if (e.target.closest('a')) { // 메뉴에서 고르면 메뉴를 닫는다
      closeMenus();
      bar.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
  toggle.addEventListener('click', () => {
    const open = !bar.classList.contains('open');
    bar.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('#menubar')) closeMenus(); });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const openBtn = document.querySelector('.menu-btn[aria-expanded="true"]');
    closeMenus();
    if (openBtn) openBtn.focus();
  });
}

/* ---------- 본문 ---------- */
function render(links) {
  current = links;
  renderMenubar(links);

  const today = links.filter((l) => l.today);
  const todayList = document.getElementById('today-list');
  const todayEmpty = document.getElementById('today-empty');
  todayList.replaceChildren(...today.map((l) => linkNode(l, 'today-card')).filter(Boolean));
  if (!today.length) {
    todayEmpty.textContent = links.length
      ? '오늘 쓸 사이트가 아직 없어요. 위 메뉴에서 골라 들어가세요.'
      : '등록된 사이트가 아직 없어요. 사이트가 올라오면 여기에 나타나요.';
    todayEmpty.hidden = false;
  } else {
    todayEmpty.hidden = true;
  }

  document.getElementById('categories').replaceChildren(...MENUS.map((menu) => {
    const groups = groupsOf(menu, links);
    // 펼침 메뉴는 옆으로 나란히. 사이트가 많아질수록 카드가 자동으로 작아진다.
    const total = groups.reduce((n, g) => n + g.items.length, 0);
    const density = total <= 6 ? 'roomy' : total <= 14 ? 'compact' : 'mini';
    // 펼침 메뉴 이름표 없이 한 묶음으로 보여 준다(순서는 펼침 메뉴 순서 → 그 안의 순서)
    const items = groups.flatMap((g) => g.items);
    const body = items.length
      ? [el('ul', { class: 'link-grid' }, items.map((l) => linkNode(l, 'link-item')).filter(Boolean))]
      : [el('p', { class: 'cat-empty', text: '이 메뉴에는 아직 사이트가 없어요.' })];
    return el('section', { class: 'cat', id: menu.key, 'data-density': density, 'aria-labelledby': `${menu.key}-title` }, [
      el('div', { class: 'cat-head' }, [
        el('span', { class: 'cat-emoji', 'aria-hidden': 'true', text: menu.emoji }),
        el('h2', { id: `${menu.key}-title`, text: menu.ko }),
        TEACHER ? addBtn(menu, '', '+ 사이트 추가') : null,
      ]),
      ...body,
    ]);
  }));
}

async function load() {
  document.getElementById('load-error').hidden = true;
  try {
    let links;
    if (TEACHER) {
      // 선생님 모드는 관리자 목록을 그대로 쓴다(선생님용은 MENUS에서 빠져 있어 화면에는 안 나온다)
      ({ links } = await adminApi('GET'));
    } else {
      const r = await fetch('/api/links', { cache: 'no-store' });
      if (!r.ok) throw new Error(String(r.status));
      ({ links } = await r.json());
    }
    render(Array.isArray(links) ? links : []);
  } catch (e) {
    if (e.message === '401') return;
    render([]);
    document.getElementById('today-empty').hidden = true;
    document.getElementById('load-error').hidden = false;
  }
}

/* ---------- 선생님 모드 켜기·끄기 ---------- */
function setTeacherBtn(icon, text) {
  const b = document.getElementById('teacher-btn');
  b.querySelector('.tb-icon').textContent = icon;
  b.querySelector('.tb-text').textContent = text;
}
function teacherOn() {
  TEACHER = true;
  document.body.classList.add('teacher');
  setTeacherBtn('✏️', '선생님 모드');
  document.getElementById('teacher-bar').hidden = false;
  load();
}
function teacherOff() {
  TEACHER = false;
  setPw('');
  document.body.classList.remove('teacher');
  setTeacherBtn('🔒', '선생님');
  document.getElementById('teacher-bar').hidden = true;
  load();
}

function setupTeacher() {
  const loginDlg = document.getElementById('login-dlg');
  const editDlg = document.getElementById('edit-dlg');
  document.querySelectorAll('.dlg [data-close]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));

  document.getElementById('teacher-btn').addEventListener('click', () => {
    if (TEACHER) { document.getElementById('teacher-bar').scrollIntoView({ block: 'end' }); return; }
    document.getElementById('login-msg').textContent = '';
    document.getElementById('login-pw').value = '';
    loginDlg.showModal();
  });
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    setPw(document.getElementById('login-pw').value);
    const r = await fetch('/api/admin', { headers: { 'x-admin-password': getPw() } }).catch(() => null);
    if (!r || !r.ok) {
      setPw('');
      document.getElementById('login-msg').textContent = r && r.status === 401 ? '비밀번호가 맞지 않아요.' : '확인하지 못했어요. 잠시 뒤 다시 해 보세요.';
      document.getElementById('login-pw').select();
      return;
    }
    loginDlg.close();
    teacherOn();
    toast('선생님 모드가 켜졌어요');
  });
  document.getElementById('bar-off').addEventListener('click', () => { teacherOff(); toast('선생님 모드를 껐어요'); });
  document.getElementById('bar-add').addEventListener('click', () => openEdit({ category: MENUS[0].key, sub: '' }));
  document.getElementById('hero-add').addEventListener('click', () => openEdit({ category: MENUS[0].key, sub: '', today: true }));

  // 추가·고치기 창
  const menuSel = document.getElementById('edit-menu');
  menuSel.replaceChildren(...ALL_MENUS.map((m) => el('option', { value: m.key, text: `${m.emoji} ${m.ko}${m.hidden ? ' (학생 화면에 안 보임)' : ''}` })));
  menuSel.addEventListener('change', () => fillSubs(''));
  document.getElementById('edit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const body = { url: f.url.value, name: f.name.value, category: f.category.value, sub: f.sub.value, today: f.today.checked };
    const btn = document.getElementById('edit-submit');
    btn.disabled = true;
    document.getElementById('edit-msg').textContent = '';
    try {
      if (editingId) {
        await adminApi('PATCH', { body: { id: editingId, ...body } });
        toast(`'${body.name.trim() || '사이트'}'을(를) 고쳤어요`);
      } else {
        const { link } = await adminApi('POST', { body });
        toast(`'${link?.name || body.name}'을(를) 추가했어요`);
      }
      editDlg.close();
      await load();
    } catch (err) {
      if (err.message !== '401') document.getElementById('edit-msg').textContent = err.message;
      else editDlg.close();
    } finally {
      btn.disabled = false;
    }
  });

  // 같은 탭에서 이미 비밀번호를 넣었으면(예: 관리자 화면에서 돌아옴) 바로 선생님 모드
  if (getPw()) {
    fetch('/api/admin', { headers: { 'x-admin-password': getPw() } })
      .then((r) => { if (r.ok) teacherOn(); else { setPw(''); load(); } })
      .catch(() => load());
  }
}

let editingId = null;
function fillSubs(selected) {
  const menu = ALL_MENUS.find((m) => m.key === document.getElementById('edit-menu').value) || ALL_MENUS[0];
  const subs = [...menu.subs];
  if (selected && !subs.includes(selected)) subs.push(selected);
  const sel = document.getElementById('edit-sub');
  sel.replaceChildren(el('option', { value: '', text: '고르지 않음 (그 밖의 사이트)' }), ...subs.map((s) => el('option', { value: s, text: s })));
  sel.value = selected || '';
  const row = document.getElementById('edit-today-row');
  row.hidden = !!menu.hidden; // 선생님용은 학생 화면에 안 나오니 '오늘 수업'도 없다
  if (menu.hidden) row.querySelector('input').checked = false;
}

// item에 id가 있으면 고치기, 없으면(메뉴·펼침 메뉴만 있으면) 새로 추가
function openEdit(item) {
  const f = document.getElementById('edit-form');
  f.reset();
  editingId = item.id || null;
  f.url.value = item.url || '';
  f.name.value = item.id ? item.name : '';
  f.category.value = ALL_MENUS.some((m) => m.key === item.category) ? item.category : MENUS[0].key;
  fillSubs(item.sub || '');
  f.today.checked = !!item.today;
  const menu = ALL_MENUS.find((m) => m.key === f.category.value);
  document.getElementById('edit-title').textContent = item.id
    ? `'${item.name}' 고치기`
    : `${menu.emoji} ${menu.ko}${item.sub ? ` > ${item.sub}` : ''}에 사이트 추가`;
  document.getElementById('edit-submit').textContent = item.id ? '저장하기' : '추가하기';
  document.getElementById('edit-msg').textContent = '';
  document.getElementById('edit-dlg').showModal();
  f.url.focus();
}

async function saveFields(item, fields, done) {
  try {
    await adminApi('PATCH', { body: { id: item.id, ...fields } });
    await load();
    toast(done);
  } catch (e) { if (e.message !== '401') toast(e.message); }
}

async function removeItem(item) {
  if (!confirm(`'${item.name}'을(를) 목록에서 뺄까요? 되돌릴 수 없어요.`)) return;
  try {
    await adminApi('DELETE', { query: `?id=${encodeURIComponent(item.id)}` });
    await load();
    toast(`'${item.name}'을(를) 뺐어요`);
  } catch (e) { if (e.message !== '401') toast(e.message); }
}

setupMenubar();
setupTeacher();
renderMenubar([]);
if (!getPw()) load();
