/* 도깨비 다른그림찾기: 그림·찾을 개수 고르기 → 두 그림에서 다른 곳을 눌러 찾기 */
(() => {
  const $ = (s) => document.querySelector(s);
  const { PARTS, SCENES } = window.SPOT;
  const NS = 'http://www.w3.org/2000/svg';
  const LEVELS = [
    { n: 3, name: '쉬움', face: '🐣', big: true, color: '#FFE3A5', dark: '#E8C478' },
    { n: 5, name: '보통', face: '🐰', big: false, color: '#D4F3E8', dark: '#9ED9C4' },
    { n: 7, name: '어려움', face: '🦊', big: false, color: '#D9EEFF', dark: '#A3CDF0' },
  ];
  const HINTS = 3;
  const PALETTE = ['#F0472A', '#FFD45C', '#4FA3E8', '#5FD0B0', '#B79CFF', '#FF8FB1', '#2E9E6A', '#FF9F43', '#3B3B5C'];

  // 마지막으로 고른 것과 가장 빠른 기록 (이 기기에만, 안 되면 그냥 넘어감)
  const store = {
    get(k, d) { try { const v = localStorage.getItem('spot.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('spot.' + k, JSON.stringify(v)); } catch {} },
  };
  let sceneIdx = store.get('scene', 0);
  let levelIdx = store.get('level', 0);
  if (!SCENES[sceneIdx]) sceneIdx = 0;
  if (!LEVELS[levelIdx]) levelIdx = 0;
  const bestKey = () => `best.${sceneIdx}.${LEVELS[levelIdx].n}`;
  const clock = (ms) => { const s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  /* ---------- 그림 그리기 ---------- */
  let uid = 0;
  // change: { i: 조각 번호, type: 'gone' | 'color' | 'flip' | 'big', color }
  function sceneSvg(scene, changes = []) {
    const id = 's' + (++uid);
    const byI = new Map(changes.map((c) => [c.i, c]));
    const items = scene.items.map(([part, x, y, s, color], i) => {
      const ch = byI.get(i);
      if (ch && ch.type === 'gone') return '';
      const sx = (ch && ch.type === 'flip' ? -1 : 1) * s * (ch && ch.type === 'big' ? 1.35 : 1);
      const sy = s * (ch && ch.type === 'big' ? 1.35 : 1);
      return `<g transform="translate(${x} ${y}) scale(${sx} ${sy})">${PARTS[part].draw(ch && ch.type === 'color' ? ch.color : color)}</g>`;
    }).join('');
    return scene.bg.replaceAll('{id}', id) + items;
  }

  const hex = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
  const far = (a, b) => { const [p, q] = [hex(a), hex(b)]; return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };
  const pickOne = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // 바꿀 조각 n개를 고른다. 쉬움은 큰 조각만, 바꾸는 방법은 골고루.
  function makeChanges(scene, level) {
    const pool = scene.items.map((it, i) => ({ i, part: PARTS[it[0]], size: PARTS[it[0]].r * it[3], color: it[4] }))
      .filter((o) => !level.big || o.size >= 34);
    const chosen = shuffle(pool).slice(0, level.n);
    const types = ['gone', 'color', 'flip', 'big'];
    let k = Math.floor(Math.random() * types.length);
    return chosen.map((o) => {
      // 그 조각에 어울리는 방법이 나올 때까지 돌린다 (쉬움은 뒤집기 없이)
      for (let t = 0; t < types.length; t++, k++) {
        const type = types[k % types.length];
        if (type === 'flip' && (!o.part.flip || level.big)) continue;
        if (type === 'color' && !o.part.color) continue;
        k++;
        const [, x, y, s] = scene.items[o.i];
        const r = Math.max(38, o.size * (type === 'big' ? 1.35 : 1)) + 10;
        const color = type === 'color' ? pickOne(PALETTE.filter((c) => far(c, o.color) > 170)) : null;
        return { i: o.i, type, color, x, y, r, s, found: false };
      }
      return { i: o.i, type: 'gone', x: scene.items[o.i][1], y: scene.items[o.i][2], r: Math.max(38, o.size) + 10, found: false };
    });
  }

  /* ---------- 준비 화면 ---------- */
  const pics = $('#pics'), levels = $('#levels');
  SCENES.forEach((sc, i) => {
    const b = document.createElement('button');
    b.className = 'pic';
    b.innerHTML = `<svg viewBox="0 0 800 600" aria-hidden="true">${sceneSvg(sc)}</svg><span class="picName">${sc.name}</span><span class="best" hidden></span>`;
    b.onclick = () => { sceneIdx = i; store.set('scene', i); paintSetup(); };
    pics.appendChild(b);
  });
  LEVELS.forEach((lv, i) => {
    const b = document.createElement('button');
    b.className = 'level';
    b.style.setProperty('--c', lv.color);
    b.style.setProperty('--cd', lv.dark);
    b.innerHTML = `<b>${lv.face}</b><strong>${lv.n}군데</strong><span>${lv.name}</span>`;
    b.onclick = () => { levelIdx = i; store.set('level', i); paintSetup(); };
    levels.appendChild(b);
  });
  function paintSetup() {
    [...pics.children].forEach((b, i) => {
      b.classList.toggle('on', i === sceneIdx);
      const best = store.get(`best.${i}.${LEVELS[levelIdx].n}`, 0);
      const tag = b.querySelector('.best');
      tag.textContent = best ? `🏆 ${clock(best)}` : '';
      tag.hidden = !best;
    });
    [...levels.children].forEach((b, i) => b.classList.toggle('on', i === levelIdx));
  }
  paintSetup();

  /* ---------- 소리 ---------- */
  let audio = null;
  function beep(notes, type = 'triangle') {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = audio.currentTime;
      notes.forEach(([f, at, len]) => {
        const o = audio.createOscillator(), g = audio.createGain();
        o.type = type; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0 + at);
        g.gain.exponentialRampToValueAtTime(0.22, t0 + at + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + len);
        o.connect(g).connect(audio.destination);
        o.start(t0 + at); o.stop(t0 + at + len + 0.05);
      });
    } catch {}
  }
  const foundSound = () => beep([[880, 0, 0.12], [1320, 0.08, 0.18]]);
  const missSound = () => beep([[260, 0, 0.15], [200, 0.1, 0.2]], 'sine');
  const winSound = () => beep([[523, 0, .2], [659, .15, .2], [784, .3, .2], [1047, .45, .5]]);

  /* ---------- 찾기 ---------- */
  const picA = $('#picA'), picB = $('#picB'), pair = $('#pair'), area = $('#area');
  let game = null;

  function startGame() {
    const scene = SCENES[sceneIdx], level = LEVELS[levelIdx];
    const diffs = makeChanges(scene, level);
    game = { scene, level, diffs, start: performance.now(), misses: 0, hints: HINTS, recent: [], lockUntil: 0, done: false, timer: 0 };
    picA.innerHTML = sceneSvg(scene) + '<g class="marks"></g>';
    picB.innerHTML = sceneSvg(scene, diffs) + '<g class="marks"></g>';
    $('#dots').innerHTML = diffs.map(() => '<i></i>').join('');
    $('#hintLeft').textContent = HINTS;
    $('#hint').disabled = false; $('#giveUp').disabled = false;
    setTip('두 그림에서 다른 곳을 찾아 콕! 눌러요. 어느 그림을 눌러도 돼요.');
    $('#setup').hidden = true; $('#game').hidden = false; $('#pop').hidden = true;
    document.body.classList.add('playing');
    updateCount();
    layout();
    game.timer = setInterval(tick, 250);
    tick();
  }

  // 두 그림을 옆으로 놓을지 위아래로 놓을지, 더 크게 보이는 쪽으로
  function layout() {
    const W = area.clientWidth, H = area.clientHeight, gap = 14, k = 3 / 4;
    const side = Math.min((W - gap) / 2, H / k);
    const stack = Math.min(W, (H - gap) / 2 / k);
    const w = Math.floor(Math.max(side, stack));
    pair.style.gridTemplateColumns = side >= stack ? `${w}px ${w}px` : `${w}px`;
    pair.querySelectorAll('.frame').forEach((f) => { f.style.width = w + 'px'; f.style.height = Math.floor(w * k) + 'px'; });
  }
  window.addEventListener('resize', () => { if (game) layout(); });

  function tick() {
    if (!game || game.done) return;
    $('#time').textContent = clock(performance.now() - game.start);
  }
  function updateCount() {
    const n = game.diffs.filter((d) => d.found).length;
    $('#found').textContent = `${n} / ${game.diffs.length}`;
    [...$('#dots').children].forEach((el, i) => el.classList.toggle('on', i < n));
  }
  let tipTimer = 0;
  function setTip(text, warn, ms) {
    const t = $('#tip');
    t.textContent = text; t.classList.toggle('warn', !!warn);
    clearTimeout(tipTimer);
    if (ms) tipTimer = setTimeout(() => { t.textContent = '다른 곳을 찾아 콕! 눌러요.'; t.classList.remove('warn'); }, ms);
  }

  function svgEl(tag, attrs) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    return e;
  }
  function ring(d, cls) {
    const len = (2 * Math.PI * d.r).toFixed(1); // 동그라미를 그리듯 나타나게: 둘레만큼 점선을 밀었다가 당긴다
    [picA, picB].forEach((p) => p.querySelector('.marks').appendChild(svgEl('circle', { cx: d.x, cy: d.y, r: d.r, class: cls, style: `--len:${len}` })));
  }

  // 누른 곳을 그림 좌표(800×600)로 바꿔서 다른 곳 근처인지 본다
  function onPick(e) {
    if (!game || game.done) return;
    const now = performance.now();
    if (now < game.lockUntil) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width * 800, y = (e.clientY - rect.top) / rect.height * 600;
    const hit = game.diffs
      .filter((d) => !d.found && Math.hypot(d.x - x, d.y - y) <= d.r)
      .sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
    if (hit) {
      hit.found = true;
      ring(hit, 'mark');
      foundSound();
      updateCount();
      const left = game.diffs.filter((d) => !d.found).length;
      setTip(left ? `찾았어요! 앞으로 ${left}군데 남았어요.` : '다 찾았어요!', false, left ? 1800 : 0);
      if (!left) finish(false);
      return;
    }
    // 이미 찾은 곳을 또 누른 건 틀린 게 아니다
    if (game.diffs.some((d) => d.found && Math.hypot(d.x - x, d.y - y) <= d.r)) return;
    game.misses++;
    missSound();
    const g = svgEl('g', {});
    g.appendChild(svgEl('path', { d: `M${x - 18} ${y - 18} L${x + 18} ${y + 18} M${x + 18} ${y - 18} L${x - 18} ${y + 18}`, class: 'miss' }));
    svg.querySelector('.marks').appendChild(g);
    setTimeout(() => g.remove(), 950);
    // 아무 데나 마구 누르면 잠깐 쉬게 한다
    game.recent = game.recent.filter((t) => now - t < 2500).concat(now);
    if (game.recent.length >= 4) {
      game.recent = [];
      game.lockUntil = now + 2000;
      pair.classList.add('wait');
      setTip('🐢 마구 누르지 말고 두 그림을 천천히 비교해 봐요', true, 2000);
      setTimeout(() => pair.classList.remove('wait'), 2000);
    }
  }
  picA.addEventListener('click', onPick);
  picB.addEventListener('click', onPick);

  $('#hint').onclick = () => {
    if (!game || game.done || game.hints <= 0) return;
    const d = game.diffs.find((x) => !x.found);
    if (!d) return;
    game.hints--;
    $('#hintLeft').textContent = game.hints;
    if (!game.hints) $('#hint').disabled = true;
    [picA, picB].forEach((p) => {
      const c = svgEl('circle', { cx: d.x, cy: d.y, r: d.r + 14, class: 'hintRing' });
      p.querySelector('.marks').appendChild(c);
      setTimeout(() => c.remove(), 2100);
    });
    setTip('💡 반짝이는 곳을 잘 봐요!', false, 2200);
  };

  $('#giveUp').onclick = () => {
    if (!game || game.done) return;
    game.diffs.filter((d) => !d.found).forEach((d) => ring(d, 'mark shown'));
    finish(true);
  };

  function finish(gaveUp) {
    game.done = true;
    clearInterval(game.timer);
    $('#hint').disabled = true; $('#giveUp').disabled = true;
    const ms = performance.now() - game.start;
    const found = game.diffs.filter((d) => d.found).length;
    if (gaveUp) {
      setTip(`보라색 점선이 못 찾은 곳이에요. ${found}군데 찾았어요.`);
      setTimeout(() => showPop('🔍', '정답을 확인해요', `${game.diffs.length}군데 중 ${found}군데를 찾았어요. 다음엔 다 찾아봐요!`, false), 1600);
      return;
    }
    const used = HINTS - game.hints;
    const stars = used === 0 && game.misses <= 2 ? 3 : used <= 1 && game.misses <= 6 ? 2 : 1;
    let msg = `걸린 시간 ${clock(ms)} · 틀린 곳 ${game.misses}번 · 힌트 ${used}번`;
    const best = store.get(bestKey(), 0);
    if (!best || ms < best) { store.set(bestKey(), Math.round(ms)); if (best) msg += ' · 🏆 새 기록!'; }
    winSound();
    setTimeout(() => showPop('⭐'.repeat(stars) + '☆'.repeat(3 - stars), stars === 3 ? '눈이 정말 좋아요!' : '다 찾았어요!', msg, true), 700);
  }
  function showPop(face, title, msg, party) {
    $('#popStars').textContent = face;
    $('#popTitle').textContent = title;
    $('#popMsg').textContent = msg;
    $('#pop').hidden = false;
    if (party) confetti();
  }
  function confetti() {
    const box = $('#confetti');
    const colors = ['#FF8FB1', '#FFD45C', '#5FD0B0', '#7CC4FF', '#B79CFF'];
    for (let i = 0; i < 70; i++) {
      const c = document.createElement('i');
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = pickOne(colors);
      c.style.animationDuration = 1.6 + Math.random() * 1.6 + 's';
      c.style.animationDelay = Math.random() * 0.5 + 's';
      box.appendChild(c);
      setTimeout(() => c.remove(), 4000);
    }
  }

  function backToSetup() {
    if (game) clearInterval(game.timer);
    game = null;
    $('#pop').hidden = true; $('#game').hidden = true; $('#setup').hidden = false;
    document.body.classList.remove('playing');
    paintSetup();
  }

  $('#start').onclick = startGame;
  $('#again').onclick = startGame;
  $('#other').onclick = backToSetup;
  $('#toSetup').onclick = backToSetup;
})();
