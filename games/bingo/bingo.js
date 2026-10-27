/* 도깨비 빙고: 그림을 뽑고, 내 빙고판에서 같은 그림을 찾아 콕! 가로·세로·대각선 줄을 채운다 */
(() => {
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const pickOne = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  const THEMES = (window.BINGO_THEMES || []).filter((t) => t.items.length >= 25);
  const GOALS = [
    { n: 1, face: '🐣', name: '1줄', sub: '쉽게', color: '#FFE3A5', dark: '#E8C478' },
    { n: 3, face: '🐥', name: '3줄', sub: '보통', color: '#D4F3E8', dark: '#9ED9C4' },
    { n: 5, face: '🐰', name: '5줄', sub: '어렵게', color: '#FFD9C2', dark: '#F0AE88' },
  ];
  // 가로 5줄, 세로 5줄, 대각선 2줄
  const LINES = [];
  for (let r = 0; r < 5; r++) LINES.push([0, 1, 2, 3, 4].map((c) => r * 5 + c));
  for (let c = 0; c < 5; c++) LINES.push([0, 1, 2, 3, 4].map((r) => r * 5 + c));
  LINES.push([0, 6, 12, 18, 24], [4, 8, 12, 16, 20]);

  // 저장은 이 기기 브라우저에만, 안 되면 그냥 넘어간다
  const store = {
    get(k, d) { try { const v = localStorage.getItem('bingo.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('bingo.' + k, JSON.stringify(v)); } catch {} },
  };
  let themeIdx = store.get('theme', 0);
  let goalIdx = store.get('goal', 0);
  if (!THEMES[themeIdx]) themeIdx = 0;
  if (!GOALS[goalIdx]) goalIdx = 0;
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
    draw: () => tone([440, 660], 'sine', 0.1, 0.07),
    mark: () => tone([700, 1050], 'triangle', 0.14, 0.06),
    miss: () => tone([220], 'sine', 0.08),
    line: () => tone([523, 659, 784, 1047], 'triangle', 0.14),
    end: () => tone([784, 659, 784, 1047], 'triangle', 0.15, 0.13),
  };

  /* ---------- 준비 화면 ---------- */
  const themesEl = $('#themes'), goalsEl = $('#goals');
  THEMES.forEach((t, i) => {
    const b = el('button', 'theme');
    b.style.setProperty('--c', t.color); b.style.setProperty('--cd', t.dark);
    b.innerHTML = `<b>${t.face}</b><strong>${t.name}</strong><span>${t.items.slice(0, 4).map((x) => x[0]).join(' ')}</span>`;
    b.onclick = () => { themeIdx = i; store.set('theme', i); paintSetup(); };
    themesEl.appendChild(b);
  });
  GOALS.forEach((g, i) => {
    const b = el('button', 'tm');
    b.style.setProperty('--c', g.color); b.style.setProperty('--cd', g.dark);
    b.innerHTML = `<b>${g.face}</b><strong>${g.name}</strong><span>${g.sub}</span><span class="best"></span>`;
    b.onclick = () => { goalIdx = i; store.set('goal', i); paintSetup(); };
    goalsEl.appendChild(b);
  });
  function paintSetup() {
    [...themesEl.children].forEach((b, i) => b.classList.toggle('on', i === themeIdx));
    [...goalsEl.children].forEach((b, i) => {
      b.classList.toggle('on', i === goalIdx);
      const best = store.get('best.' + GOALS[i].n, 0);
      const tag = b.querySelector('.best');
      tag.textContent = best ? `🏆 ${best}번 만에` : '';
      tag.hidden = !best;
    });
  }
  paintSetup();

  /* ---------- 빙고 ---------- */
  const boardEl = $('#board'), cardEl = $('#card'), drawBtn = $('#draw'), historyEl = $('#history'), tipEl = $('#tip');
  let G = null;
  let tipT;
  const tip = (text, keep) => { tipEl.textContent = text; clearTimeout(tipT); if (!keep) tipT = setTimeout(() => { tipEl.textContent = ''; }, 3200); };

  function start() {
    const theme = THEMES[themeIdx], goal = GOALS[goalIdx];
    G = {
      theme, goal: goal.n,
      board: shuffle(theme.items).slice(0, 25),   // 판에 놓인 그림 25개
      deck: shuffle(theme.items),                 // 뽑을 순서 (판에 없는 그림도 섞여 있다)
      called: [],                                  // 지금까지 뽑은 그림 이름
      marked: new Set(),                           // 내가 누른 칸 번호
      lines: 0, missed: 0, done: false,
    };
    $('#pop').hidden = true;
    $('#setup').hidden = true; $('#game').hidden = false;
    document.body.classList.add('playing');
    $('#goal').textContent = goal.n;
    $('#drawn').textContent = '0'; $('#lines').textContent = '0';
    cardEl.innerHTML = '<span class="wait">그림을 뽑아요!</span>';
    drawBtn.disabled = false; drawBtn.textContent = '🎁 그림 뽑기';
    boardEl.replaceChildren();
    G.board.forEach(([emoji, name], i) => {
      const b = el('button', 'cell');
      b.innerHTML = `<b aria-hidden="true">${emoji}</b><span>${name}</span>`;
      b.setAttribute('aria-label', name);
      b.onclick = () => mark(i);
      boardEl.appendChild(b);
    });
    paintHistory();
    tip('🎁 그림 뽑기를 누르고, 같은 그림을 내 판에서 찾아요', true);
    drawBtn.focus({ preventScroll: true });
  }

  const onBoard = (name) => G.board.findIndex((x) => x[1] === name);

  function draw() {
    if (!G || G.done) return;
    // 방금 나온 그림이 내 판에 있었는데 못 찾았으면 '놓친 그림'
    const last = G.called[G.called.length - 1];
    if (last) {
      const i = onBoard(last);
      if (i >= 0 && !G.marked.has(i)) {
        G.missed++;
        boardEl.children[i].classList.add('late');
        tip(`😮 방금 나온 '${last}'가 내 판에 있었어요! 지금이라도 눌러요`);
      } else tip('');
    }
    const item = G.deck[G.called.length];
    if (!item) return;
    G.called.push(item[1]);
    cardEl.innerHTML = `<b aria-hidden="true">${item[0]}</b><strong>${item[1]}</strong>`;
    cardEl.classList.remove('flip'); void cardEl.offsetWidth; cardEl.classList.add('flip');
    $('#drawn').textContent = G.called.length;
    paintHistory();
    snd.draw();
    if (G.called.length >= G.deck.length) {
      drawBtn.disabled = true; drawBtn.textContent = '그림을 다 뽑았어요';
      tip('🔍 그림이 다 나왔어요! 판에서 아직 안 누른 그림을 찾아봐요', true);
    }
  }

  function mark(i) {
    if (!G || G.done || G.marked.has(i)) return;
    const cell = boardEl.children[i], [, name] = G.board[i];
    if (!G.called.includes(name)) {
      cell.classList.remove('nope'); void cell.offsetWidth; cell.classList.add('nope');
      snd.miss();
      tip(`'${name}'는 아직 안 나왔어요. 나온 그림만 눌러요!`);
      return;
    }
    G.marked.add(i);
    cell.classList.remove('late');
    cell.classList.add('marked');
    cell.setAttribute('aria-pressed', 'true');
    snd.mark();
    const full = LINES.filter((line) => line.every((k) => G.marked.has(k)));
    full.forEach((line) => line.forEach((k) => boardEl.children[k].classList.add('line')));
    if (full.length > G.lines) {
      G.lines = full.length;
      $('#lines').textContent = G.lines;
      const chip = $('.chip.lines'); chip.classList.remove('up'); void chip.offsetWidth; chip.classList.add('up');
      if (G.lines >= G.goal) { G.done = true; drawBtn.disabled = true; setTimeout(finish, 900); }
      else { snd.line(); tip(`🎉 빙고 ${G.lines}줄! ${G.goal - G.lines}줄 더 채워요`); }
    }
  }

  function paintHistory() {
    historyEl.replaceChildren();
    if (!G.called.length) { historyEl.appendChild(el('span', 'none', '아직 없어요')); return; }
    G.called.slice().reverse().forEach((name) => {
      const item = G.theme.items.find((x) => x[1] === name);
      const c = el('span', 'hchip', `${item[0]} ${name}`);
      if (onBoard(name) < 0) c.classList.add('off');
      historyEl.appendChild(c);
    });
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
    const stars = G.missed === 0 ? 3 : G.missed <= 2 ? 2 : 1;
    $('#popStars').textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
    $('#popTitle').textContent = `빙고 ${G.goal}줄 완성!`;
    $('#stats').innerHTML = '';
    [['🎁 뽑은 그림', G.called.length], ['✅ 찾은 그림', G.marked.size], ['😮 놓친 그림', G.missed]].forEach(([k, v]) => {
      const d = el('div'); d.append(el('b', '', v), el('span', '', k)); $('#stats').appendChild(d);
    });
    let msg = G.missed ? '나온 그림을 바로바로 찾으면 별이 더 많아져요.' : '나온 그림을 하나도 안 놓쳤어요!';
    const key = 'best.' + G.goal, best = store.get(key, 0);
    if (!best || G.called.length < best) { store.set(key, G.called.length); if (best) msg += ' 🏆 새 기록!'; }
    else msg += ` 내 최고는 ${best}번 만에!`;
    $('#popMsg').textContent = msg;
    $('#pop').hidden = false;
    snd.end();
    confetti();
  }
  function toSetup() {
    G = null;
    clearTimeout(tipT);
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
  drawBtn.onclick = draw;
  const soundBtn = $('#sound');
  const paintSound = () => { soundBtn.setAttribute('aria-pressed', soundOn); soundBtn.textContent = soundOn ? '🔊 소리' : '🔇 소리'; };
  soundBtn.onclick = () => { soundOn = !soundOn; store.set('sound', soundOn); paintSound(); };
  paintSound();
})();
