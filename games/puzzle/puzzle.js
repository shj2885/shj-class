/* 도깨비 직소퍼즐: 그림·조각 수 고르기 → 조각을 끌어다 판에 맞추기 */
(() => {
  const $ = (s) => document.querySelector(s);
  const PICS = window.PUZZLE_PICS;
  const SIZES = [
    { c: 2, r: 2, name: '아주 쉬움', face: '🐣', color: '#FFE3A5', dark: '#E8C478' },
    { c: 3, r: 3, name: '쉬움', face: '🐥', color: '#FFD3E0', dark: '#F0A9C0' },
    { c: 4, r: 4, name: '보통', face: '🐰', color: '#D4F3E8', dark: '#9ED9C4' },
    { c: 5, r: 5, name: '어려움', face: '🦊', color: '#D9EEFF', dark: '#A3CDF0' },
    { c: 6, r: 6, name: '아주 어려움', face: '🐯', color: '#E6DCFF', dark: '#BFAAF0' },
    { c: 8, r: 6, name: '도전!', face: '🐲', color: '#FFD9C2', dark: '#F0AE88' },
  ];
  const SRC_W = 1200, SRC_H = 900; // 모든 그림을 4:3으로 맞춰서 씀

  // 마지막으로 고른 것 기억 (안 되면 그냥 넘어감)
  const store = {
    get(k, d) { try { const v = localStorage.getItem('puzzle.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('puzzle.' + k, JSON.stringify(v)); } catch {} },
  };
  let pick = store.get('pic', 0);           // 그림 번호, 또는 'photo'
  let sizeIdx = store.get('size', 1);
  if (pick === 'photo' || !PICS[pick]) pick = 0;
  if (!SIZES[sizeIdx]) sizeIdx = 1;
  let photo = null;                          // 내 사진 (잘라 둔 캔버스)

  /* ---------- 준비 화면 ---------- */
  const svgUrl = (svg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  const pics = $('#pics');
  PICS.forEach((p, i) => {
    const b = document.createElement('button');
    b.className = 'pic';
    b.dataset.pic = i;
    b.innerHTML = `<span class="thumb"><img src="${svgUrl(p.svg)}" alt=""></span><span class="picName">${p.name}</span>`;
    b.onclick = () => choosePic(i);
    pics.appendChild(b);
  });
  function choosePic(v) {
    pick = v;
    if (v !== 'photo') store.set('pic', v);
    pics.querySelectorAll('.pic').forEach((el) =>
      el.classList.toggle('on', v === 'photo' ? el.id === 'photoCard' : el.dataset.pic === String(v)));
  }

  const sizes = $('#sizes');
  SIZES.forEach((s, i) => {
    const b = document.createElement('button');
    b.className = 'size';
    b.style.setProperty('--c', s.color);
    b.style.setProperty('--cd', s.dark);
    b.innerHTML = `<b>${s.face}</b><strong>${s.c * s.r}조각</strong><span>${s.name}</span>`;
    b.onclick = () => chooseSize(i);
    sizes.appendChild(b);
  });
  function chooseSize(i) {
    sizeIdx = i;
    store.set('size', i);
    [...sizes.children].forEach((el, j) => el.classList.toggle('on', j === i));
  }
  choosePic(pick);
  chooseSize(sizeIdx);

  // 내 사진: 가운데를 4:3으로 잘라서 이 기기 안에서만 씀
  $('#photoInput').onchange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      photo = coverCanvas(img, img.naturalWidth, img.naturalHeight);
      const thumb = $('#photoThumb');
      thumb.src = photo.toDataURL('image/jpeg', 0.8);
      thumb.hidden = false;
      $('#photoCard b').hidden = true;
      URL.revokeObjectURL(url);
      choosePic('photo');
    };
    img.onerror = () => { URL.revokeObjectURL(url); alert('이 사진은 열 수 없어요. 다른 사진을 골라 주세요.'); };
    img.src = url;
    e.target.value = '';
  };
  $('#photoCard').addEventListener('click', (e) => {
    // 사진을 이미 골랐으면 카드를 눌러 다시 고르게만 하고, 사진 바꾸기는 한 번 더 누르면
    if (photo && pick !== 'photo') { e.preventDefault(); choosePic('photo'); }
  });

  function coverCanvas(img, w, h) {
    const cv = document.createElement('canvas');
    cv.width = SRC_W; cv.height = SRC_H;
    const k = Math.max(SRC_W / w, SRC_H / h);
    const sw = SRC_W / k, sh = SRC_H / k;
    cv.getContext('2d').drawImage(img, (w - sw) / 2, (h - sh) / 2, sw, sh, 0, 0, SRC_W, SRC_H);
    return cv;
  }
  function loadSource() {
    if (pick === 'photo' && photo) return Promise.resolve(photo);
    return new Promise((ok, fail) => {
      const img = new Image();
      img.onload = () => ok(coverCanvas(img, img.naturalWidth || 800, img.naturalHeight || 600));
      img.onerror = fail;
      img.src = svgUrl(PICS[pick === 'photo' ? 0 : pick].svg);
    });
  }

  $('#start').onclick = async () => {
    if (pick === 'photo' && !photo) { $('#photoInput').click(); return; }
    const src = await loadSource();
    startGame(src);
  };

  /* ---------- 소리 (짧은 '딩') ---------- */
  let audio = null;
  function beep(notes) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = audio.currentTime;
      notes.forEach(([f, at, len]) => {
        const o = audio.createOscillator(), g = audio.createGain();
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0 + at);
        g.gain.exponentialRampToValueAtTime(0.25, t0 + at + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + len);
        o.connect(g).connect(audio.destination);
        o.start(t0 + at); o.stop(t0 + at + len + 0.05);
      });
    } catch {}
  }
  const snapSound = () => beep([[880, 0, 0.12], [1320, 0.07, 0.16]]);
  const winSound = () => beep([[523, 0, .2], [659, .15, .2], [784, .3, .2], [1047, .45, .5]]);

  /* ---------- 퍼즐 ---------- */
  const area = $('#area'), board = $('#board'), guide = $('#guide');
  let game = null;

  // 조각 테두리: 볼록(1)·오목(-1)·평평(0)
  function side(ctx, x0, y0, x1, y1, s, S) {
    if (!s) { ctx.lineTo(x1, y1); return; }
    const L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L;
    const nx = uy * s, ny = -ux * s, c = L / 2;
    const P = (a, o) => [x0 + ux * (c + a * S) + nx * o * S, y0 + uy * (c + a * S) + ny * o * S];
    ctx.lineTo(...P(-0.09, 0));
    ctx.bezierCurveTo(...P(-0.07, 0.06), ...P(-0.17, 0.09), ...P(-0.13, 0.18));
    ctx.bezierCurveTo(...P(-0.19, 0.31), ...P(0.19, 0.31), ...P(0.13, 0.18));
    ctx.bezierCurveTo(...P(0.17, 0.09), ...P(0.07, 0.06), ...P(0.09, 0));
    ctx.lineTo(x1, y1);
  }
  function piecePath(ctx, x, y, w, h, e) {
    const S = Math.min(w, h);
    ctx.moveTo(x, y);
    side(ctx, x, y, x + w, y, e.t, S);
    side(ctx, x + w, y, x + w, y + h, e.r, S);
    side(ctx, x + w, y + h, x, y + h, e.b, S);
    side(ctx, x, y + h, x, y, e.l, S);
    ctx.closePath();
  }

  function startGame(src) {
    const { c: cols, r: rows } = SIZES[sizeIdx];
    const rand = () => (Math.random() < 0.5 ? 1 : -1);
    // 가로줄(h)과 세로줄(v) 사이 이음새마다 볼록한 쪽을 정함
    const hEdge = [...Array(rows + 1)].map(() => [...Array(cols)].map(rand));
    const vEdge = [...Array(rows)].map(() => [...Array(cols + 1)].map(rand));
    clearPieces();
    const pieces = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const el = document.createElement('canvas');
      el.className = 'piece';
      area.appendChild(el);
      pieces.push({
        c, r, el, done: false, fx: 0, fy: 0,
        e: {
          t: r ? -hEdge[r][c] : 0, b: r < rows - 1 ? hEdge[r + 1][c] : 0,
          l: c ? -vEdge[r][c] : 0, r: c < cols - 1 ? vEdge[r][c + 1] : 0,
        },
      });
    }
    game = { src, cols, rows, pieces, placed: 0, z: 10, hint: true, start: 0, timer: 0, geo: null };
    document.body.classList.add('playing');
    $('#setup').hidden = true;
    $('#game').hidden = false;
    $('#pop').hidden = true;
    board.classList.remove('done');
    setHint(true);
    layout(true);
    updateCount();
    game.start = Date.now();
    clearInterval(game.timer);
    game.timer = setInterval(tick, 500);
    tick();
  }
  function clearPieces() {
    if (game) clearInterval(game.timer);
    area.querySelectorAll('.piece').forEach((el) => el.remove());
  }

  // 화면 크기에 맞게 판과 조각을 다시 그림 (처음엔 조각을 흩어 놓음)
  function layout(scatter) {
    if (!game) return;
    const W = area.clientWidth, H = area.clientHeight;
    if (!W || !H) return;
    const wide = W > H * 1.05;
    let bw = wide ? Math.min(W * 0.56, H * 0.86 * 4 / 3) : Math.min(W * 0.92, H * 0.56 * 4 / 3);
    bw = Math.floor(bw);
    const bh = Math.floor(bw * 3 / 4);
    const bx = Math.round((W - bw) / 2);
    const by = wide ? Math.round((H - bh) / 2) : Math.round(Math.max(10, H * 0.03));
    const pw = bw / game.cols, ph = bh / game.rows, S = Math.min(pw, ph);
    const pad = Math.ceil(S * 0.3);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    game.geo = { W, H, wide, bw, bh, bx, by, pw, ph, S, pad, dpr };

    Object.assign(board.style, { left: bx + 'px', top: by + 'px', width: bw + 'px', height: bh + 'px' });

    // 테두리 여유를 둔 큰 그림 (조각이 그림 바깥을 잘라 오지 않게)
    const big = document.createElement('canvas');
    big.width = Math.ceil((bw + pad * 2) * dpr);
    big.height = Math.ceil((bh + pad * 2) * dpr);
    const bctx = big.getContext('2d');
    bctx.drawImage(game.src, pad * dpr, pad * dpr, bw * dpr, bh * dpr);

    drawGuide();

    const ew = pw + pad * 2, eh = ph + pad * 2;
    game.pieces.forEach((p) => {
      const el = p.el;
      el.width = Math.ceil(ew * dpr);
      el.height = Math.ceil(eh * dpr);
      el.style.width = ew + 'px';
      el.style.height = eh + 'px';
      const ctx = el.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.beginPath();
      piecePath(ctx, pad, pad, pw, ph, p.e);
      ctx.save();
      ctx.clip();
      ctx.drawImage(big, p.c * pw * dpr, p.r * ph * dpr, ew * dpr, eh * dpr, 0, 0, ew, eh);
      ctx.restore();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.stroke();
    });

    if (scatter) scatterPieces();
    game.pieces.forEach((p) => {
      if (p.done) return place(p, target(p));
      place(p, clamp(p.fx * W, p.fy * H));
    });
  }

  function drawGuide() {
    const { bw, bh, pw, ph, dpr } = game.geo;
    guide.width = Math.ceil(bw * dpr);
    guide.height = Math.ceil(bh * dpr);
    const ctx = guide.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, bw, bh);
    if (game.hint) {
      ctx.globalAlpha = 0.3;
      ctx.drawImage(game.src, 0, 0, bw, bh);
      ctx.globalAlpha = 1;
    }
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(59,47,74,.28)';
    game.pieces.forEach((p) => {
      ctx.beginPath();
      piecePath(ctx, p.c * pw, p.r * ph, pw, ph, p.e);
      ctx.stroke();
    });
  }

  function target(p) {
    const g = game.geo;
    return { x: g.bx + p.c * g.pw - g.pad, y: g.by + p.r * g.ph - g.pad };
  }
  // 조각이 놀이판 밖으로 나가지 않게
  function clamp(x, y) {
    const g = game.geo;
    return {
      x: Math.min(Math.max(x, -g.pad), g.W - g.pw - g.pad),
      y: Math.min(Math.max(y, -g.pad), g.H - g.ph - g.pad),
    };
  }
  function place(p, pos) {
    p.x = pos.x; p.y = pos.y;
    p.el.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
  }
  function remember(p) {
    p.fx = p.x / game.geo.W;
    p.fy = p.y / game.geo.H;
  }

  // 판 바깥 빈자리에 조각을 섞어서 흩어 놓음
  function scatterPieces() {
    const g = game.geo, ew = g.pw + g.pad * 2, eh = g.ph + g.pad * 2;
    const zones = g.wide
      ? [{ x: 0, y: 0, w: g.bx, h: g.H }, { x: g.bx + g.bw, y: 0, w: g.W - g.bx - g.bw, h: g.H }]
      : [{ x: 0, y: g.by + g.bh + 8, w: g.W, h: g.H - g.by - g.bh - 8 }];
    const loose = game.pieces.filter((p) => !p.done).sort(() => Math.random() - 0.5);
    loose.forEach((p, i) => {
      const z = zones[i % zones.length];
      const x = z.x - g.pad * 0.6 + Math.random() * Math.max(0, z.w - ew + g.pad * 1.2);
      const y = z.y - g.pad * 0.6 + Math.random() * Math.max(0, z.h - eh + g.pad * 1.2);
      place(p, clamp(x, y));
      remember(p);
      p.el.style.zIndex = ++game.z;
    });
  }

  /* ---------- 끌어서 옮기기 ---------- */
  let drag = null;
  // 조각 그림의 투명한 모서리를 누르면 그 밑에 있는 조각을 집음
  function pieceAt(cx, cy) {
    for (const el of document.elementsFromPoint(cx, cy)) {
      if (!el.classList || !el.classList.contains('piece') || el.classList.contains('fixed')) continue;
      const r = el.getBoundingClientRect();
      const px = Math.floor((cx - r.left) * el.width / r.width), py = Math.floor((cy - r.top) * el.height / r.height);
      try {
        if (el.getContext('2d').getImageData(px, py, 1, 1).data[3] > 20) return el;
      } catch { return el; }
    }
    return null;
  }
  area.addEventListener('pointerdown', (e) => {
    if (!game || drag) return;
    const el = pieceAt(e.clientX, e.clientY);
    if (!el) return;
    const p = game.pieces.find((q) => q.el === el);
    if (!p || p.done) return;
    e.preventDefault();
    if (audio && audio.state === 'suspended') audio.resume();
    drag = { p, id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: p.x, oy: p.y };
    area.setPointerCapture(e.pointerId);
    el.classList.remove('snap');
    el.classList.add('lift');
    el.style.zIndex = ++game.z;
  });
  area.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    place(drag.p, clamp(drag.ox + e.clientX - drag.sx, drag.oy + e.clientY - drag.sy));
  });
  function drop(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const p = drag.p;
    drag = null;
    p.el.classList.remove('lift');
    const t = target(p);
    if (Math.hypot(p.x - t.x, p.y - t.y) < game.geo.S * 0.32) {
      p.done = true;
      p.el.classList.add('snap', 'fixed');
      p.el.style.zIndex = 1;
      place(p, t);
      game.placed++;
      updateCount();
      if (game.placed === game.pieces.length) finish(); else snapSound();
    } else {
      remember(p);
    }
  }
  area.addEventListener('pointerup', drop);
  area.addEventListener('pointercancel', drop);

  new ResizeObserver(() => layout(false)).observe(area);

  /* ---------- 위쪽 띠 ---------- */
  function tick() {
    if (!game) return;
    $('#time').textContent = fmt(Math.floor((Date.now() - game.start) / 1000));
  }
  const fmt = (sec) => Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  function updateCount() {
    const n = game.pieces.length;
    $('#count').textContent = `${game.placed} / ${n}`;
    $('#meter').style.width = (game.placed / n * 100) + '%';
  }
  function setHint(on) {
    game.hint = on;
    const b = $('#hint');
    b.textContent = on ? '👀 밑그림 끄기' : '👀 밑그림 켜기';
    b.setAttribute('aria-pressed', on);
    if (game.geo) drawGuide();
  }
  $('#hint').onclick = () => setHint(!game.hint);
  $('#shuffle').onclick = () => { scatterPieces(); };
  $('#toSetup').onclick = backToSetup;

  function backToSetup() {
    clearPieces();
    game = null;
    document.body.classList.remove('playing');
    $('#pop').hidden = true;
    $('#game').hidden = true;
    $('#setup').hidden = false;
  }

  /* ---------- 다 맞췄을 때 ---------- */
  function finish() {
    clearInterval(game.timer);
    const sec = Math.floor((Date.now() - game.start) / 1000);
    $('#time').textContent = fmt(sec);
    board.classList.add('done');
    winSound();
    confetti();
    const m = Math.floor(sec / 60), s = sec % 60;
    const took = (m ? m + '분 ' : '') + s + '초';
    $('#popMsg').textContent = `${game.pieces.length}조각을 ${took} 만에 다 맞췄어요!`;
    setTimeout(() => { $('#pop').hidden = false; $('#again').focus(); }, 900);
  }
  function confetti() {
    const box = $('#confetti');
    const colors = ['#FF8FB1', '#FFD45C', '#5FD0B0', '#7CC4FF', '#B79CFF', '#FFB37A'];
    for (let i = 0; i < 90; i++) {
      const c = document.createElement('i');
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = colors[i % colors.length];
      c.style.animationDuration = 1.8 + Math.random() * 1.8 + 's';
      c.style.animationDelay = Math.random() * 0.6 + 's';
      box.appendChild(c);
    }
    setTimeout(() => (box.innerHTML = ''), 4500);
  }
  $('#again').onclick = () => startGame(game.src);
  $('#other').onclick = backToSetup;
})();
