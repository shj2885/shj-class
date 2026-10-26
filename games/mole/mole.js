/* 도깨비 두더지 잡기: 콕(클릭) → 콕콕(더블클릭) → 끌어서 바구니에(드래그) 마우스 연습 */
(() => {
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const pickOne = (a) => a[Math.floor(Math.random() * a.length)];

  // kinds: 1 = 콕(클릭), 2 = 콕콕(더블클릭), 3 = 끌어서 담기(드래그)
  const MODES = [
    { key: 'click', em: '1단계', face: '👆', name: '콕 누르기', desc: '두더지가 나오면\n한 번 콕!', kinds: [1], color: '#FFE3A5', dark: '#E8C478' },
    { key: 'dbl', em: '2단계', face: '✌️', name: '두 번 콕콕', desc: '빠르게\n두 번 콕콕!', kinds: [2], color: '#FFD3E0', dark: '#F0A9C0' },
    { key: 'drag', em: '3단계', face: '🧺', name: '끌어서 담기', desc: '꾹 누른 채\n바구니로 쏙!', kinds: [3], color: '#D9EEFF', dark: '#A3CDF0' },
    { key: 'mix', em: '도전', face: '🎲', name: '섞어서', desc: '말풍선을 보고\n알맞게 잡기!', kinds: [1, 1, 2, 3], color: '#E6DCFF', dark: '#BFAAF0' },
  ];
  const TIMES = [
    { s: 30, face: '🐣', name: '30초', sub: '짧게', color: '#FFE3A5', dark: '#E8C478' },
    { s: 60, face: '🐥', name: '1분', sub: '보통', color: '#D4F3E8', dark: '#9ED9C4' },
    { s: 180, face: '🐰', name: '3분', sub: '길게', color: '#FFD9C2', dark: '#F0AE88' },
    { s: 0, face: '🌱', name: '연습', sub: '시간 없이', color: '#E3F3FF', dark: '#A3CDF0' },
  ];
  const TAG = { 1: '콕!', 2: '콕콕!', 3: '🧺 바구니로!' };
  const TIP = {
    1: '두더지가 나오면 한 번 콕! 눌러요',
    2: '두더지를 빠르게 두 번 콕콕! 눌러요',
    3: '두더지를 꾹 누른 채로 바구니까지 끌고 가서 놓아요',
    mix: '말풍선을 잘 보고 알맞게 잡아요',
  };
  const UP_MS = { 1: 1900, 2: 2700, 3: 3800 };   // 1단계에서 두더지가 나와 있는 시간
  const PER_LEVEL = 6;                            // 몇 마리 잡으면 단계가 오르는지

  // 저장은 이 기기 브라우저에만, 안 되면 그냥 넘어간다
  const store = {
    get(k, d) { try { const v = localStorage.getItem('mole.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('mole.' + k, JSON.stringify(v)); } catch {} },
  };
  let modeIdx = store.get('mode', 0);
  let timeIdx = store.get('time', 0);
  if (!MODES[modeIdx]) modeIdx = 0;
  if (!TIMES[timeIdx]) timeIdx = 0;
  let soundOn = store.get('sound', true) !== false;

  /* ---------- 소리 ---------- */
  let ac;
  function tone(notes, type, vol, step) {
    if (!soundOn) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      notes.forEach((f, i) => {
        const o = ac.createOscillator(), g = ac.createGain();
        const t = ac.currentTime + i * (step || 0.09);
        o.type = type; o.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.2);
      });
    } catch {}
  }
  const snd = {
    up: () => tone([520], 'sine', 0.05),
    hit: (gold) => tone(gold ? [880, 1175, 1568] : [700, 1050], 'triangle', 0.16, 0.06),
    miss: () => tone([220], 'sine', 0.08),
    level: () => tone([523, 659, 784, 1047], 'triangle', 0.14),
    count: (go) => tone([go ? 880 : 440], 'square', 0.06),
    end: () => tone([784, 659, 784, 1047], 'triangle', 0.15, 0.13),
  };

  /* ---------- 두더지 그림 (도깨비 뿔 달린 두더지) ---------- */
  const MOLE_SVG = `<svg viewBox="0 0 100 110" aria-hidden="true">
    <path d="M50 6 L42 26 H58 Z" fill="var(--horn)" stroke="var(--hornD)" stroke-width="2" stroke-linejoin="round"/>
    <ellipse cx="14" cy="44" rx="7" ry="9" fill="var(--furD)"/><ellipse cx="86" cy="44" rx="7" ry="9" fill="var(--furD)"/>
    <ellipse cx="50" cy="70" rx="40" ry="46" fill="var(--fur)"/>
    <ellipse cx="50" cy="72" rx="27" ry="24" fill="var(--face)"/>
    <g class="eyes"><circle cx="35" cy="45" r="5.5" fill="#2B1B10"/><circle cx="65" cy="45" r="5.5" fill="#2B1B10"/>
      <circle cx="37" cy="43" r="1.9" fill="#fff"/><circle cx="67" cy="43" r="1.9" fill="#fff"/></g>
    <g class="dizzy" stroke="#2B1B10" stroke-width="3.5" stroke-linecap="round"><path d="M30 40l10 10M40 40l-10 10M60 40l10 10M70 40l-10 10"/></g>
    <circle cx="26" cy="60" r="6" fill="#FF8FB1" opacity=".55"/><circle cx="74" cy="60" r="6" fill="#FF8FB1" opacity=".55"/>
    <ellipse cx="50" cy="58" rx="8.5" ry="6.5" fill="#FF7FA3"/>
    <path d="M42 66 q8 7 16 0" fill="none" stroke="#2B1B10" stroke-width="2.5" stroke-linecap="round"/>
    <rect x="45.5" y="68" width="9" height="8" rx="2" fill="#fff" stroke="#2B1B10" stroke-width="1.5"/>
    <ellipse cx="27" cy="98" rx="11" ry="8" fill="var(--face)"/><ellipse cx="73" cy="98" rx="11" ry="8" fill="var(--face)"/>
  </svg>`;

  /* ---------- 준비 화면 ---------- */
  const modesEl = $('#modes'), timesEl = $('#times');
  const bestKey = (m, t) => 'best.' + MODES[m].key + '.' + TIMES[t].s;
  MODES.forEach((m, i) => {
    const b = el('button', 'mode');
    b.style.setProperty('--c', m.color); b.style.setProperty('--cd', m.dark);
    b.innerHTML = `<em>${m.em}</em><b>${m.face}</b><strong>${m.name}</strong><span>${m.desc.replace('\n', '<br>')}</span><span class="best"></span>`;
    b.onclick = () => { modeIdx = i; store.set('mode', i); paintSetup(); };
    modesEl.appendChild(b);
  });
  TIMES.forEach((t, i) => {
    const b = el('button', 'tm');
    b.style.setProperty('--c', t.color); b.style.setProperty('--cd', t.dark);
    b.innerHTML = `<b>${t.face}</b><strong>${t.name}</strong><span>${t.sub}</span>`;
    b.onclick = () => { timeIdx = i; store.set('time', i); paintSetup(); };
    timesEl.appendChild(b);
  });
  function paintSetup() {
    [...modesEl.children].forEach((b, i) => {
      b.classList.toggle('on', i === modeIdx);
      const best = TIMES[timeIdx].s ? store.get(bestKey(i, timeIdx), 0) : 0;
      const tag = b.querySelector('.best');
      tag.textContent = best ? `🏆 ${best}점` : '';
      tag.hidden = !best;
    });
    [...timesEl.children].forEach((b, i) => b.classList.toggle('on', i === timeIdx));
  }
  paintSetup();

  /* ---------- 잔디밭 구멍 9개 ---------- */
  const yard = $('#yard'), basket = $('#basket');
  const holes = [];
  for (let i = 0; i < 9; i++) {
    const h = el('div', 'hole');
    const pit = el('div', 'pit');
    const mole = el('div', 'mole');
    mole.innerHTML = MOLE_SVG;
    const tag = el('span', 'tag');
    pit.appendChild(mole);
    h.append(pit, tag);
    yard.appendChild(h);
    const o = { el: h, mole, tag, i, state: 'down', kind: 1, gold: false, timer: 0, freeAt: 0, lastTap: 0 };
    mole.dataset.i = i;
    holes.push(o);
  }

  /* ---------- 게임 상태 ---------- */
  let G = null; // 하는 중일 때만 있음

  function start() {
    const mode = MODES[modeIdx], time = TIMES[timeIdx];
    G = {
      mode, time, total: time.s * 1000, startAt: 0, running: false,
      score: 0, caught: 0, misses: 0, escaped: 0, level: 1, bestLevel: 1,
      spawnT: 0, clockT: 0, lastHole: -1, drag: null, ignoreClickUntil: 0,
    };
    holes.forEach(reset);
    $('#setup').hidden = true; $('#game').hidden = false; $('#pop').hidden = true;
    document.body.classList.add('playing');
    basket.hidden = !mode.kinds.includes(3);
    $('#basketCount').textContent = '0';
    $('#score').textContent = '0'; $('#level').textContent = '1';
    $('#time').textContent = time.s ? clock(time.s * 1000) : '0:00';
    $('.chip.time').classList.remove('hurry');
    tip(mode.kinds.length > 1 ? TIP.mix : TIP[mode.kinds[0]]);
    countdown(() => {
      if (!G) return;
      G.running = true; G.startAt = performance.now();
      G.clockT = setInterval(tickClock, 200);
      schedule(500);
    });
  }

  function countdown(done) {
    const box = $('#count'), num = $('#countNum');
    let n = 3;
    box.hidden = false;
    const step = () => {
      if (!G) { box.hidden = true; return; }
      if (n === 0) { box.hidden = true; snd.count(true); done(); return; }
      num.textContent = n; num.style.animation = 'none'; void num.offsetWidth; num.style.animation = '';
      snd.count(false);
      n--; setTimeout(step, 700);
    };
    step();
  }

  const clock = (ms) => { const s = Math.ceil(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  function tickClock() {
    if (!G || !G.running) return;
    const used = performance.now() - G.startAt;
    if (!G.total) { $('#time').textContent = clock(used); return; }
    const left = Math.max(0, G.total - used);
    $('#time').textContent = clock(left);
    $('.chip.time').classList.toggle('hurry', left <= 10000);
    if (left <= 0) finish(true);
  }

  // 단계가 오를수록 빨리 숨고, 자주 나오고, 여러 마리가 함께 나온다
  const speed = () => Math.max(0.45, 1 - (G.level - 1) * 0.08);
  function maxUp() {
    const drag = G.mode.kinds.length === 1 && G.mode.kinds[0] === 3;
    if (drag) return G.level < 4 ? 1 : 2;
    return G.level < 3 ? 1 : G.level < 6 ? 2 : 3;
  }
  function schedule(ms) {
    clearTimeout(G.spawnT);
    G.spawnT = setTimeout(() => {
      if (!G || !G.running) return;
      const busy = holes.filter((h) => h.state !== 'down').length;
      if (busy < maxUp()) spawn();
      schedule((650 + Math.random() * 700) * speed());
    }, ms);
  }

  function spawn() {
    const now = performance.now();
    const free = holes.filter((h) => h.state === 'down' && h.freeAt <= now && h.i !== G.lastHole);
    if (!free.length) return;
    const h = pickOne(free);
    G.lastHole = h.i;
    h.kind = pickOne(G.mode.kinds);
    h.gold = G.level >= 2 && Math.random() < 0.12;
    h.state = 'up'; h.lastTap = 0;
    h.mole.classList.toggle('gold', h.gold);
    h.tag.textContent = (h.gold ? '✨ ' : '') + TAG[h.kind];
    h.tag.className = 'tag k' + h.kind;
    h.el.classList.add('up');
    snd.up();
    h.timer = setTimeout(() => escape(h), UP_MS[h.kind] * speed());
  }

  function escape(h) {
    if (h.state !== 'up') return;
    G.escaped++;
    down(h);
  }
  function down(h, delay) {
    clearTimeout(h.timer);
    const go = () => {
      h.el.classList.remove('up', 'hit', 'carried', 'once');
      h.state = 'down';
      h.freeAt = performance.now() + 450;
    };
    if (delay) { h.timer = setTimeout(go, delay); } else go();
  }
  function reset(h) {
    clearTimeout(h.timer);
    h.el.classList.remove('up', 'hit', 'carried', 'once');
    h.state = 'down'; h.freeAt = 0;
  }

  function catchIt(h, x, y, viaBasket) {
    clearTimeout(h.timer);
    const pts = h.gold ? 3 : 1;
    G.score += pts; G.caught++;
    $('#score').textContent = G.score;
    fx(x, y, '+' + pts, 'plus' + (h.gold ? ' gold' : ''));
    snd.hit(h.gold);
    if (viaBasket) { down(h); }
    else { h.state = 'hit'; h.el.classList.add('hit'); down(h, 380); }
    if (G.caught % PER_LEVEL === 0) levelUp();
  }
  function levelUp() {
    if (!G.total && G.level >= 3) return; // 연습은 3단계까지만 빨라진다
    G.level++; G.bestLevel = Math.max(G.bestLevel, G.level);
    $('#level').textContent = G.level;
    const chip = $('.chip.level');
    chip.classList.remove('up'); void chip.offsetWidth; chip.classList.add('up');
    tip(`🚀 ${G.level}단계! 두더지가 더 빨라져요`);
    snd.level();
  }
  function miss(x, y) {
    G.misses++;
    fx(x, y, '앗!', 'miss');
    snd.miss();
  }

  /* ---------- 누르기 판정 ---------- */
  const holeOf = (t) => { const m = t.closest && t.closest('.mole'); return m ? holes[+m.dataset.i] : null; };

  // 콕(클릭): click 이벤트로 판정
  yard.addEventListener('click', (e) => {
    if (!G || !G.running || performance.now() < G.ignoreClickUntil) return;
    const h = holeOf(e.target);
    if (!h || h.state === 'down') { hammer(e.clientX, e.clientY); miss(e.clientX, e.clientY); return; }
    if (h.state !== 'up') return;
    if (h.kind === 1) { hammer(e.clientX, e.clientY); catchIt(h, e.clientX, e.clientY); }
    else if (h.kind === 2 && e.detail < 2) {
      h.el.classList.remove('once'); void h.el.offsetWidth; h.el.classList.add('once');
      fx(e.clientX, e.clientY, '한 번 더!', 'miss');
    } else if (h.kind === 3) {
      tip('🧺 두더지를 꾹 누른 채로 바구니까지 끌어요');
    }
  });

  // 콕콕(더블클릭): 마우스는 dblclick 이벤트, 손가락은 두 번 톡톡 사이 시간으로
  yard.addEventListener('dblclick', (e) => {
    if (!G || !G.running) return;
    const h = holeOf(e.target);
    if (h && h.state === 'up' && h.kind === 2) { hammer(e.clientX, e.clientY); catchIt(h, e.clientX, e.clientY); }
  });

  yard.addEventListener('pointerdown', (e) => {
    if (!G || !G.running) return;
    const h = holeOf(e.target);
    if (!h || h.state !== 'up') return;
    if (h.kind === 2 && e.pointerType !== 'mouse') {
      const now = performance.now();
      if (now - h.lastTap < 500) { hammer(e.clientX, e.clientY); catchIt(h, e.clientX, e.clientY); }
      h.lastTap = now;
    }
    if (h.kind === 3) startDrag(h, e);
  });

  /* ---------- 끌어서 담기(드래그) ---------- */
  function startDrag(h, e) {
    e.preventDefault();
    clearTimeout(h.timer);
    const r = h.mole.getBoundingClientRect();
    const f = el('div', 'flyer' + (h.gold ? ' gold' : ''));
    f.innerHTML = MOLE_SVG;
    f.style.width = r.width + 'px'; f.style.height = r.height + 'px';
    document.body.appendChild(f);
    G.drag = { h, f, id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top, home: r, x: e.clientX, y: e.clientY };
    h.state = 'carried'; h.el.classList.add('carried');
    moveFlyer(e.clientX, e.clientY);
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragEnd);
    window.addEventListener('pointercancel', onDragEnd);
  }
  function moveFlyer(x, y) {
    const d = G.drag;
    d.x = x; d.y = y;
    d.f.style.transform = `translate(${x - d.dx}px, ${y - d.dy}px) scale(1.08)`;
    basket.classList.toggle('near', overBasket(x, y));
  }
  function overBasket(x, y) {
    if (basket.hidden) return false;
    const b = basket.getBoundingClientRect(), pad = 24;
    return x > b.left - pad && x < b.right + pad && y > b.top - pad && y < b.bottom + pad;
  }
  function onDragMove(e) {
    if (G && G.drag && e.pointerId === G.drag.id) moveFlyer(e.clientX, e.clientY);
  }
  function onDragEnd(e) {
    if (!G || !G.drag || e.pointerId !== G.drag.id) return;
    endDrag(e.type === 'pointerup' && overBasket(e.clientX, e.clientY));
  }
  function endDrag(inBasket) {
    const d = G.drag;
    G.drag = null;
    G.ignoreClickUntil = performance.now() + 80;
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onDragEnd);
    window.removeEventListener('pointercancel', onDragEnd);
    basket.classList.remove('near');
    const { h, f } = d;
    if (!G.running) { f.remove(); return; }
    if (inBasket) {
      const b = basket.getBoundingClientRect();
      f.classList.add('into');
      f.style.transform = `translate(${b.left + b.width / 2 - d.home.width * 0.2}px, ${b.top + b.height * 0.3}px) scale(.4)`;
      setTimeout(() => f.remove(), 300);
      basket.classList.remove('gulp'); void basket.offsetWidth; basket.classList.add('gulp');
      $('#basketCount').textContent = +$('#basketCount').textContent + 1;
      catchIt(h, d.x, d.y, true);
    } else {
      // 바구니 밖에 놓으면 구멍으로 돌아가고 조금 더 기다려 준다
      miss(d.x, d.y);
      tip('🧺 바구니 위에서 손가락을 떼요');
      f.classList.add('home');
      f.style.transform = `translate(${d.home.left}px, ${d.home.top}px)`;
      setTimeout(() => {
        f.remove();
        if (!G || h.state !== 'carried') return;
        h.state = 'up'; h.el.classList.remove('carried');
        h.timer = setTimeout(() => escape(h), 1500);
      }, 260);
    }
  }

  /* ---------- 효과 ---------- */
  function fx(x, y, text, cls) {
    const f = el('div', 'fx ' + (cls || ''), text);
    f.style.left = x + 'px'; f.style.top = (y - 20) + 'px';
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 750);
  }
  function hammer(x, y) {
    const m = el('div', 'ham', '🔨');
    m.style.left = (x - 44) + 'px'; m.style.top = (y - 50) + 'px';
    document.body.appendChild(m);
    setTimeout(() => m.remove(), 280);
  }
  let tipT = 0;
  function tip(text) {
    const t = $('#tip');
    t.textContent = text;
    clearTimeout(tipT);
    const base = G ? (G.mode.kinds.length > 1 ? TIP.mix : TIP[G.mode.kinds[0]]) : '';
    if (text !== base) tipT = setTimeout(() => { if (G) t.textContent = base; }, 2600);
  }
  function confetti() {
    const box = $('#confetti');
    const colors = ['#FF8FB1', '#FFD45C', '#5FD0B0', '#7CC4FF', '#B79CFF'];
    for (let i = 0; i < 70; i++) {
      const c = el('i');
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = pickOne(colors);
      c.style.animationDuration = 1.6 + Math.random() * 1.6 + 's';
      c.style.animationDelay = Math.random() * 0.5 + 's';
      box.appendChild(c);
      setTimeout(() => c.remove(), 4000);
    }
  }

  /* ---------- 끝 ---------- */
  function stopAll() {
    if (!G) return;
    G.running = false;
    clearTimeout(G.spawnT); clearInterval(G.clockT);
    if (G.drag) endDrag(false);
    holes.forEach(reset);
  }
  function finish(timeUp) {
    if (!G || !G.running) return;
    stopAll();
    const tries = G.caught + G.misses;
    const acc = tries ? Math.round((G.caught / tries) * 100) : 0;
    const stars = !G.caught ? 1 : acc >= 90 && G.caught >= 5 ? 3 : acc >= 70 ? 2 : 1;
    $('#popStars').textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
    $('#popTitle').textContent = !G.caught ? '다시 해 볼까요?' : stars === 3 ? '최고예요!' : stars === 2 ? '잘했어요!' : '좋아요!';
    $('#stats').innerHTML = '';
    [['⭐ 점수', G.score], ['🎯 정확도', tries ? acc + '%' : '-'], ['🚀 단계', G.bestLevel]].forEach(([k, v]) => {
      const d = el('div'); d.append(el('b', '', v), el('span', '', k)); $('#stats').appendChild(d);
    });
    let msg = `두더지 ${G.caught}마리를 잡았어요.`;
    if (G.time.s) {
      const key = bestKey(modeIdx, timeIdx), best = store.get(key, 0);
      if (G.score > best) { store.set(key, G.score); if (best) msg += ' 🏆 새 기록!'; }
      else msg += ` 내 최고는 ${best}점!`;
    }
    if (G.misses > G.caught && G.caught) msg += ' 천천히 정확하게 눌러 봐요.';
    $('#popMsg').textContent = msg;
    $('#pop').hidden = false;
    if (timeUp) snd.end();
    if (stars >= 2) confetti();
  }
  function toSetup() {
    stopAll();
    G = null;
    $('#pop').hidden = true; $('#count').hidden = true;
    $('#game').hidden = true; $('#setup').hidden = false;
    document.body.classList.remove('playing');
    paintSetup();
  }

  /* ---------- 버튼 ---------- */
  $('#start').onclick = start;
  $('#again').onclick = start;
  $('#other').onclick = toSetup;
  $('#stop').onclick = () => { if (G && G.running && G.caught) finish(false); else toSetup(); };
  const soundBtn = $('#sound');
  const paintSound = () => { soundBtn.setAttribute('aria-pressed', soundOn); soundBtn.textContent = soundOn ? '🔊 소리' : '🔇 소리'; };
  soundBtn.onclick = () => { soundOn = !soundOn; store.set('sound', soundOn); paintSound(); };
  paintSound();
})();
