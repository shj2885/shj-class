/* 도깨비 마우스 탐험대: 놀이터 여기저기에 나타나는 그림을 클릭·더블클릭하고, 과일을 끌어서 바구니에 넣는다.
   그림이 나올 때마다 자리가 바뀌어서 마우스를 움직이는 연습도 함께 된다. */
(() => {
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const pickOne = (a) => a[Math.floor(Math.random() * a.length)];

  const KINDS = {
    click: { prompt: '나타난 그림을 한 번 톡 눌러요!', items: ['⭐', '🍓', '🐞', '🦋', '🍩', '🐥', '🌻', '🍀', '🐠', '🍭'] },
    double: { prompt: '풍선을 빠르게 두 번 톡톡!', items: ['🎈'] },
    drag: { prompt: '과일을 꾹 누른 채 바구니까지 끌어요!', items: ['🍎', '🍐', '🍊', '🍇', '🍓', '🍌', '🍑', '🍉'] },
  };
  const MODES = [
    { id: 'click', face: '⭐', name: '한 번 클릭', sub: '톡 눌러요', plan: ['click'], each: 10, color: '#FFF1C2', dark: '#E8CB6A' },
    { id: 'double', face: '🎈', name: '더블클릭', sub: '톡톡 빠르게', plan: ['double'], each: 10, color: '#FFE3EC', dark: '#F5B3C8' },
    { id: 'drag', face: '🍎', name: '끌어서 놓기', sub: '바구니에 쏙', plan: ['drag'], each: 10, color: '#DDF5E9', dark: '#9ED9BC' },
    { id: 'all', face: '🌈', name: '모두 차례로', sub: '클릭→더블→끌기', plan: ['click', 'double', 'drag'], each: 5, color: '#E3F1FF', dark: '#A9CDF2' },
  ];
  // t: 그림 크기(px), gap: 더블클릭으로 쳐 주는 두 번 사이 시간(ms)
  const SIZES = [
    { id: 'big', face: '🐘', name: '큰 그림', sub: '처음 해요', t: 130, gap: 900, color: '#FFE3A5', dark: '#E8C478' },
    { id: 'mid', face: '🐰', name: '보통 그림', sub: '조금 해 봤어요', t: 96, gap: 700, color: '#D4F3E8', dark: '#9ED9C4' },
    { id: 'small', face: '🐭', name: '작은 그림', sub: '잘해요', t: 66, gap: 550, color: '#FFD9C2', dark: '#F0AE88' },
  ];

  // 저장은 이 기기 브라우저에만, 안 되면 그냥 넘어간다
  const store = {
    get(k, d) { try { const v = localStorage.getItem('mouse.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('mouse.' + k, JSON.stringify(v)); } catch {} },
  };
  let modeIdx = store.get('mode', 0);
  let sizeIdx = store.get('size', 0);
  if (!MODES[modeIdx]) modeIdx = 0;
  if (!SIZES[sizeIdx]) sizeIdx = 0;
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
    hit: () => tone([700, 1050], 'triangle', 0.14, 0.06),
    half: () => tone([520], 'sine', 0.08),
    pop: () => tone([900, 1300, 600], 'square', 0.06, 0.04),
    grab: () => tone([440], 'sine', 0.06),
    miss: () => tone([220], 'sine', 0.08),
    next: () => tone([523, 784], 'triangle', 0.12, 0.1),
    end: () => tone([523, 659, 784, 1047], 'triangle', 0.15, 0.12),
  };

  /* ---------- 준비 화면 ---------- */
  const modesEl = $('#modes'), sizesEl = $('#sizes');
  const card = (cls, o, onPick) => {
    const b = el('button', cls);
    b.style.setProperty('--c', o.color); b.style.setProperty('--cd', o.dark);
    b.innerHTML = `<b>${o.face}</b><strong>${o.name}</strong><span>${o.sub}</span><span class="best"></span>`;
    b.onclick = onPick;
    return b;
  };
  MODES.forEach((m, i) => modesEl.appendChild(card('mode', m, () => { modeIdx = i; store.set('mode', i); paintSetup(); })));
  SIZES.forEach((s, i) => sizesEl.appendChild(card('tm', s, () => { sizeIdx = i; store.set('size', i); paintSetup(); })));
  const clock = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  function paintSetup() {
    [...modesEl.children].forEach((b, i) => { b.classList.toggle('on', i === modeIdx); b.querySelector('.best').hidden = true; });
    [...sizesEl.children].forEach((b, i) => {
      b.classList.toggle('on', i === sizeIdx);
      const best = store.get(`best.${MODES[modeIdx].id}.${SIZES[i].id}`, 0);
      const tag = b.querySelector('.best');
      tag.textContent = best ? `🏆 ${clock(best)}` : '';
      tag.hidden = !best;
    });
  }

  /* ---------- 게임 ---------- */
  const stage = $('#stage'), promptEl = $('#prompt');
  let G = null, timerT = 0, toastT = 0;

  function toast(text, ms = 1300) {
    const t = $('#toast');
    t.textContent = text; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms);
  }
  function spark(x, y, icon) {
    const s = el('span', 'spark', icon);
    s.style.left = x + 'px'; s.style.top = y + 'px';
    stage.appendChild(s); setTimeout(() => s.remove(), 750);
  }

  function start() {
    const mode = MODES[modeIdx], size = SIZES[sizeIdx];
    // 해야 할 차례: 예) 모두 차례로 = 클릭 5번, 더블클릭 5번, 끌기 5번
    const queue = mode.plan.flatMap((k) => Array(mode.each).fill(k));
    G = { mode, size, queue, i: 0, misses: 0, startAt: Date.now(), done: false, last: null, lastDown: 0 };
    $('#pop').hidden = true;
    $('#setup').hidden = true; $('#game').hidden = false;
    document.body.classList.add('playing');
    $('#goal').textContent = ' / ' + queue.length;
    clearInterval(timerT);
    timerT = setInterval(() => { if (G && !G.done) $('#time').textContent = clock(Math.floor((Date.now() - G.startAt) / 1000)); }, 250);
    $('#time').textContent = '0:00';
    paintCount();
    window.scrollTo(0, 0);
    requestAnimationFrame(next);
  }
  function paintCount() {
    $('#done').textContent = G.i;
  }

  // 그림 크기는 놀이터가 작으면 줄인다
  const sizePx = () => Math.round(Math.min(G.size.t, stage.clientWidth / 4.2, stage.clientHeight / 3.4));
  // 놀이터 안에서 안내 글·마우스 그림을 피해 빈자리를 고른다. far: 이 점에서 멀리
  function spot(t, far, minDist) {
    const W = stage.clientWidth, H = stage.clientHeight, m = t * 0.75;
    // 마우스 그림과 안내 글 자리는 피한다
    const sr = stage.getBoundingClientRect();
    const avoid = [$('#mouseCard'), promptEl].map((e) => { const r = e.getBoundingClientRect(); return [r.left - sr.left, r.top - sr.top, r.right - sr.left, r.bottom - sr.top]; });
    let best = null, bestD = -1;
    for (let k = 0; k < 80; k++) {
      const x = m + Math.random() * Math.max(1, W - m * 2);
      const y = m + Math.random() * Math.max(1, H - m * 2);
      const g = t / 2 + 10;
      if (avoid.some(([l, tp, r, b]) => x > l - g && x < r + g && y > tp - g && y < b + g)) continue;
      const d = far ? Math.hypot(x - far[0], y - far[1]) : 1e9;
      if (d >= minDist) return [x, y];
      if (d > bestD) { bestD = d; best = [x, y]; }
    }
    return best || [W / 2, H / 2];
  }

  function next() {
    if (!G) return;
    stage.querySelectorAll('.target, .basket').forEach((e) => e.remove());
    if (G.i >= G.queue.length) { finish(); return; }
    const kind = G.queue[G.i], t = sizePx();
    if (G.i > 0 && G.queue[G.i - 1] !== kind) { toast(kind === 'double' ? '🎈 이제 더블클릭이에요!' : '🍎 이제 끌어서 놓기예요!', 1600); snd.next(); }
    promptEl.textContent = KINDS[kind].prompt;
    stage.style.setProperty('--t', t + 'px');
    const W = stage.clientWidth, H = stage.clientHeight;
    const [x, y] = spot(t, G.last, Math.min(W, H) * 0.35);
    G.last = [x, y];
    const b = el('button', 'target ' + (kind === 'click' ? 'star' : kind === 'double' ? 'balloon' : 'fruit'), pickOne(KINDS[kind].items));
    b.type = 'button';
    b.style.left = x + 'px'; b.style.top = y + 'px';
    if (kind === 'double') b.style.filter = `hue-rotate(${pickOne([0, 60, 140, 200, 270])}deg) drop-shadow(0 6px 4px rgba(70, 81, 106, .18))`;
    b.setAttribute('aria-label', kind === 'click' ? '한 번 누를 그림' : kind === 'double' ? '두 번 누를 풍선' : '끌어서 옮길 과일');
    G.lastDown = 0;
    if (kind === 'drag') {
      const [bx, by] = spot(t * 1.6, [x, y], Math.min(W, H) * 0.45);
      const basket = el('div', 'basket', '🧺');
      basket.style.left = bx + 'px'; basket.style.top = by + 'px';
      stage.appendChild(basket);
      G.home = [x, y];
      b.addEventListener('pointerdown', (e) => grab(e, b, basket));
    } else {
      b.addEventListener('pointerdown', (e) => press(e, b, kind));
    }
    stage.appendChild(b);
  }

  function hit(b, icon) {
    b.classList.add('bye');
    spark(parseFloat(b.style.left), parseFloat(b.style.top), icon);
    G.i++;
    paintCount();
    const chip = $('.chip.done'); chip.classList.remove('up'); void chip.offsetWidth; chip.classList.add('up');
    if (G.i < G.queue.length && Math.random() < 0.35) toast(pickOne(['멋져요! ⭐', '잘했어요! 🌈', '최고예요! 🎉', '좋아요! 👍']), 900);
    setTimeout(next, 320);
  }
  function miss(text) {
    if (!G || G.done) return;
    G.misses++;
    snd.miss();
    toast(text);
  }

  // 한 번 클릭과 더블클릭: 왼쪽 버튼을 누를 때 센다
  function press(e, b, kind) {
    e.stopPropagation();
    if (!G || G.done || b.classList.contains('bye')) return;
    pulse(e.button);
    if (e.button !== 0) { miss('왼쪽 버튼으로 눌러요!'); return; }
    if (kind === 'click') { snd.hit(); hit(b, '✨'); return; }
    const now = performance.now();
    if (G.lastDown && now - G.lastDown <= G.size.gap) { snd.pop(); hit(b, '💥'); return; }
    if (G.lastDown) toast('조금 더 빠르게 톡톡!', 1100);
    G.lastDown = now;
    b.classList.add('half');
    snd.half();
    clearTimeout(G.halfT);
    G.halfT = setTimeout(() => b.classList.remove('half'), G.size.gap);
  }

  // 끌어서 놓기: 과일을 누른 채 움직이고, 바구니 위에서 놓으면 성공
  function grab(e, b, basket) {
    e.stopPropagation();
    if (!G || G.done || b.classList.contains('bye')) return;
    pulse(e.button);
    if (e.button !== 0) { miss('왼쪽 버튼을 꾹 눌러요!'); return; }
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    b.classList.add('dragging');
    snd.grab();
    const r = stage.getBoundingClientRect();
    const dx = parseFloat(b.style.left) - (e.clientX - r.left), dy = parseFloat(b.style.top) - (e.clientY - r.top);
    const over = (ev) => {
      const k = basket.getBoundingClientRect(), pad = 14;
      const fx = ev.clientX + dx, fy = ev.clientY + dy; // 과일 가운데
      return fx > k.left - pad && fx < k.right + pad && fy > k.top - pad && fy < k.bottom + pad;
    };
    const moveTo = (ev) => {
      const x = Math.min(r.width, Math.max(0, ev.clientX - r.left + dx)), y = Math.min(r.height, Math.max(0, ev.clientY - r.top + dy));
      b.style.left = x + 'px'; b.style.top = y + 'px';
      basket.classList.toggle('ready', over(ev));
    };
    const end = (ev) => {
      b.removeEventListener('pointermove', moveTo);
      b.removeEventListener('pointerup', end);
      b.removeEventListener('pointercancel', end);
      b.classList.remove('dragging');
      if (!G || G.done) return;
      if (ev.type === 'pointerup' && over(ev)) {
        b.style.left = basket.style.left; b.style.top = basket.style.top;
        snd.hit(); hit(b, '😋');
        basket.classList.add('bye');
        return;
      }
      basket.classList.remove('ready');
      // 바구니 밖에서 놓으면 제자리로
      b.style.left = G.home[0] + 'px'; b.style.top = G.home[1] + 'px';
      const moved = Math.hypot(ev.clientX - r.left + dx - G.home[0], ev.clientY - r.top + dy - G.home[1]);
      if (moved > 20) miss('바구니 안에 쏙 놓아요!');
      else toast('버튼을 꾹 누른 채로 끌어요!');
    };
    b.addEventListener('pointermove', moveTo);
    b.addEventListener('pointerup', end);
    b.addEventListener('pointercancel', end);
  }

  // 빈 곳을 누르면 놓친 것
  stage.addEventListener('pointerdown', (e) => {
    if (!G || G.done) return;
    pulse(e.button);
    miss(e.button === 0 ? '그림 위를 눌러요!' : '왼쪽 버튼으로 눌러요!');
  });
  stage.addEventListener('contextmenu', (e) => e.preventDefault());
  stage.addEventListener('dblclick', (e) => e.preventDefault());

  // 왼쪽 아래 마우스 그림에 누른 버튼을 보여 준다
  let pulseT = 0;
  function pulse(button) {
    const c = $('#mouseCard');
    c.classList.remove('left', 'right');
    c.classList.add(button === 2 ? 'right' : 'left');
    $('#mouseText').textContent = button === 2 ? '오른쪽 버튼!' : '왼쪽 버튼';
    clearTimeout(pulseT);
    pulseT = setTimeout(() => { c.classList.remove('left', 'right'); $('#mouseText').textContent = '왼쪽 버튼'; }, 450);
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
  function finish() {
    if (!G || G.done) return;
    G.done = true;
    clearInterval(timerT);
    const sec = Math.max(1, Math.round((Date.now() - G.startAt) / 1000));
    $('#time').textContent = clock(sec);
    promptEl.textContent = '🎉 다 했어요!';
    const stars = G.misses === 0 ? 3 : G.misses <= 3 ? 2 : 1;
    $('#popStars').textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
    $('#popTitle').textContent = `${G.mode.face} ${G.mode.name} 탐험 성공!`;
    $('#stats').innerHTML = '';
    [['🎯 해낸 것', G.queue.length], ['⏱️ 걸린 시간', clock(sec)], ['😮 놓친 것', G.misses]].forEach(([k, v]) => {
      const d = el('div'); d.append(el('b', '', v), el('span', '', k)); $('#stats').appendChild(d);
    });
    let msg = G.misses ? '천천히 그림 위를 정확히 누르면 별이 더 많아져요.' : '한 번도 안 놓쳤어요! 마우스 박사예요!';
    const key = `best.${G.mode.id}.${G.size.id}`, best = store.get(key, 0);
    if (!best || sec < best) { store.set(key, sec); if (best) msg += ' 🏆 새 기록!'; }
    else msg += ` 내 최고 기록은 ${clock(best)}!`;
    $('#popMsg').textContent = msg;
    $('#pop').hidden = false;
    snd.end();
    confetti();
  }
  function toSetup() {
    G = null;
    clearInterval(timerT); clearTimeout(toastT);
    stage.querySelectorAll('.target, .basket').forEach((e) => e.remove());
    $('#pop').hidden = true;
    $('#game').hidden = true; $('#setup').hidden = false;
    document.body.classList.remove('playing');
    paintSetup();
  }

  /* ---------- 버튼 ---------- */
  $('#start').onclick = start;
  $('#again').onclick = start;
  $('#other').onclick = toSetup;
  $('#stop').onclick = toSetup;
  const soundBtn = $('#sound');
  const paintSound = () => { soundBtn.setAttribute('aria-pressed', soundOn); soundBtn.textContent = soundOn ? '🔊 소리' : '🔇 소리'; };
  soundBtn.onclick = () => { soundOn = !soundOn; store.set('sound', soundOn); paintSound(); };
  paintSound();
  paintSetup();
})();
