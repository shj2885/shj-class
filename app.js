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

// 이 컴퓨터에서 관리자로 들어간 적이 있으면 '+ 사이트 추가' 버튼을 보여 준다(학생 컴퓨터에는 안 보임).
// 버튼은 관리자 화면의 그 칸으로 데려갈 뿐이고, 추가하려면 여전히 비밀번호가 필요하다.
const IS_ADMIN = (() => { try { return localStorage.getItem('kd-admin') === '1'; } catch { return false; } })();
const addLink = (menu, sub, label) => el('a', {
  class: 'add-btn',
  href: `/admin?menu=${encodeURIComponent(menu.key)}${sub ? `&sub=${encodeURIComponent(sub)}` : ''}`,
  'aria-label': sub ? `${menu.ko} > ${sub}에 사이트 추가` : `${menu.ko}에 사이트 추가`,
  text: label,
});
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
    return el('li', {}, [a]);
  }

  const a = el('a', attrs, [
    el('span', { class: 'mark', 'aria-hidden': 'true', text: initial(item.name) }),
    el('span', {}, [
      el('span', { class: 'name', text: item.name }),
      el('span', { class: 'meta', text: host }),
    ]),
  ]);
  a.insertAdjacentHTML('beforeend', ARROW);
  return el('li', {}, [a]);
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
    const body = groups.length
      ? [el('div', { class: 'subs' }, groups.map((g) => el('div', { class: 'sub', id: g.id }, [
        el('div', { class: 'sub-head' }, [
          el('h3', {}, [el('span', { text: g.title }), el('span', { class: 'sub-count', text: String(g.items.length) })]),
          IS_ADMIN && menu.subs.includes(g.title) ? addLink(menu, g.title, '+ 추가') : null,
        ]),
        el('ul', { class: 'link-grid' }, g.items.map((l) => linkNode(l, 'link-item')).filter(Boolean)),
      ])))]
      : [el('p', { class: 'cat-empty', text: '이 메뉴에는 아직 사이트가 없어요.' })];
    return el('section', { class: 'cat', id: menu.key, 'data-density': density, 'aria-labelledby': `${menu.key}-title` }, [
      el('div', { class: 'cat-head' }, [
        el('span', { class: 'cat-emoji', 'aria-hidden': 'true', text: menu.emoji }),
        el('h2', { id: `${menu.key}-title`, text: menu.ko }),
        IS_ADMIN ? addLink(menu, '', '+ 사이트 추가') : null,
      ]),
      ...body,
    ]);
  }));
}

async function load() {
  try {
    const r = await fetch('/api/links', { cache: 'no-store' });
    if (!r.ok) throw new Error(String(r.status));
    const { links } = await r.json();
    render(Array.isArray(links) ? links : []);
  } catch {
    render([]);
    document.getElementById('today-empty').hidden = true;
    document.getElementById('load-error').hidden = false;
  }
}

if (IS_ADMIN) {
  document.querySelector('.lede').after(el('p', { class: 'hero-admin' }, [
    el('a', { class: 'add-btn', href: '/admin', text: '+ 사이트 추가 · 오늘 수업 바꾸기' }),
  ]));
}
setupMenubar();
renderMenubar([]);
load();
