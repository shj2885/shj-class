// 첫 화면: /api/links 에서 링크를 받아 '오늘 수업'과 메뉴별 목록, 위쪽 펼침 메뉴를 그린다.
// 메뉴 목록은 menus.js(window.MENUS)에 있고, 순서는 서버에 저장된 순서(선생님이 끌어서 바꾼 순서)를 따른다.
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
let sitePassword = ''; // 입장 비밀번호 (선생님 모드에서만 받아 온다)
let notesPassword = ''; // 자료실 비밀번호 (선생님 모드에서만 받아 온다)

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

// 오늘의 카드 제목: '도깨비 시장놀이'처럼 도깨비로 시작하면 도깨비 다음에 줄을 바꾼다
function cardName(name) {
  const m = name.trim().match(/^(\S*도깨비)\s+(.+)$/);
  return m ? [m[1], el('br'), m[2]] : [name];
}

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
          el('span', { class: 'name' }, [el('span', {}, cardName(item.name))]),
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
      TEACHER ? el('span', { class: 'grip', 'aria-hidden': 'true', title: '끌어서 순서 바꾸기', text: '⠿' }) : null,
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
    return el('li', { class: 'menu', 'data-key': menu.key }, [btn, drop]);
  }), notesMenu());
}

// 자료실은 펼침 메뉴 없이 바로 /notes 로 간다. data-key가 없어서 끌어서 순서 바꾸기에는 끼지 않고 늘 맨 끝에 있다.
function notesMenu() {
  return el('li', { class: 'menu' }, [
    el('a', { class: 'menu-btn', href: '/notes/' }, [el('span', { class: 'menu-emoji', 'aria-hidden': 'true', text: '📚' }), document.createTextNode('자료실')]),
  ]);
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

/* ---------- 선생님 모드: 위쪽 메뉴를 끌어서 순서 바꾸기 ----------
   메뉴 버튼을 누른 채 옆(휴대폰에서는 위아래)으로 끌면 자리가 바뀌고, 놓으면 서버에 저장된다.
   조금(6px)이라도 움직여야 끌기가 시작되므로 그냥 누르면 예전처럼 펼침 메뉴가 열린다. */
function setupMenuDrag() {
  const list = document.getElementById('menu-list');
  let drag = null;
  let justDragged = false;

  list.addEventListener('pointerdown', (e) => {
    if (!TEACHER || e.button !== 0) return;
    const li = e.target.closest('.menu-btn')?.closest('li.menu[data-key]');
    if (!li) return;
    e.preventDefault(); // 끄는 동안 주변 글자가 선택되지 않게 (눌러서 펼치는 click은 그대로 온다)
    drag = { li, id: e.pointerId, x: e.clientX, y: e.clientY, on: false };
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.on) {
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
      drag.on = true;
      closeMenus();
      drag.li.classList.add('dragging');
      list.classList.add('sorting');
    }
    e.preventDefault();
    const over = document.elementFromPoint(e.clientX, e.clientY)?.closest('#menu-list li.menu[data-key]');
    if (!over || over === drag.li) return;
    const r = over.getBoundingClientRect();
    const column = getComputedStyle(list).flexDirection === 'column';
    const before = column ? e.clientY < r.top + r.height / 2 : e.clientX < r.left + r.width / 2;
    list.insertBefore(drag.li, before ? over : over.nextSibling);
  });
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const was = drag.on;
    drag.li.classList.remove('dragging');
    list.classList.remove('sorting');
    drag = null;
    if (!was) return;
    justDragged = true; // 끌기를 마친 뒤 따라오는 click으로 펼침 메뉴가 열리지 않게
    setTimeout(() => { justDragged = false; }, 0);
    saveMenuOrder([...list.querySelectorAll('li.menu[data-key]')].map((li) => li.dataset.key));
  };
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
  list.addEventListener('click', (e) => { if (justDragged) { e.preventDefault(); e.stopPropagation(); } }, true);
}

async function saveMenuOrder(order) {
  if (order.join() === MENUS.map((m) => m.key).join()) return;
  // 선생님용처럼 화면에 없는 메뉴는 뒤에 붙여서 함께 저장한다
  const full = [...order, ...ALL_MENUS.filter((m) => !order.includes(m.key)).map((m) => m.key)];
  try {
    await adminApi('PUT', { body: { menuOrder: full } });
    window.sortMenus(ALL_MENUS, full);
    window.sortMenus(MENUS, full);
    render(current);
    toast('메뉴 순서를 바꿨어요');
  } catch (e) {
    render(current); // 저장하지 못했으면 원래 순서로 되돌린다
    if (e.message !== '401') toast(e.message);
  }
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
  fitNames();
}

// 사이트 이름은 절대 두 줄로 꺾지 않는다: 칸보다 길면 글자를 한 줄에 들어갈 때까지 줄인다
function fitNames() {
  document.querySelectorAll('.today-card .name, .link-item .name').forEach((n) => {
    n.style.fontSize = '';
    let size = parseFloat(getComputedStyle(n).fontSize);
    const min = Math.max(10, size * 0.4);
    while (n.scrollWidth > n.clientWidth + 0.5 && size > min) {
      size -= 0.5;
      n.style.fontSize = size + 'px';
    }
  });
}
let fitT = 0;
window.addEventListener('resize', () => { clearTimeout(fitT); fitT = setTimeout(fitNames, 120); });
document.fonts?.ready.then(fitNames);

async function load() {
  document.getElementById('load-error').hidden = true;
  try {
    let data;
    if (TEACHER) {
      // 선생님 모드는 관리자 목록을 그대로 쓴다(선생님용은 MENUS에서 빠져 있어 화면에는 안 나온다)
      data = await adminApi('GET');
      sitePassword = data.sitePassword || '';
      notesPassword = data.notesPassword || '';
    } else {
      const r = await fetch('/api/links', { cache: 'no-store' });
      if (!r.ok) throw new Error(String(r.status));
      data = await r.json();
    }
    window.sortMenus(ALL_MENUS, data.menuOrder);
    window.sortMenus(MENUS, data.menuOrder);
    render(Array.isArray(data.links) ? data.links : []);
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

// 비밀번호 바꾸는 창 하나를 연결한다. id는 창 안 요소 이름의 앞부분(○○-dlg, ○○-now, ○○-pw, ○○-msg, ○○-form, ○○-submit)
function passwordDialog({ id, open, field, label, get, set, none }) {
  const $ = (s) => document.getElementById(`${id}-${s}`);
  const dlg = $('dlg');
  document.getElementById(open).addEventListener('click', () => {
    $('now').textContent = get() ? `지금 비밀번호는 「${get()}」예요.` : none;
    $('pw').value = get();
    $('msg').textContent = '';
    dlg.showModal();
    $('pw').select();
  });
  $('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pw = $('pw').value.trim();
    if (!/^\d{4}$/.test(pw)) { $('msg').textContent = '숫자 4자리로 넣어 주세요.'; return; }
    const btn = $('submit');
    btn.disabled = true;
    try {
      await adminApi('PUT', { body: { [field]: pw } });
      set(pw);
      dlg.close();
      toast(`${label}를 「${pw}」(으)로 바꿨어요`);
    } catch (err) {
      if (err.message !== '401') $('msg').textContent = err.message;
      else dlg.close();
    } finally {
      btn.disabled = false;
    }
  });
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

  // 입장 비밀번호·자료실 비밀번호: 지금 비밀번호를 보여 주고, 새로 넣고 저장하면 바로 바뀐다
  passwordDialog({
    id: 'gate', open: 'bar-gate', field: 'sitePassword', label: '입장 비밀번호',
    get: () => sitePassword, set: (v) => { sitePassword = v; },
    none: '아직 비밀번호가 없어서 아무도 들어올 수 없어요. 숫자 4자리로 정해 주세요.',
  });
  passwordDialog({
    id: 'notespw', open: 'bar-notespw', field: 'notesPassword', label: '자료실 비밀번호',
    get: () => notesPassword, set: (v) => { notesPassword = v; },
    none: '아직 자료실 비밀번호가 없어서 아무도 자료실에 들어갈 수 없어요. 입장 비밀번호와 다른 숫자 4자리로 정해 주세요.',
  });

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
setupMenuDrag();
setupTeacher();
renderMenubar([]);
if (!getPw()) load();
