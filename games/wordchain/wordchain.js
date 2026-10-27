/* 도깨비 끝말잇기: 도깨비가 낸 낱말의 끝 글자로 시작하는 낱말을 써서 잇는다 (두음법칙도 된다) */
(() => {
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const pickOne = (a) => a[Math.floor(Math.random() * a.length)];

  const WORDS = [...new Set((window.WORDCHAIN_WORDS || []).map((w) => w.normalize('NFC')).filter((w) => /^[가-힣]{2,}$/.test(w)))];
  const WORD_SET = new Set(WORDS);
  const MODES = [
    { key: 'easy', em: '1단계', face: '🌱', name: '쉽게', desc: '잇기 쉬운 낱말을\n내 줘요', color: '#D4F3E8', dark: '#9ED9C4' },
    { key: 'mid', em: '2단계', face: '🧭', name: '보통', desc: '아무 낱말이나\n골라 내요', color: '#FFE3A5', dark: '#E8C478' },
    { key: 'hard', em: '3단계', face: '🏆', name: '어렵게', desc: '잇기 어려운 낱말만\n골라 내요', color: '#FFD3E0', dark: '#F0A9C0' },
  ];
  const GOALS = [
    { n: 5, face: '🐣', name: '5개', sub: '짧게', color: '#FFE3A5', dark: '#E8C478' },
    { n: 10, face: '🐥', name: '10개', sub: '보통', color: '#D4F3E8', dark: '#9ED9C4' },
    { n: 0, face: '🐉', name: '끝까지', sub: '도깨비가 막힐 때까지', color: '#E6DCFF', dark: '#BFAAF0' },
  ];
  const OPENINGS = ['사과', '바나나', '토끼', '기차', '나무', '학교', '하마', '피아노', '구름', '우산'].filter((w) => WORD_SET.has(w));

  // 저장은 이 기기 브라우저에만, 안 되면 그냥 넘어간다
  const store = {
    get(k, d) { try { const v = localStorage.getItem('wordchain.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('wordchain.' + k, JSON.stringify(v)); } catch {} },
  };
  let modeIdx = store.get('mode', 0);
  let goalIdx = store.get('goal', 0);
  if (!MODES[modeIdx]) modeIdx = 0;
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
    ok: () => tone([700, 1050], 'triangle', 0.14, 0.06),
    dok: () => tone([520, 390], 'sine', 0.08, 0.08),
    bad: () => tone([230, 180], 'sine', 0.1),
    end: () => tone([784, 659, 784, 1047], 'triangle', 0.15, 0.13),
  };

  /* ---------- 글자: 끝 글자와 두음법칙 (력→역, 녀→여, 라→나 …) ---------- */
  const lastChar = (w) => w[w.length - 1];
  function starts(ch) {
    const c = ch.charCodeAt(0) - 0xAC00;
    if (c < 0 || c > 11171) return [ch];
    let cho = Math.floor(c / 588);
    const jung = Math.floor((c % 588) / 28), jong = c % 28;
    const yi = [2, 6, 7, 12, 17, 20].includes(jung); // ㅑ ㅕ ㅖ ㅛ ㅠ ㅣ
    if (cho === 5) cho = yi ? 11 : 2;               // ㄹ → ㅇ 또는 ㄴ
    else if (cho === 2 && yi) cho = 11;             // ㄴ → ㅇ
    else return [ch];
    return [ch, String.fromCharCode(0xAC00 + cho * 588 + jung * 28 + jong)];
  }
  const canFollow = (prev, next) => starts(lastChar(prev)).includes(next[0]);
  const nextWords = (w, used) => WORDS.filter((x) => !used.has(x) && x !== w && canFollow(w, x));
  // w 다음에 도깨비가 낼 수 있는 낱말: 아이가 또 이어 갈 낱말이 하나는 남는 것만 (아이가 꽉 막히지 않게)
  const goblinWords = (w, used) => {
    const u = new Set([...used, w]);
    return nextWords(w, u).filter((x) => nextWords(x, new Set([...u, x])).length > 0);
  };

  /* ---------- 준비 화면 ---------- */
  const modesEl = $('#modes'), goalsEl = $('#goals');
  MODES.forEach((m, i) => {
    const b = el('button', 'mode');
    b.style.setProperty('--c', m.color); b.style.setProperty('--cd', m.dark);
    b.innerHTML = `<em>${m.em}</em><b>${m.face}</b><strong>${m.name}</strong><span>${m.desc.replace('\n', '<br>')}</span>`;
    b.onclick = () => { modeIdx = i; store.set('mode', i); paintSetup(); };
    modesEl.appendChild(b);
  });
  GOALS.forEach((g, i) => {
    const b = el('button', 'tm');
    b.style.setProperty('--c', g.color); b.style.setProperty('--cd', g.dark);
    b.innerHTML = `<b>${g.face}</b><strong>${g.name}</strong><span>${g.sub}</span><span class="best"></span>`;
    b.onclick = () => { goalIdx = i; store.set('goal', i); paintSetup(); };
    goalsEl.appendChild(b);
  });
  function paintSetup() {
    [...modesEl.children].forEach((b, i) => b.classList.toggle('on', i === modeIdx));
    [...goalsEl.children].forEach((b, i) => {
      b.classList.toggle('on', i === goalIdx);
      const best = GOALS[i].n ? 0 : store.get('best.' + MODES[modeIdx].key, 0);
      const tag = b.querySelector('.best');
      tag.textContent = best ? `🏆 ${best}개` : '';
      tag.hidden = !best;
    });
  }
  paintSetup();

  /* ---------- 끝말잇기 ---------- */
  const entry = $('#entry'), sendBtn = $('#send'), hintBtn = $('#hint'), tipEl = $('#tip');
  let G = null;
  const tip = (text, bad) => { tipEl.textContent = text; tipEl.classList.toggle('bad', !!bad); };

  function start() {
    G = { mode: modeIdx, goal: GOALS[goalIdx].n, used: new Set(), chain: [], mine: 0, hints: 0, wrong: 0, busy: false, done: false };
    $('#pop').hidden = true;
    $('#setup').hidden = true; $('#game').hidden = false;
    document.body.classList.add('playing');
    $('#goalText').textContent = G.goal ? ` / ${G.goal}개` : '개';
    $('#train').replaceChildren();
    say(pickOne(OPENINGS.filter((w) => nextWords(w, G.used).length)), false); // 이을 낱말이 있는 말로만 시작
    paintBar();
    tip('');
  }

  // 낱말 하나를 줄에 놓는다 (me: 내가 낸 낱말인지)
  function say(word, me) {
    G.used.add(word);
    G.chain.push({ word, me });
    const w = el('span', 'tw' + (me ? ' me' : ''), word);
    $('#train').appendChild(w);
    $('#train').scrollLeft = $('#train').scrollWidth;

    $('#who').classList.toggle('me', me);
    $('#who').innerHTML = me ? '<b>🧒</b><span>내가 이은 낱말</span>' : '<img src="/logo.png" alt="" width="40" height="40"><span>도깨비가 낸 낱말</span>';
    const wd = $('#word'); wd.replaceChildren();
    wd.append(word.slice(0, -1), el('mark', '', lastChar(word)));
    const card = $('#card'); card.classList.remove('flip'); void card.offsetWidth; card.classList.add('flip');

    const st = starts(lastChar(word));
    $('#need').textContent = st.join(' · ');
    $('#needSub').textContent = st.length > 1 ? `(으)로 시작해요 — '${st[1]}'도 돼요` : '(으)로 시작해요';
    $('#hintList').replaceChildren();
  }

  function paintBar() {
    $('#linked').textContent = G.mine;
    $('#hintCount').textContent = G.hints;
    const lock = G.busy || G.done;
    entry.disabled = lock; sendBtn.disabled = lock; hintBtn.disabled = lock;
  }

  function submit(e) {
    e.preventDefault();
    if (!G || G.busy || G.done) return;
    const w = entry.value.replace(/\s+/g, '').normalize('NFC');
    const prev = G.chain[G.chain.length - 1].word;
    const need = starts(lastChar(prev)).map((c) => `'${c}'`).join(' 또는 ');
    let why = '';
    if (!w) why = '이어 말할 낱말을 써 주세요!';
    else if (!/^[가-힣]+$/.test(w)) why = '한글로 다 쓴 낱말만 낼 수 있어요.';
    else if (w.length < 2) why = '두 글자 이상인 낱말을 써요.';
    else if (!canFollow(prev, w)) why = `${need}(으)로 시작하는 낱말이어야 해요!`;
    else if (G.used.has(w)) why = '이미 나온 낱말이에요. 다른 낱말을 찾아봐요!';
    else if (!WORD_SET.has(w)) why = `'${w}'는 도깨비 낱말 책에 없어요. 다른 낱말이나 힌트를 써 봐요!`;
    if (why) {
      if (w) G.wrong++;
      snd.bad(); tip('😅 ' + why, true);
      const f = $('#answer'); f.classList.remove('nope'); void f.offsetWidth; f.classList.add('nope');
      entry.focus(); entry.select();
      return;
    }
    entry.value = '';
    G.mine++;
    say(w, true);
    snd.ok();
    if (G.goal && G.mine >= G.goal) { finish(true); return; }
    G.busy = true; paintBar();
    tip('🤔 도깨비가 생각하고 있어요…');
    setTimeout(goblinTurn, 900);
  }

  function goblinTurn() {
    if (!G || G.done) return;
    const prev = G.chain[G.chain.length - 1].word;
    const opts = goblinWords(prev, G.used);
    if (!opts.length) { finish(true, true); return; }
    let pick;
    if (G.mode === 1) pick = pickOne(opts);
    else {
      const score = (w) => nextWords(w, new Set([...G.used, w])).length;
      const counts = opts.map(score);
      const want = G.mode === 0 ? Math.max(...counts) : Math.min(...counts);
      pick = pickOne(opts.filter((_, i) => counts[i] === want));
    }
    say(pick, false);
    snd.dok();
    G.busy = false; paintBar();
    tip('');
    entry.focus({ preventScroll: true });
  }

  function showHints() {
    if (!G || G.busy || G.done) return;
    const prev = G.chain[G.chain.length - 1].word;
    // 도깨비가 이어 갈 수 있는 낱말을 먼저 보여 준다 (힌트만 누르면 바로 이기지 않게)
    const all = nextWords(prev, G.used).sort(() => Math.random() - 0.5);
    const good = all.filter((w) => goblinWords(w, G.used).length);
    const list = [...good, ...all.filter((w) => !good.includes(w))].slice(0, 3);
    const box = $('#hintList'); box.replaceChildren();
    if (!list.length) { box.appendChild(el('span', 'none', '힌트가 없어요. 직접 생각해 봐요!')); return; }
    G.hints++; paintBar();
    list.forEach((w) => {
      const b = el('button', 'hchip', w); b.type = 'button';
      b.onclick = () => { entry.value = w; entry.focus(); };
      box.appendChild(b);
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
  // won: 목표만큼 이었거나 도깨비가 막힘, stuck: 도깨비가 막혀서 끝남
  function finish(won, stuck) {
    if (!G || G.done) return;
    G.done = true; G.busy = false; paintBar();
    const stars = !won ? (G.mine ? 1 : 0) : G.hints === 0 ? 3 : G.hints <= 2 ? 2 : 1;
    $('#popStars').textContent = stars ? '⭐'.repeat(stars) + '☆'.repeat(3 - stars) : '🙂';
    $('#popTitle').textContent = stuck ? '도깨비가 막혔어요! 내가 이겼어요!' : won ? `${G.goal}개 다 이었어요!` : G.mine ? '여기까지 했어요!' : '다음에 또 해요!';
    $('#stats').innerHTML = '';
    [['🔗 내가 이은 낱말', G.mine], ['💡 힌트', G.hints], ['😅 다시 쓴 횟수', G.wrong]].forEach(([k, v]) => {
      const d = el('div'); d.append(el('b', '', v), el('span', '', k)); $('#stats').appendChild(d);
    });
    let msg = won ? (G.hints ? '다음엔 힌트를 덜 보고 해 봐요.' : '힌트 없이 해냈어요!') : '낱말을 더 많이 이어 봐요.';
    if (!G.goal) {
      const key = 'best.' + MODES[G.mode].key, best = store.get(key, 0);
      if (G.mine > best) { store.set(key, G.mine); if (best) msg += ' 🏆 새 기록!'; }
      else if (best) msg += ` 내 최고는 ${best}개!`;
    }
    $('#popMsg').textContent = msg;
    $('#pop').hidden = false;
    if (won) { snd.end(); confetti(); }
  }
  function toSetup() {
    G = null;
    $('#pop').hidden = true;
    $('#game').hidden = true; $('#setup').hidden = false;
    document.body.classList.remove('playing');
    paintSetup();
  }

  /* ---------- 버튼 ---------- */
  $('#start').onclick = start;
  $('#again').onclick = start;
  $('#other').onclick = toSetup;
  $('#stop').onclick = () => { if (G && !G.done && G.mine) finish(false); else toSetup(); };
  $('#answer').onsubmit = submit;
  hintBtn.onclick = showHints;
  const soundBtn = $('#sound');
  const paintSound = () => { soundBtn.setAttribute('aria-pressed', soundOn); soundBtn.textContent = soundOn ? '🔊 소리' : '🔇 소리'; };
  soundBtn.onclick = () => { soundOn = !soundOn; store.set('sound', soundOn); paintSound(); };
  paintSound();
})();
