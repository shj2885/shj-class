/* 도깨비 미로찾기: 동물 친구를 움직여 좋아하는 간식까지 간다. 가는 길에 별 3개를 모으면 별점이 꽉 찬다.
   미로는 할 때마다 새로 만든다(길이 하나뿐인 미로). 화살표 키·방향 버튼·미로 위 밀기/누르기로 움직인다. */
(() => {
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const pickOne = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  const FRIENDS = [
    { face: '🐰', name: '토끼', food: '🥕', foodName: '당근', color: '#FFE3EC', dark: '#F5B3C8', trail: '#FF8FB1' },
    { face: '🐶', name: '강아지', food: '🦴', foodName: '뼈다귀', color: '#FFEBD2', dark: '#EEC28E', trail: '#E8964A' },
    { face: '🐱', name: '고양이', food: '🐟', foodName: '물고기', color: '#E3F1FF', dark: '#A9CDF2', trail: '#4FA3E8' },
    { face: '🐻', name: '곰돌이', food: '🍯', foodName: '꿀', color: '#FFF1C2', dark: '#E8CB6A', trail: '#E0A800' },
    { face: '🐵', name: '원숭이', food: '🍌', foodName: '바나나', color: '#EFE6FF', dark: '#C7B3F0', trail: '#9B7BEA' },
    { face: '🐿️', name: '다람쥐', food: '🌰', foodName: '도토리', color: '#DDF5E9', dark: '#9ED9BC', trail: '#3BAE8E' },
  ];
  const SIZES = [
    { n: 7, face: '🌱', name: '작은 미로', sub: '7 × 7칸', color: '#FFE3A5', dark: '#E8C478' },
    { n: 11, face: '🌿', name: '보통 미로', sub: '11 × 11칸', color: '#D4F3E8', dark: '#9ED9C4' },
    { n: 15, face: '🌳', name: '큰 미로', sub: '15 × 15칸', color: '#FFD9C2', dark: '#F0AE88' },
  ];
  const HINTS = 3;
  // 방향: 0 위, 1 오른쪽, 2 아래, 3 왼쪽
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
  const CELL = 10;
  // 받침이 있으면 '을', 없으면 '를'
  const eul = (w) => w + ((w.charCodeAt(w.length - 1) - 0xAC00) % 28 ? '을' : '를');

  // 저장은 이 기기 브라우저에만, 안 되면 그냥 넘어간다
  const store = {
    get(k, d) { try { const v = localStorage.getItem('maze.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('maze.' + k, JSON.stringify(v)); } catch {} },
  };
  let friendIdx = store.get('friend', 0);
  let sizeIdx = store.get('size', 0);
  if (!FRIENDS[friendIdx]) friendIdx = 0;
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
    step: () => tone([520], 'sine', 0.035),
    bump: () => tone([180], 'square', 0.04),
    star: () => tone([880, 1175, 1568], 'triangle', 0.13, 0.06),
    hint: () => tone([660, 880], 'sine', 0.1, 0.08),
    end: () => tone([523, 659, 784, 1047], 'triangle', 0.15, 0.12),
  };

  /* ---------- 미로 만들기 ---------- */
  // open[i]: 그 칸에서 뚫린 방향을 비트로(1 위, 2 오른쪽, 4 아래, 8 왼쪽)
  function makeMaze(n) {
    const open = new Uint8Array(n * n), seen = new Uint8Array(n * n);
    const stack = [0]; seen[0] = 1;
    while (stack.length) {
      const i = stack[stack.length - 1], x = i % n, y = (i / n) | 0;
      const ways = shuffle([0, 1, 2, 3]).filter((d) => {
        const nx = x + DX[d], ny = y + DY[d];
        return nx >= 0 && ny >= 0 && nx < n && ny < n && !seen[ny * n + nx];
      });
      if (!ways.length) { stack.pop(); continue; }
      const d = ways[0], j = (y + DY[d]) * n + x + DX[d];
      open[i] |= 1 << d; open[j] |= 1 << ((d + 2) % 4);
      seen[j] = 1; stack.push(j);
    }
    return open;
  }
  // 막다른 길에 별을 놓는다(서로 떨어지게). 막다른 길이 모자라면 아무 칸이나.
  function placeStars(n, open) {
    const goal = n * n - 1, bits = (v) => (v & 1) + (v >> 1 & 1) + (v >> 2 & 1) + (v >> 3 & 1);
    const ends = shuffle([...open.keys()].filter((i) => i !== 0 && i !== goal && bits(open[i]) === 1));
    const rest = shuffle([...open.keys()].filter((i) => i !== 0 && i !== goal && !ends.includes(i)));
    const dist = (a, b) => Math.abs(a % n - b % n) + Math.abs(((a / n) | 0) - ((b / n) | 0));
    const out = [];
    for (const gap of [Math.floor(n / 2), 2, 0]) {
      for (const i of [...ends, ...rest]) {
        if (out.length === 3) break;
        if (!out.includes(i) && out.every((j) => dist(i, j) >= gap) && dist(i, 0) >= Math.min(gap, 2)) out.push(i);
      }
    }
    return out;
  }
  // 지금 칸에서 도착까지 가는 칸 순서(넓게 찾기)
  function pathTo(n, open, from, to) {
    const prev = new Int32Array(n * n).fill(-1); prev[from] = from;
    const q = [from];
    while (q.length) {
      const i = q.shift();
      if (i === to) break;
      for (let d = 0; d < 4; d++) {
        if (!(open[i] & (1 << d))) continue;
        const j = i + DY[d] * n + DX[d];
        if (prev[j] < 0) { prev[j] = i; q.push(j); }
      }
    }
    const out = [to];
    while (out[0] !== from) out.unshift(prev[out[0]]);
    return out;
  }

  /* ---------- 준비 화면 ---------- */
  const friendsEl = $('#friends'), sizesEl = $('#sizes');
  FRIENDS.forEach((f, i) => {
    const b = el('button', 'friend');
    b.style.setProperty('--c', f.color); b.style.setProperty('--cd', f.dark);
    b.innerHTML = `<b>${f.face}</b><strong>${f.name}</strong><span>→ ${f.food} ${f.foodName}</span>`;
    b.onclick = () => { friendIdx = i; store.set('friend', i); paintSetup(); };
    friendsEl.appendChild(b);
  });
  SIZES.forEach((s, i) => {
    const b = el('button', 'tm');
    b.style.setProperty('--c', s.color); b.style.setProperty('--cd', s.dark);
    b.innerHTML = `<b>${s.face}</b><strong>${s.name}</strong><span>${s.sub}</span><span class="best"></span>`;
    b.onclick = () => { sizeIdx = i; store.set('size', i); paintSetup(); };
    sizesEl.appendChild(b);
  });
  const clock = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  function paintSetup() {
    [...friendsEl.children].forEach((b, i) => b.classList.toggle('on', i === friendIdx));
    [...sizesEl.children].forEach((b, i) => {
      b.classList.toggle('on', i === sizeIdx);
      const best = store.get('best.' + SIZES[i].n, 0);
      const tag = b.querySelector('.best');
      tag.textContent = best ? `🏆 ${clock(best)}` : '';
      tag.hidden = !best;
    });
  }

  /* ---------- 게임 ---------- */
  const svg = $('#maze'), tipEl = $('#tip');
  let G = null, tipT = 0, timerT = 0;
  const center = (i, n) => [(i % n) * CELL + CELL / 2, ((i / n) | 0) * CELL + CELL / 2];

  function tip(text, ms) {
    clearTimeout(tipT);
    tipEl.textContent = text;
    if (ms) tipT = setTimeout(() => { if (G) tipEl.textContent = G.baseTip; }, ms);
  }

  function start() {
    const friend = FRIENDS[friendIdx], n = SIZES[sizeIdx].n;
    const open = makeMaze(n);
    G = { friend, n, open, at: 0, goal: n * n - 1, stars: placeStars(n, open), got: 0, hints: HINTS, hintsUsed: 0, steps: 0, startAt: 0, done: false, trail: new Set([0]) };
    G.baseTip = `${friend.face} ${eul(friend.name)} 움직여 ${friend.food} ${friend.foodName}까지 가요! 가는 길에 ⭐도 모아요.`;
    $('#pop').hidden = true;
    $('#setup').hidden = true; $('#game').hidden = false;
    document.body.classList.add('playing');
    $('#padFace').textContent = friend.face;
    svg.style.setProperty('--trail', friend.trail);
    draw();
    paintBar();
    clearInterval(timerT);
    $('#time').textContent = '0:00';
    tip(G.baseTip);
    window.scrollTo(0, 0);
  }

  function draw() {
    const { n, open, friend } = G, W = n * CELL, sw = 1.5;
    svg.setAttribute('viewBox', `${-sw} ${-sw} ${W + sw * 2} ${W + sw * 2}`);
    let walls = `M0 0 H${W} V${W} H0 Z`;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const v = open[y * n + x], px = x * CELL, py = y * CELL;
      if (x < n - 1 && !(v & 2)) walls += ` M${px + CELL} ${py} V${py + CELL}`;
      if (y < n - 1 && !(v & 4)) walls += ` M${px} ${py + CELL} H${px + CELL}`;
    }
    const [gx, gy] = center(G.goal, n), [sx, sy] = center(0, n);
    const emo = (x, y, t, size, cls = '') => `<text class="emo ${cls}" x="${x}" y="${y}" font-size="${size}" text-anchor="middle" dominant-baseline="central">${t}</text>`;
    svg.innerHTML = `
      <rect x="0" y="0" width="${W}" height="${W}" fill="#F6FCEF"/>
      <rect x="${sx - 4.5}" y="${sy - 4.5}" width="9" height="9" rx="2.5" fill="#E3F3FF"/>
      <rect x="${gx - 4.5}" y="${gy - 4.5}" width="9" height="9" rx="2.5" fill="#FFF1B8"/>
      <g id="trail"></g>
      <g id="hintLayer"></g>
      ${emo(gx, gy + .4, friend.food, 7)}
      ${G.stars.map((i) => { const [x, y] = center(i, n); return emo(x, y + .3, '⭐', 6, 'star" data-i="' + i); }).join('')}
      <path class="wall" d="${walls}" fill="none" stroke-width="${sw}"/>
      <g class="me" id="me">${emo(0, .4, friend.face, 7.6)}</g>`;
    G.meEl = svg.querySelector('#me');
    G.trailEl = svg.querySelector('#trail');
    placeMe(true);
  }
  function placeMe(instant) {
    const [x, y] = center(G.at, G.n);
    if (instant) G.meEl.style.transition = 'none';
    G.meEl.style.transform = `translate(${x}px, ${y}px)`;
    if (instant) { G.meEl.getBoundingClientRect(); G.meEl.style.transition = ''; }
  }
  function paintBar() {
    $('#got').textContent = G.got;
    $('#hints').textContent = G.hints;
    $('#hint').disabled = !G.hints || G.done;
  }

  function move(d) {
    if (!G || G.done) return;
    if (!(G.open[G.at] & (1 << d))) {
      G.meEl.classList.remove('bump'); void G.meEl.getBBox(); G.meEl.classList.add('bump');
      snd.bump();
      return;
    }
    if (!G.startAt) {
      G.startAt = Date.now();
      timerT = setInterval(() => { if (G && !G.done) $('#time').textContent = clock(Math.floor((Date.now() - G.startAt) / 1000)); }, 250);
    }
    G.at += DY[d] * G.n + DX[d];
    G.steps++;
    placeMe();
    if (!G.trail.has(G.at)) {
      G.trail.add(G.at);
      const [x, y] = center(G.at, G.n);
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', x); dot.setAttribute('cy', y); dot.setAttribute('r', 1.6); dot.setAttribute('class', 'trail');
      G.trailEl.appendChild(dot);
    }
    const si = G.stars.indexOf(G.at);
    if (si >= 0) {
      G.stars[si] = -1;
      G.got++;
      svg.querySelector(`.star[data-i="${G.at}"]`)?.classList.add('got');
      const chip = $('.chip.stars'); chip.classList.remove('up'); void chip.offsetWidth; chip.classList.add('up');
      snd.star();
      tip(G.got === 3 ? '⭐ 별을 다 모았어요! 이제 도착까지 가요!' : `⭐ 별을 찾았어요! (${G.got} / 3)`, 1800);
      paintBar();
    } else snd.step();
    if (G.at === G.goal) setTimeout(finish, 180);
  }

  function hint() {
    if (!G || G.done || !G.hints) return;
    G.hints--; G.hintsUsed++;
    paintBar();
    const pts = pathTo(G.n, G.open, G.at, G.goal).map((i) => center(i, G.n).join(' '));
    const layer = svg.querySelector('#hintLayer');
    layer.innerHTML = `<path class="hintPath" d="M${pts.join(' L')}" stroke-width="2.2"/>`;
    snd.hint();
    tip('💡 노란 점을 따라가 보세요! 곧 사라져요.', 3200);
    setTimeout(() => { if (layer.isConnected) layer.innerHTML = ''; }, 3300);
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
    paintBar();
    const f = G.friend;
    $('#popStars').textContent = '⭐'.repeat(G.got) + '☆'.repeat(3 - G.got);
    $('#popTitle').textContent = `${f.face} ${f.food} ${eul(f.foodName)} 찾았어요!`;
    $('#stats').innerHTML = '';
    [['⏱️ 걸린 시간', clock(sec)], ['⭐ 모은 별', `${G.got} / 3`], ['💡 쓴 힌트', G.hintsUsed]].forEach(([k, v]) => {
      const d = el('div'); d.append(el('b', '', v), el('span', '', k)); $('#stats').appendChild(d);
    });
    let msg = G.got < 3 ? '막다른 길에 숨은 별 3개를 다 모으면 별점이 꽉 차요.' : '별을 모두 모았어요!';
    const key = 'best.' + G.n, best = store.get(key, 0);
    if (!best || sec < best) { store.set(key, sec); if (best) msg += ' 🏆 새 기록!'; }
    else msg += ` 내 최고 기록은 ${clock(best)}!`;
    $('#popMsg').textContent = msg;
    $('#pop').hidden = false;
    tip('');
    snd.end();
    confetti();
  }
  function toSetup() {
    G = null;
    clearTimeout(tipT); clearInterval(timerT);
    $('#pop').hidden = true;
    $('#game').hidden = true; $('#setup').hidden = false;
    document.body.classList.remove('playing');
    paintSetup();
  }

  /* ---------- 움직이기: 키보드 ---------- */
  const KEYS = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3, w: 0, d: 1, s: 2, a: 3, W: 0, D: 1, S: 2, A: 3 };
  document.addEventListener('keydown', (e) => {
    if (!G || !$('#pop').hidden) return;
    const d = KEYS[e.key];
    if (d == null) return;
    e.preventDefault();
    move(d);
  });

  /* ---------- 움직이기: 방향 버튼(꾹 누르면 계속 간다) ---------- */
  let holdT = 0;
  const stopHold = () => { clearTimeout(holdT); document.querySelectorAll('.key.held').forEach((k) => k.classList.remove('held')); };
  document.querySelectorAll('.key').forEach((k) => {
    const d = +k.dataset.dir;
    k.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      stopHold();
      k.classList.add('held');
      move(d);
      const again = (wait) => { holdT = setTimeout(() => { move(d); again(140); }, wait); };
      again(320);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => k.addEventListener(ev, stopHold));
    k.addEventListener('click', (e) => { if (e.detail === 0) move(d); }); // 키보드로 버튼을 눌렀을 때
  });
  window.addEventListener('blur', stopHold);

  /* ---------- 움직이기: 미로 위에서 밀기·누르기 ---------- */
  // 밀면 민 쪽으로 한 칸씩 계속 가고, 그냥 누르면 누른 쪽으로 한 칸 간다.
  let drag = null;
  const box = $('.mazeBox');
  const cellPx = () => svg.getBoundingClientRect().width / (G.n + 0.3);
  box.addEventListener('pointerdown', (e) => {
    if (!G || G.done) return;
    drag = { x: e.clientX, y: e.clientY, moved: false };
    box.setPointerCapture(e.pointerId);
  });
  box.addEventListener('pointermove', (e) => {
    if (!drag || !G) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y, need = Math.max(18, cellPx() * 0.7);
    if (Math.max(Math.abs(dx), Math.abs(dy)) < need) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
    drag = { x: e.clientX, y: e.clientY, moved: true };
  });
  box.addEventListener('pointerup', (e) => {
    if (!drag || !G) { drag = null; return; }
    if (!drag.moved) {
      const r = G.meEl.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      if (Math.max(Math.abs(dx), Math.abs(dy)) > cellPx() * 0.45) move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
    }
    drag = null;
  });
  box.addEventListener('pointercancel', () => { drag = null; });

  /* ---------- 버튼 ---------- */
  $('#start').onclick = start;
  $('#again').onclick = start;
  $('#other').onclick = toSetup;
  $('#stop').onclick = toSetup;
  $('#hint').onclick = hint;
  const soundBtn = $('#sound');
  const paintSound = () => { soundBtn.setAttribute('aria-pressed', soundOn); soundBtn.textContent = soundOn ? '🔊 소리' : '🔇 소리'; };
  soundBtn.onclick = () => { soundOn = !soundOn; store.set('sound', soundOn); paintSound(); };
  paintSound();
  paintSetup();
})();
