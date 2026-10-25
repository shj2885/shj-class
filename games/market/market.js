/* 도깨비 시장놀이: 장보기(물건값만큼 돈 내기)와 내 가게 차리기(팔고 거스름돈 주기) */
(() => {
  const $ = (s) => document.querySelector(s);
  const won = (n) => n.toLocaleString('ko-KR') + '원';
  const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = rand(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  // 저장은 이 기기 브라우저에만, 안 되면 그냥 넘어간다
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };

  /* ---------- 소리 ---------- */
  let ac;
  function beep(ok) {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const notes = ok ? [660, 880, 1320] : [300, 220];
      notes.forEach((f, i) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = ok ? 'triangle' : 'sine'; o.frequency.value = f;
        const t = ac.currentTime + i * 0.12;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
        o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.25);
      });
    } catch {}
  }
  function clink() {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
      o.type = 'square'; o.frequency.value = 1500;
      g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.09);
    } catch {}
  }

  /* ---------- 알림 창 ---------- */
  let popDone = null;
  function pop(face, msg, then) {
    $('#popFace').textContent = face; $('#popMsg').textContent = msg;
    popDone = then || null;
    $('#pop').hidden = false; $('#popOk').focus();
  }
  $('#popOk').onclick = () => { $('#pop').hidden = true; const f = popDone; popDone = null; if (f) f(); };

  /* ---------- 화면 바꾸기 ---------- */
  const screens = ['home', 'buy', 'store', 'shop', 'book'];
  function show(id) {
    screens.forEach((s) => { $('#' + s).hidden = s !== id; });
    window.scrollTo(0, 0);
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-go]');
    if (!b) return;
    const go = b.dataset.go;
    if (go === 'buy') startBuy();
    else if (go === 'store') openSetup();
    else show(go);
  });
  $('#brand').onclick = (e) => { e.preventDefault(); show('home'); };

  /* ---------- 돈: 지폐 3장 + 동전 4개 (그림은 money/ 폴더) ---------- */
  const MONEY = [
    { v: 10000, bill: true }, { v: 5000, bill: true }, { v: 1000, bill: true },
    { v: 500, s: 64 }, { v: 100, s: 58 }, { v: 50, s: 52 }, { v: 10, s: 54 },
  ];
  function cashEl(m) {
    const b = el('button', 'cash ' + (m.bill ? 'bill' : 'coin'));
    b.type = 'button';
    if (!m.bill) b.style.setProperty('--s', m.s + 'px');
    const img = el('img');
    img.src = '/games/market/money/' + m.v + '.png';
    img.alt = ''; img.draggable = false;
    b.append(img);
    b.setAttribute('aria-label', won(m.v));
    return b;
  }

  // 돈 버튼 판 + 낸 돈 쟁반 한 벌
  function wallet(moneyEl, trayEl, paidEl, onChange) {
    const count = {};
    function draw() {
      trayEl.textContent = '';
      let sum = 0;
      MONEY.forEach((m) => {
        const n = count[m.v] || 0;
        if (!n) return;
        sum += m.v * n;
        const b = cashEl(m);
        b.title = '눌러서 다시 가져오기';
        if (n > 1) b.append(el('i', 'n', '×' + n));
        b.onclick = () => { count[m.v]--; clink(); draw(); };
        trayEl.append(b);
      });
      paidEl.textContent = won(sum);
      api.total = sum;
      if (onChange) onChange(sum);
    }
    MONEY.forEach((m) => {
      const cell = el('div', 'moneyCell');
      const b = cashEl(m);
      b.onclick = () => { count[m.v] = (count[m.v] || 0) + 1; clink(); draw(); };
      cell.append(b, el('small', '', won(m.v)));
      moneyEl.append(cell);
    });
    const api = { total: 0, reset() { MONEY.forEach((m) => { count[m.v] = 0; }); draw(); } };
    api.reset();
    return api;
  }

  /* =====================================================
     장보기
     ===================================================== */
  const GROCERY = [
    ['🍎', '사과'], ['🍌', '바나나'], ['🥚', '달걀'], ['🥛', '우유'], ['🥕', '당근'], ['🍉', '수박'],
    ['🐟', '고등어'], ['🥒', '오이'], ['🍞', '식빵'], ['🧀', '치즈'], ['🍇', '포도'], ['🍓', '딸기'],
    ['🥔', '감자'], ['🍅', '토마토'], ['🌽', '옥수수'], ['🍦', '아이스크림'], ['🍪', '과자'], ['🧃', '주스'],
  ];
  // n: 물건 몇 개, unit: 값 단위, lo~hi: 한 물건 값 = unit × (lo~hi), change: 거스름돈 받기
  const LEVELS = [
    { name: '1단계 · 물건 1개 · 천 원 단위', n: [1, 1], unit: 1000, lo: 1, hi: 9 },
    { name: '2단계 · 물건 2개 · 천 원 단위', n: [2, 2], unit: 1000, lo: 1, hi: 5 },
    { name: '3단계 · 물건 3개 · 천 원 단위', n: [3, 3], unit: 1000, lo: 1, hi: 5 },
    { name: '4단계 · 물건 1개 · 백 원 단위', n: [1, 1], unit: 100, lo: 5, hi: 60 },
    { name: '5단계 · 물건 2개 · 백 원 단위', n: [2, 2], unit: 100, lo: 5, hi: 40 },
    { name: '6단계 · 물건 2~3개 · 백 원 단위', n: [2, 3], unit: 100, lo: 5, hi: 40 },
    { name: '7단계 · 물건 2~4개 · 십 원 단위', n: [2, 4], unit: 10, lo: 50, hi: 300 },
    { name: '8단계 · 만 원 내고 거스름돈 받기', n: [1, 3], unit: 100, lo: 5, hi: 30, change: 10000 },
  ];
  const levelSel = $('#level');
  LEVELS.forEach((l, i) => levelSel.append(new Option(l.name, i)));
  levelSel.value = store.get('market.level', 0);
  let stars = store.get('market.stars', 0);
  let q = null;

  const buyWallet = wallet($('#money'), $('#tray'), $('#paid'));

  function startBuy() { show('buy'); newQuestion(); }

  function newQuestion() {
    const lv = LEVELS[+levelSel.value] || LEVELS[0];
    const picks = shuffle(GROCERY.slice()).slice(0, rand(lv.n[0], lv.n[1]));
    const items = picks.map(([em, nm]) => ({ em, nm, price: lv.unit * rand(lv.lo, lv.hi) }));
    const total = items.reduce((s, it) => s + it.price, 0);
    q = { lv, items, total, answer: lv.change ? lv.change - total : total };

    const goods = $('#goods'); goods.textContent = '';
    items.forEach((it, i) => { const g = el('div', 'good', it.em); g.style.animationDelay = i * 0.08 + 's'; goods.append(g); });
    const prices = $('#prices'); prices.textContent = '';
    items.forEach((it) => {
      const li = el('li');
      li.append(el('span', '', it.em + ' ' + it.nm), el('span', '', won(it.price)));
      prices.append(li);
    });
    $('#ask').textContent = lv.change
      ? `만 원을 냈어요. 거스름돈은 얼마일까요? 돈으로 놓아 보세요.`
      : `모두 얼마일까요? 딱 맞게 내 보세요.`;
    $('#paidLabel').textContent = lv.change ? '거스름돈' : '낸 돈';
    $('#hintText').hidden = true;
    $('#stars').textContent = '⭐ ' + stars;
    buyWallet.reset();
  }

  $('#hint').onclick = () => {
    const p = q.items.map((it) => it.price.toLocaleString('ko-KR'));
    let t = p.length > 1 ? p.join(' + ') + ' = ?' : '물건값은 ' + p[0] + '원이에요.';
    if (q.lv.change) {
      t = '10,000 − ' + (p.length > 1 ? '(' + p.join(' + ') + ')' : p[0]) + ' = ?';
    }
    $('#hintText').textContent = t;
    $('#hintText').hidden = false;
  };

  $('#check').onclick = () => {
    const paid = buyWallet.total;
    if (paid === 0) { pop('🪙', '먼저 아래 돈을 눌러서 내 보세요.'); return; }
    if (paid === q.answer) {
      stars++; store.set('market.stars', stars); beep(true);
      const msg = q.lv.change
        ? `정답이에요!\n물건값 ${won(q.total)}, 거스름돈 ${won(q.answer)}`
        : `정답이에요!\n모두 ${won(q.total)}이에요.`;
      pop('🎉', msg, newQuestion);
    } else {
      beep(false);
      const less = paid < q.answer;
      if (q.lv.change) pop('🤔', less ? '거스름돈이 조금 모자라요.\n다시 세어 볼까요?' : '거스름돈이 너무 많아요.\n다시 세어 볼까요?');
      else pop('🤔', less ? '돈이 부족해요.\n조금 더 내 볼까요?' : '너무 많이 냈어요.\n딱 맞게 내 볼까요?');
    }
  };
  $('#reset').onclick = () => buyWallet.reset();
  levelSel.onchange = () => { store.set('market.level', +levelSel.value); newQuestion(); };

  /* =====================================================
     내 가게 차리기
     ===================================================== */
  const KINDS = {
    '🍎 과일가게': [['🍎', '사과', 1000], ['🍌', '바나나', 1500], ['🍇', '포도', 3000], ['🍓', '딸기', 4000], ['🍊', '귤', 500], ['🍉', '수박', 8000], ['🍑', '복숭아', 2000], ['🍍', '파인애플', 5000]],
    '🍞 빵집': [['🍞', '식빵', 2500], ['🥐', '크루아상', 1800], ['🥯', '베이글', 1500], ['🍩', '도넛', 1200], ['🧁', '컵케이크', 2000], ['🍰', '케이크', 9000], ['🥖', '바게트', 3000], ['🍪', '쿠키', 700]],
    '✏️ 문구점': [['✏️', '연필', 500], ['🖍️', '크레파스', 3000], ['📒', '공책', 1000], ['✂️', '가위', 2000], ['📏', '자', 800], ['🎨', '물감', 4000], ['🖊️', '볼펜', 700], ['📌', '압정', 300]],
    '🧸 장난감가게': [['🧸', '곰인형', 7000], ['🚗', '자동차', 5000], ['🪀', '요요', 1500], ['🎈', '풍선', 300], ['🪁', '연', 3000], ['⚽', '공', 4000], ['🧩', '퍼즐', 6000], ['🎲', '주사위', 500]],
    '🍢 분식집': [['🍢', '어묵', 700], ['🍙', '주먹밥', 1500], ['🌭', '핫도그', 2000], ['🍜', '라면', 3500], ['🥟', '만두', 3000], ['🍡', '떡꼬치', 1000], ['🥤', '음료수', 1200], ['🍦', '아이스크림', 1000]],
  };
  const freshItems = (kind) => KINDS[kind].map(([em, nm, price]) => ({ em, nm, price, on: true }));
  let shop = store.get('market.shop', null);
  if (!shop || !KINDS[shop.kind]) shop = { name: '', kind: Object.keys(KINDS)[0], items: null };
  if (!shop.items) shop.items = freshItems(shop.kind);
  let sales = store.get('market.sales', []);

  function openSetup() {
    $('#shopName').value = shop.name;
    drawKinds(); drawStock(); show('store');
  }
  function drawKinds() {
    const box = $('#kinds'); box.textContent = '';
    Object.keys(KINDS).forEach((k) => {
      const b = el('button', 'kind', k);
      b.type = 'button';
      b.setAttribute('aria-pressed', k === shop.kind);
      b.onclick = () => {
        if (k === shop.kind) return;
        shop.kind = k; shop.items = freshItems(k);
        drawKinds(); drawStock();
      };
      box.append(b);
    });
  }
  function drawStock() {
    const ul = $('#stock'); ul.textContent = '';
    shop.items.forEach((it) => {
      const li = el('li', it.on ? '' : 'off');
      const on = el('input', 'on'); on.type = 'checkbox'; on.checked = it.on;
      on.setAttribute('aria-label', it.nm + ' 팔기');
      on.onchange = () => { it.on = on.checked; li.className = it.on ? '' : 'off'; };
      const out = el('output', '', won(it.price));
      const step = el('span', 'step');
      const minus = el('button', '', '−'), plus = el('button', '', '+');
      minus.type = plus.type = 'button';
      minus.setAttribute('aria-label', it.nm + ' 값 내리기');
      plus.setAttribute('aria-label', it.nm + ' 값 올리기');
      minus.onclick = () => { it.price = Math.max(100, it.price - 100); out.textContent = won(it.price); };
      plus.onclick = () => { it.price = Math.min(50000, it.price + 100); out.textContent = won(it.price); };
      step.append(minus, out, plus);
      li.append(on, el('span', 'em', it.em), el('span', 'nm', it.nm), step);
      ul.append(li);
    });
  }

  $('#open').onclick = () => {
    shop.name = $('#shopName').value.trim();
    if (!shop.items.some((it) => it.on)) { pop('📦', '팔 물건을 하나 이상 골라 주세요.'); return; }
    store.set('market.shop', shop);
    startShop();
  };

  /* ---------- 장사 ---------- */
  let cart = new Map(); // 물건 번호 → 개수
  let phase = 'cart';   // cart → pay → change
  let received = 0;     // 손님이 낸 돈

  const shopWallet = wallet($('#shopMoney'), $('#shopTray'), $('#shopPaid'));

  function startShop() {
    $('#sign').textContent = shop.name || shop.kind.split(' ')[1];
    cart = new Map();
    const shelf = $('#shelf'); shelf.textContent = '';
    shop.items.forEach((it, i) => {
      if (!it.on) return;
      const b = el('button', 'item');
      b.type = 'button';
      b.append(el('b', '', it.em), el('strong', '', it.nm), el('span', '', won(it.price)));
      b.onclick = () => { if (phase !== 'cart') return; cart.set(i, (cart.get(i) || 0) + 1); clink(); drawCart(); };
      shelf.append(b);
    });
    setPhase('cart'); drawSales(); show('shop');
  }
  const cartTotal = () => [...cart].reduce((s, [i, n]) => s + shop.items[i].price * n, 0);

  function drawCart() {
    const ul = $('#cart'); ul.textContent = '';
    if (!cart.size) ul.append(el('li', 'empty', '왼쪽 물건을 눌러 담아요'));
    cart.forEach((n, i) => {
      const it = shop.items[i];
      const li = el('li');
      const step = el('span', 'step');
      const minus = el('button', '', '−'), plus = el('button', '', '+');
      minus.type = plus.type = 'button';
      minus.onclick = () => { if (n > 1) cart.set(i, n - 1); else cart.delete(i); drawCart(); };
      plus.onclick = () => { cart.set(i, n + 1); drawCart(); };
      step.append(minus, el('output', '', n + '개'), plus);
      li.append(el('span', 'em', it.em), el('span', 'nm', it.nm + ' ' + won(it.price * n)), step);
      ul.append(li);
    });
    $('#cartTotal').textContent = won(cartTotal());
    $('#toPay').disabled = !cart.size;
  }

  function setPhase(p) {
    phase = p;
    $('#stepCart').hidden = p !== 'cart';
    $('#stepMoney').hidden = p === 'cart';
    if (p === 'cart') { drawCart(); return; }
    const total = cartTotal();
    if (p === 'pay') {
      $('#moneyTitle').textContent = '🙋 손님: 돈을 내 주세요';
      $('#moneyInfo').textContent = '물건값은 ' + won(total) + '이에요.';
      $('#shopPaidLabel').textContent = '낸 돈';
      $('#shopOk').textContent = '다 냈어요';
    } else {
      $('#moneyTitle').textContent = '🧑‍🍳 주인: 거스름돈을 주세요';
      $('#moneyInfo').textContent = `손님이 ${won(received)}을 냈어요. 물건값은 ${won(total)}이에요. 거스름돈은 얼마일까요?`;
      $('#shopPaidLabel').textContent = '거스름돈';
      $('#shopOk').textContent = '거스름돈 주기';
    }
    shopWallet.reset();
    // 휴대폰에서는 계산대가 물건 아래에 있으니 그쪽으로 내려 준다
    if (matchMedia('(max-width: 760px)').matches) $('.counter').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  $('#toPay').onclick = () => setPhase('pay');
  $('#shopBack').onclick = () => setPhase(phase === 'change' ? 'pay' : 'cart');
  $('#shopOk').onclick = () => {
    const total = cartTotal(), money = shopWallet.total;
    if (phase === 'pay') {
      if (money === 0) { pop('🪙', '아래 돈을 눌러서 내 주세요.'); return; }
      if (money < total) { beep(false); pop('🤔', `돈이 부족해요.\n${won(total - money)}이 더 필요해요.`); return; }
      received = money;
      if (money === total) { sell(total, 0); return; }
      setPhase('change');
    } else {
      const change = received - total;
      if (money === change) sell(total, change);
      else { beep(false); pop('🤔', money < change ? '거스름돈이 조금 모자라요.\n다시 세어 볼까요?' : '거스름돈이 너무 많아요.\n다시 세어 볼까요?'); }
    }
  };

  function sell(total, change) {
    const items = [...cart].map(([i, n]) => shop.items[i].em + (n > 1 ? '×' + n : '')).join(' ');
    const d = new Date();
    sales.push({ t: d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'), items, total });
    store.set('market.sales', sales);
    beep(true);
    pop('🙇', (change ? `거스름돈 ${won(change)}, 정답!\n` : '딱 맞게 냈어요!\n') + '고맙습니다. 또 오세요!', () => {
      cart = new Map(); setPhase('cart'); drawSales();
    });
  }
  function drawSales() {
    $('#sales').textContent = '번 돈 ' + won(sales.reduce((s, x) => s + x.total, 0));
  }

  $('#editShop').onclick = openSetup;
  $('#close').onclick = () => {
    const sum = $('#bookSum'); sum.textContent = '';
    [['🙋 손님', sales.length + '명'],
     ['📦 판 물건', sales.reduce((s, x) => s + x.items.split(' ').reduce((a, w) => a + (+(w.split('×')[1]) || 1), 0), 0) + '개'],
     ['💰 번 돈', won(sales.reduce((s, x) => s + x.total, 0))]].forEach(([a, b]) => {
      const d = el('div'); d.append(el('span', '', a), el('strong', '', b)); sum.append(d);
    });
    const ul = $('#ledger'); ul.textContent = '';
    if (!sales.length) ul.append(el('li', 'empty', '아직 판 물건이 없어요'));
    sales.forEach((x, n) => {
      const li = el('li');
      li.append(el('span', '', `${n + 1}. ${x.t}  ${x.items}`), el('span', '', won(x.total)));
      ul.append(li);
    });
    show('book');
  };
  const newDay = () => { sales = []; store.set('market.sales', sales); };
  $('#again').onclick = () => { newDay(); startShop(); };
  $('#newShop').onclick = () => { newDay(); openSetup(); };
})();
