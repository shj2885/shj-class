// 첫 화면: /api/links 에서 링크를 받아 '오늘 쓸 사이트'와 네 묶음으로 그린다.
const CATS = [
  { key: 'ai', word: 'AI', ko: 'AI 도구' },
  { key: 'design', word: 'DESIGN', ko: '디자인·이미지 도구' },
  { key: 'class', word: 'CLASS', ko: '수업 자료·과제' },
  { key: 'collab', word: 'SHARE', ko: '협업·저장 도구' },
];

const ARROW = '<svg class="go" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>';

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

function linkNode(item, cls) {
  const u = safeUrl(item.url);
  if (!u) return null;
  const host = u.hostname.replace(/^www\./, '');
  const a = el('a', {
    class: cls, href: u.href, target: '_blank', rel: 'noopener noreferrer',
    'data-cat': item.category,
    title: CATS.find((c) => c.key === item.category)?.ko || '',
    'aria-label': `${item.name} (${host}) 새 탭에서 열기`,
  }, [
    el('span', { class: 'mark', 'aria-hidden': 'true', text: [...item.name.trim()][0]?.toUpperCase() || '·' }),
    el('span', {}, [
      el('span', { class: 'name', text: item.name }),
      el('span', { class: 'meta', text: host }),
    ]),
  ]);
  a.insertAdjacentHTML('beforeend', ARROW);
  return el('li', {}, [a]);
}

function render(links) {
  const today = links.filter((l) => l.today);
  const todayList = document.getElementById('today-list');
  const todayEmpty = document.getElementById('today-empty');
  todayList.replaceChildren(...today.map((l) => linkNode(l, 'today-card')).filter(Boolean));
  if (!today.length) {
    todayEmpty.textContent = links.length
      ? '오늘 쓸 사이트가 아직 없어요. 아래 묶음에서 골라 들어가세요.'
      : '등록된 사이트가 아직 없어요. 사이트가 올라오면 여기에 나타나요.';
    todayEmpty.hidden = false;
  } else {
    todayEmpty.hidden = true;
  }

  const wrap = document.getElementById('categories');
  wrap.replaceChildren(...CATS.map((cat) => {
    const items = links.filter((l) => l.category === cat.key);
    const list = items.length
      ? el('ul', { class: 'link-grid' }, items.map((l) => linkNode(l, 'link-item')).filter(Boolean))
      : el('p', { class: 'cat-empty', text: '이 묶음에는 아직 사이트가 없어요.' });
    return el('section', { class: 'cat', id: cat.key, 'data-cat': cat.key, 'aria-labelledby': `${cat.key}-title` }, [
      el('div', { class: 'cat-head' }, [
        el('p', { class: 'cat-word', 'aria-hidden': 'true', text: cat.word }),
        el('h2', { id: `${cat.key}-title`, text: cat.ko }),
      ]),
      list,
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

document.getElementById('foot-year').textContent = String(new Date().getFullYear());
load();
