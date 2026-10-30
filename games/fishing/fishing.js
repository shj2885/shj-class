/* 도깨비 보물 낚시: 마우스를 옆으로 움직이면 배가 따라오고, 휠을 굴리면 낚싯줄이 오르내린다.
   보물 가까이에서 왼쪽 클릭하면 낚고, 쓰레기가 걸리면 오른쪽 클릭으로 버린다. */
(() => {
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const pickOne = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  const TREASURES = [
    { e: '🐚', name: '조개' }, { e: '💎', name: '보석' }, { e: '👑', name: '왕관' },
    { e: '💍', name: '반지' }, { e: '🏺', name: '항아리' }, { e: '💰', name: '돈주머니' },
  ];
  const TRASH = ['🥫', '🛍️', '👟', '🧴', '🧦'];
  // need: 보물 종류별 개수, trash: 쓰레기 수, t: 그림 크기(px), wheel: 휠 한 칸에 내려가는 정도, drift: 쓰레기가 떠다니는지
  const SEAS = [
    { id: 'easy', face: '🐠', name: '얕은 바다', sub: '처음 해요', need: [2, 1], trash: 2, t: 92, wheel: 1.4, drift: 0, color: '#D9F2FF', dark: '#9FD3F2' },
    { id: 'mid', face: '🐙', name: '보통 바다', sub: '조금 해 봤어요', need: [2, 2, 1], trash: 4, t: 76, wheel: 1.15, drift: 0, color: '#D4F3E8', dark: '#9ED9C4' },
    { id: 'hard', face: '🐋', name: '깊은 바다', sub: '잘해요', need: [3, 2, 2], trash: 6, t: 62, wheel: 1, drift: 1, color: '#E6E0FF', dark: '#B9ADF0' },
  ];
  const HOWS = [
    { want: 'wheel', name: '휠 굴리기', sub: '낚싯줄이 내려가고 올라와요', color: '#FFF1C2' },
    { want: 'left', name: '왼쪽 클릭', sub: '반짝이는 보물을 낚아요', color: '#FFE3EC' },
    { want: 'right', name: '오른쪽 클릭', sub: '걸린 쓰레기를 버려요', color: '#E3F1FF' },
  ];

  // 저장은 이 기기 브라우저에만, 안 되면 그냥 넘어간다
  const store = {
    get(k, d) { try { const v = localStorage.getItem('fishing.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('fishing.' + k, JSON.stringify(v)); } catch {} },
  };
  let seaIdx = store.get('sea', 0);
  if (!SEAS[seaIdx]) seaIdx = 0;
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
    catch: () => tone([600, 900], 'triangle', 0.13, 0.06),
    land: () => tone([784, 1047, 1319], 'triangle', 0.14, 0.08),
    snag: () => tone([300, 240], 'square', 0.05, 0.08),
    toss: () => tone([500, 350], 'sine', 0.1, 0.07),
    miss: () => tone([220], 'sine', 0.08),
    end: () => tone([523, 659, 784, 1047], 'triangle', 0.15, 0.12),
  };

  /* ---------- 마우스 그림 ---------- */
  const MOUSE_SVG = `<svg viewBox="0 0 80 124">
    <path class="mCable" d="M40 26 C40 12 50 6 58 10 C66 14 70 6 72 2"/>
    <path class="mBody" d="M40 24 C20 24 10 40 10 62 V84 C10 106 24 120 40 120 C56 120 70 106 70 84 V62 C70 40 60 24 40 24Z"/>
    <path class="mLeft" d="M40 26 C22 26 12 40 12 60 V64 H40Z"/>
    <path class="mRight" d="M40 26 C58 26 68 40 68 60 V64 H40Z"/>
    <path class="mSplit" d="M40 26 V64 M12 64 H68"/>
    <rect class="mWheel" x="34.5" y="34" width="11" height="20" rx="5.5"/>
    <ellipse class="mShine" cx="25" cy="88" rx="5" ry="12"/>
  </svg>`;
  const mouseCard = $('#mouseCard');
  mouseCard.innerHTML = MOUSE_SVG;

  /* ---------- 준비 화면 ---------- */
  const howsEl = $('#hows'), seasEl = $('#seas');
  HOWS.forEach((h) => {
    const d = el('div', 'how');
    d.style.setProperty('--c', h.color);
    d.innerHTML = `<div class="mouseCard want-${h.want}">${MOUSE_SVG}</div><div><strong>${h.name}</strong><span>${h.sub}</span></div>`;
    howsEl.appendChild(d);
  });
  SEAS.forEach((s, i) => {
    const b = el('button', 'tm');
    b.style.setProperty('--c', s.color); b.style.setProperty('--cd', s.dark);
    b.innerHTML = `<b>${s.face}</b><strong>${s.name}</strong><span>${s.sub}</span><span class="best"></span>`;
    b.onclick = () => { seaIdx = i; store.set('sea', i); paintSetup(); };
    seasEl.appendChild(b);
  });
  // 마우스가 없는 기기(휴대폰·태블릿)에는 안내를 보여 준다
  if (matchMedia('(hover: none) and (pointer: coarse)').matches) $('#touchNote').hidden = false;
  const clock = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  function paintSetup() {
    [...seasEl.children].forEach((b, i) => {
      b.classList.toggle('on', i === seaIdx);
      const best = store.get('best.' + SEAS[i].id, 0);
      const tag = b.querySelector('.best');
      tag.textContent = best ? `🏆 ${clock(best)}` : '';
      tag.hidden = !best;
    });
  }

  /* ---------- 게임 ---------- */
  const stage = $('#stage'), promptEl = $('#prompt');
  const boat = $('#boat'), line = $('#line'), hook = $('#hook');
  let G = null, timerT = 0, toastT = 0, raf = 0;
  // 놀이터 크기에 맞춘 자리: surface 물 높이, floor 모래 높이, t 그림 크기
  const geo = { W: 0, H: 0, surface: 0, floor: 0, t: 0 };

  function layout() {
    const W = stage.clientWidth, H = stage.clientHeight;
    const surface = Math.round(Math.max(128, H * 0.22));
    const sandH = Math.round(Math.max(44, H * 0.09));
    Object.assign(geo, { W, H, surface, floor: H - sandH });
    geo.t = G ? Math.round(Math.min(G.sea.t, W / 9, (geo.floor - surface) / 4.2)) : 0;
    $('#sea').style.top = surface + 'px';
    $('#sand').style.height = sandH + 'px';
    stage.style.setProperty('--t', geo.t + 'px');
  }
  // 물건 자리는 바다 안의 비율(0~1)로 두고, 그릴 때 px로 바꾼다
  const ix = (fx) => fx * geo.W;
  const iy = (fy) => geo.surface + fy * (geo.floor - geo.surface);
  const hookX = () => G.hx;
  const hookY = () => geo.surface + 8 + G.depth * (geo.floor - geo.surface - 30);
  const minHx = () => Math.min(geo.W / 2, 120);
  const maxHx = () => Math.max(geo.W / 2, geo.W - 30);

  function toast(text, ms = 1400) {
    const t = $('#toast');
    t.textContent = text; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms);
  }
  function spark(x, y, icon) {
    const s = el('span', 'spark', icon);
    s.style.left = x + 'px'; s.style.top = y + 'px';
    stage.appendChild(s); setTimeout(() => s.remove(), 850);
  }

  function start() {
    const sea = SEAS[seaIdx];
    stage.querySelectorAll('.item, .fish, .bubble, .spark').forEach((e) => e.remove());
    $('#pop').hidden = true;
    $('#setup').hidden = true; $('#game').hidden = false;
    document.body.classList.add('playing');
    guideKey = '';
    G = { sea, items: [], need: [], cleaned: 0, misses: 0, startAt: Date.now(), state: 'free', depth: 0, depthT: 0, hx: 0, hxT: 0, near: null, held: null, stuckHint: 0 };
    layout();
    G.hx = G.hxT = geo.W / 2;

    // 이번 판에 낚을 보물: 종류를 골라 개수만큼 바다에 넣는다
    const kinds = shuffle(TREASURES.slice()).slice(0, sea.need.length);
    G.need = kinds.map((k, i) => ({ ...k, want: sea.need[i], got: 0 }));
    const spots = placeAll(G.need.reduce((n, k) => n + k.want, 0) + sea.trash);
    let s = 0;
    G.need.forEach((k) => { for (let i = 0; i < k.want; i++) addItem('gem', k.e, spots[s++], k); });
    for (let i = 0; i < sea.trash; i++) addItem('trash', pickOne(TRASH), spots[s++]);
    paintMission();

    $('#cleaned').textContent = '0';
    $('#time').textContent = '0:00';
    clearInterval(timerT);
    timerT = setInterval(() => {
      if (!G || G.state === 'done') return;
      $('#time').textContent = clock(Math.floor((Date.now() - G.startAt) / 1000));
      if (Math.random() < 0.08) fish();
      if (Math.random() < 0.25) bubble();
    }, 1000);
    window.scrollTo(0, 0);
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  }

  // 서로 겹치지 않게 바다 곳곳에 자리를 고른다 (비율 좌표)
  function placeAll(n) {
    const out = [], t = geo.t, seaH = geo.floor - geo.surface;
    const x0 = (minHx() + 10) / geo.W, x1 = (geo.W - t * 0.7) / geo.W;
    const y0 = 0.16, y1 = 1 - (t * 0.6) / seaH;
    for (let k = 0; k < n; k++) {
      let best = null, bestD = -1;
      for (let a = 0; a < 120; a++) {
        const p = [x0 + Math.random() * (x1 - x0), y0 + Math.random() * (y1 - y0)];
        const d = Math.min(1e9, ...out.map((q) => Math.hypot((p[0] - q[0]) * geo.W, (p[1] - q[1]) * seaH)));
        if (d >= t * 1.7) { best = p; break; }
        if (d > bestD) { bestD = d; best = p; }
      }
      out.push(best);
    }
    return shuffle(out);
  }
  function addItem(kind, emoji, [fx, fy], gem) {
    const d = el('div', 'item ' + kind);
    const sp = el('span', '', emoji);
    sp.style.setProperty('--d', (-Math.random() * 2.4).toFixed(2) + 's');
    d.appendChild(sp);
    stage.appendChild(d);
    G.items.push({ kind, el: d, fx, fy, gem, ph: Math.random() * 6.28 });
  }
  function paintMission() {
    const box = $('#mission');
    box.innerHTML = '';
    G.need.forEach((k) => {
      const c = el('span', 'need' + (k.got >= k.want ? ' full' : ''));
      c.innerHTML = `<em>${k.e}</em>${k.got}/${k.want}`;
      c.title = k.name;
      box.appendChild(c);
      k.chip = c;
    });
  }

  // 물건 지금 자리(px): 깊은 바다의 쓰레기는 옆으로 천천히 떠다닌다
  function posOf(it, now) {
    let x = ix(it.fx);
    if (it.kind === 'trash' && G.sea.drift) x += Math.sin(now / 1400 + it.ph) * geo.t * 0.6;
    return [x, iy(it.fy)];
  }

  function tick(now) {
    if (!G) return;
    raf = requestAnimationFrame(tick);
    const ease = G.state === 'reel' ? 0.12 : 0.22;
    if (G.state === 'free') G.hx += (G.hxT - G.hx) * 0.18;
    if (G.state === 'reel') G.depthT = Math.max(0, G.depthT - 0.03);
    G.depth += (G.depthT - G.depth) * ease;
    const hx = hookX(), hy = hookY();

    // 배·줄·바늘 그리기 (줄은 낚싯대 끝에서 내려온다)
    const rodTop = geo.surface - 96;
    boat.style.left = hx - 55 + 'px'; boat.style.top = geo.surface + 10 + 'px';
    line.style.left = hx + 'px'; line.style.top = rodTop + 'px'; line.style.height = Math.max(0, hy - rodTop) + 'px';
    hook.style.left = hx + 'px'; hook.style.top = hy + 'px';
    const tip = [hx - 4, hy + 32]; // 바늘 끝: 물건이 걸리는 자리

    let near = null, nearD = Infinity;
    for (const it of G.items) {
      if (it === G.held) continue;
      const [x, y] = posOf(it, now);
      it.el.style.left = x + 'px'; it.el.style.top = y + 'px';
      if (G.state !== 'free') continue;
      const d = Math.hypot(x - tip[0], y - tip[1]);
      // 쓰레기에 바늘이 닿으면 걸린다
      if (it.kind === 'trash' && d < geo.t * 0.45) { snag(it); continue; }
      if (it.kind === 'gem' && d < geo.t * 0.75 && d < nearD) { near = it; nearD = d; }
    }
    if (G.held) { G.held.el.style.left = tip[0] + 'px'; G.held.el.style.top = tip[1] + 'px'; }
    if (near !== G.near) {
      if (G.near) G.near.el.classList.remove('glow');
      if (near) near.el.classList.add('glow');
      G.near = near;
    }
    if (G.state === 'reel' && G.depth < 0.015) land();
    paintGuide();
  }

  // 지금 써야 할 버튼을 안내 글과 마우스 그림으로 알려 준다
  let guideKey = '';
  function paintGuide() {
    const key = G.state === 'done' ? 'done' : G.state === 'stuck' ? 'stuck' : G.state === 'reel' ? 'reel' : G.near ? 'near' : G.depth < 0.05 ? 'top' : 'free';
    if (key === guideKey) return;
    guideKey = key;
    const [want, text] = {
      top: ['wheel', '휠을 아래로 굴려서 낚싯줄을 내려요 🎣'],
      free: ['wheel', '마우스를 옆으로 움직이면 배가 따라와요'],
      near: ['left', '보물이 반짝! 왼쪽 버튼을 톡 눌러요'],
      stuck: ['right', '앗, 쓰레기가 걸렸어요! 오른쪽 버튼으로 버려요'],
      reel: ['', '영차영차! 끌어올리는 중이에요'],
      done: ['', '🎉 보물을 다 낚았어요!'],
    }[key];
    promptEl.textContent = text;
    mouseCard.classList.remove('want-wheel', 'want-left', 'want-right');
    if (want) mouseCard.classList.add('want-' + want);
  }
  let pressT = 0;
  function press(part) {
    mouseCard.classList.remove('press-wheel', 'press-left', 'press-right');
    mouseCard.classList.add('press-' + part);
    clearTimeout(pressT);
    pressT = setTimeout(() => mouseCard.classList.remove('press-' + part), 350);
  }

  function snag(it) {
    G.state = 'stuck';
    G.held = it;
    G.depthT = G.depth;
    it.el.classList.add('snag');
    snd.snag();
  }
  function catchGem(it) {
    G.state = 'reel';
    G.held = it;
    G.depthT = G.depth;
    it.el.classList.remove('glow');
    it.el.classList.add('caught');
    G.near = null;
    snd.catch();
  }
  // 보물을 배까지 끌어올렸을 때
  function land() {
    const it = G.held;
    G.held = null;
    G.items = G.items.filter((x) => x !== it);
    spark(G.hx - 55, geo.surface - 30, '✨');
    it.el.remove();
    const k = it.gem;
    k.got++;
    paintMission();
    k.chip.classList.add('up');
    snd.land();
    G.state = 'free';
    G.depth = G.depthT = 0;
    if (G.need.every((n) => n.got >= n.want)) { setTimeout(finish, 450); G.state = 'done'; return; }
    if (k.got === k.want) toast(`${k.e} ${k.name} 다 모았어요!`);
    else if (Math.random() < 0.4) toast(pickOne(['멋져요! ⭐', '잘했어요! 🌈', '최고예요! 🎉', '좋아요! 👍']), 900);
  }
  // 걸린 쓰레기를 배의 쓰레기통으로 휙
  function toss() {
    const it = G.held;
    G.held = null;
    G.items = G.items.filter((x) => x !== it);
    it.el.classList.remove('snag');
    void it.el.offsetWidth;
    it.el.classList.add('toss');
    it.el.style.left = G.hx - 110 + 'px'; it.el.style.top = geo.surface - 40 + 'px';
    setTimeout(() => it.el.remove(), 550);
    G.cleaned++;
    $('#cleaned').textContent = G.cleaned;
    snd.toss();
    toast(G.items.some((x) => x.kind === 'trash') ? '바다가 깨끗해졌어요! 🌊' : '쓰레기를 다 치웠어요! 🌊✨');
    G.state = 'free';
  }
  function miss(text) {
    G.misses++;
    snd.miss();
    toast(text);
  }

  /* ---------- 마우스 ---------- */
  stage.addEventListener('pointermove', (e) => {
    if (!G || e.pointerType === 'touch') return;
    const r = stage.getBoundingClientRect();
    G.hxT = Math.min(maxHx(), Math.max(minHx(), e.clientX - r.left));
  });
  stage.addEventListener('pointerdown', (e) => {
    if (!G || G.state === 'done') return;
    e.preventDefault();
    if (e.button === 1) { press('wheel'); return; }
    const right = e.button === 2;
    press(right ? 'right' : 'left');
    if (G.state === 'reel') return;
    if (G.state === 'stuck') {
      if (right) toss();
      else miss('쓰레기는 오른쪽 버튼으로 버려요!');
      return;
    }
    if (right) { miss('오른쪽 버튼은 쓰레기가 걸렸을 때 눌러요!'); return; }
    if (G.near) catchGem(G.near);
    else miss(G.depth < 0.05 ? '먼저 휠을 굴려 줄을 내려요!' : '반짝이는 보물 가까이에서 눌러요!');
  });
  stage.addEventListener('contextmenu', (e) => e.preventDefault());
  // 휠: 놀이 중에는 화면 대신 낚싯줄이 움직인다
  window.addEventListener('wheel', (e) => {
    if (!G || !$('#pop').hidden) return;
    e.preventDefault();
    if (G.state === 'done') return;
    press('wheel');
    if (G.state === 'stuck') {
      if (Date.now() - G.stuckHint > 1500) { G.stuckHint = Date.now(); toast('먼저 오른쪽 버튼으로 쓰레기를 버려요!'); }
      return;
    }
    if (G.state !== 'free') return;
    const px = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaMode === 2 ? e.deltaY * geo.H : e.deltaY;
    const step = Math.max(-120, Math.min(120, px)) / 100; // 휠 한 칸 ≈ 1
    G.depthT = Math.max(0, Math.min(1, G.depthT + step * 0.09 * G.sea.wheel));
  }, { passive: false });
  window.addEventListener('resize', () => { if (G) layout(); });

  /* ---------- 꾸밈: 물고기·물방울 ---------- */
  function fish() {
    const f = el('span', 'fish', pickOne(['🐟', '🐠', '🐡']));
    f.style.top = iy(0.1 + Math.random() * 0.8) + 'px';
    f.style.animationDuration = 9 + Math.random() * 6 + 's';
    stage.appendChild(f);
    setTimeout(() => f.remove(), 16000);
  }
  function bubble() {
    const b = el('span', 'bubble');
    b.style.left = Math.random() * geo.W + 'px';
    b.style.top = geo.floor - 10 - Math.random() * 60 + 'px';
    stage.appendChild(b);
    setTimeout(() => b.remove(), 3100);
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
    if (!G) return;
    clearInterval(timerT);
    const sec = Math.max(1, Math.round((Date.now() - G.startAt) / 1000));
    $('#time').textContent = clock(sec);
    const stars = G.misses === 0 ? 3 : G.misses <= 3 ? 2 : 1;
    $('#popStars').textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
    $('#popTitle').textContent = `${G.sea.face} ${G.sea.name} 보물 다 낚았어요!`;
    $('#stats').innerHTML = '';
    const got = G.need.reduce((n, k) => n + k.got, 0);
    [['🎁 낚은 보물', got], ['🗑️ 치운 쓰레기', G.cleaned], ['⏱️ 걸린 시간', clock(sec)]].forEach(([k, v]) => {
      const d = el('div'); d.append(el('b', '', v), el('span', '', k)); $('#stats').appendChild(d);
    });
    let msg = G.misses ? `버튼을 ${G.misses}번 헷갈렸어요. 마우스 그림의 노란 곳을 보고 눌러요.` : '버튼을 한 번도 안 헷갈렸어요! 낚시 박사예요!';
    const key = 'best.' + G.sea.id, best = store.get(key, 0);
    if (!best || sec < best) { store.set(key, sec); if (best) msg += ' 🏆 새 기록!'; }
    else msg += ` 내 최고 기록은 ${clock(best)}!`;
    $('#popMsg').textContent = msg;
    $('#pop').hidden = false;
    snd.end();
    confetti();
  }
  function toSetup() {
    G = null;
    guideKey = '';
    cancelAnimationFrame(raf);
    clearInterval(timerT); clearTimeout(toastT);
    stage.querySelectorAll('.item, .fish, .bubble, .spark').forEach((e) => e.remove());
    $('#pop').hidden = true;
    $('#game').hidden = true; $('#setup').hidden = false;
    document.body.classList.remove('playing');
    paintSetup();
  }

  /* ---------- 버튼 ---------- */
  $('#start').onclick = start;
  $('#again').onclick = () => { guideKey = ''; start(); };
  $('#other').onclick = toSetup;
  $('#stop').onclick = toSetup;
  const soundBtn = $('#sound');
  const paintSound = () => { soundBtn.setAttribute('aria-pressed', soundOn); soundBtn.textContent = soundOn ? '🔊 소리' : '🔇 소리'; };
  soundBtn.onclick = () => { soundOn = !soundOn; store.set('sound', soundOn); paintSound(); };
  paintSound();
  paintSetup();
})();
