// 말랑 그림판: 그림은 이 컴퓨터 안에서만 그리고, 저장도 내려받기로만 한다(서버로 보내지 않는다).
// 종이는 세 겹이다: 맨 아래 도안(불러온 그림·달력·픽셀판) → 아이가 그린 그림 → 지금 긋고 있는 선(ghost).
(function () {
  const COLORS = [
    ["검정", "#141414"], ["회색", "#8A8A8A"], ["흰색", "#FFFFFF"], ["갈색", "#8B5A2B"],
    ["살구", "#FFC9A3"], ["빨강", "#E8443A"], ["주황", "#FF8A1F"], ["노랑", "#FFD43B"],
    ["연두", "#9BD41C"], ["초록", "#1F9D55"], ["하늘", "#38B6FF"], ["파랑", "#2F5BEA"],
    ["보라", "#8E4DE0"], ["분홍", "#FF6FB5"]
  ];
  const STAMPS = {
    "❤️ 기본": ["❤️", "⭐", "🌈", "😀", "🎈", "👑", "🍦", "🚗", "✨", "🎵", "💎", "🏠", "☁️", "🌙"],
    "🌸 봄": ["🌸", "🌷", "🌼", "🌱", "🍀", "🦋", "🐝", "🐞", "🐣", "🍓", "🪺", "🌻", "☂️", "🎒"],
    "☀️ 여름": ["☀️", "🌊", "🍉", "🍧", "🐚", "🦀", "🐠", "🐬", "🐳", "⛱️", "🏖️", "🌴", "🍹", "⛵"],
    "🍂 가을": ["🍂", "🍁", "🌾", "🍎", "🍇", "🌰", "🍄", "🐿️", "🦔", "🦉", "🎃", "🍠", "🪁", "🌕"],
    "❄️ 겨울": ["❄️", "☃️", "⛄", "🎄", "🎁", "🧣", "🧤", "🔔", "🦌", "🐧", "🍫", "⛸️", "🛷", "🕯️"],
    "🐾 동물": ["🐶", "🐱", "🐰", "🐻", "🐼", "🐨", "🐯", "🦁", "🐷", "🐸", "🐵", "🦄", "🐢", "🐙"],
    "🌿 식물": ["🌿", "🌵", "🌳", "🌲", "🪴", "🌺", "🌹", "💐", "🪷", "🥕", "🌽", "🍋", "🍑", "🥝"]
  };
  const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
  const TEXT_FONT = '800 {s}px "Pretendard Variable", Pretendard, "Malgun Gothic", sans-serif';
  const MAX_UNDO = 15;
  const STROKE_TOOLS = ["pencil", "crayon", "water", "spray"]; // ghost에 그었다가 손을 떼면 종이에 옮긴다

  const $ = (id) => document.getElementById(id);
  const canvas = $("canvas"), ghost = $("ghost"), under = $("under");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const gctx = ghost.getContext("2d");
  const uctx = under.getContext("2d", { willReadFrequently: true });
  const board = $("board"), paper = $("paper");

  let W = 1200, H = 800;
  let tool = "pencil";
  let color = COLORS[0][1];
  let level = 3;          // 굵기 1~10
  let alpha = 1;          // 진하기 0.1~1
  let shape = "rect";
  let stamp = STAMPS["❤️ 기본"][0];
  let symV = false, symH = false;
  let undos = [], redos = [];
  let hasUnder = false;   // 도안이 깔려 있는지
  let underData = null;   // 물감이 도안의 선을 넘지 않게 쓰는 도안 픽셀
  let pixel = null;       // 픽셀판 {w, h, s, ox, oy}

  // ---------- 도구 상자 ----------
  function press(all, one) { all.forEach((x) => x.setAttribute("aria-pressed", String(x === one))); }

  const toolBtns = [...document.querySelectorAll("[data-tool]")];
  function setTool(name) {
    if (name === "pixel" && !pixel) { openPixelDialog(); return; }
    tool = name;
    press(toolBtns, toolBtns.find((b) => b.dataset.tool === name));
    $("shapeOpts").hidden = tool !== "shape";
    $("stampOpts").hidden = tool !== "stamp";
    $("textOpts").hidden = tool !== "text";
    $("pixelOpts").hidden = tool !== "pixel";
    clearGhost();
    setCursor();
    if (tool === "text") $("textInput").focus({ preventScroll: true });
  }
  toolBtns.forEach((b) => b.addEventListener("click", () => setTool(b.dataset.tool)));

  $("gridBtn").addEventListener("click", (e) => {
    const on = $("grid").hidden;
    $("grid").hidden = !on;
    e.currentTarget.setAttribute("aria-pressed", String(on));
  });

  const shapeBtns = [...document.querySelectorAll("[data-shape]")];
  shapeBtns.forEach((b) => b.addEventListener("click", () => { shape = b.dataset.shape; press(shapeBtns, b); }));

  // 도장: 위에서 묶음(계절·동물…)을 고르면 아래에 도장이 바뀐다
  const catBox = $("stampCats"), stampBox = $("stamps");
  function showStamps(cat) {
    press(catBox.querySelectorAll(".cat"), [...catBox.children].find((b) => b.dataset.cat === cat));
    stampBox.replaceChildren(...STAMPS[cat].map((s) => {
      const b = document.createElement("button");
      b.className = "chip"; b.textContent = s;
      b.setAttribute("aria-pressed", String(s === stamp));
      b.addEventListener("click", () => { stamp = s; press(stampBox.querySelectorAll(".chip"), b); setCursor(); });
      return b;
    }));
  }
  Object.keys(STAMPS).forEach((cat) => {
    const b = document.createElement("button");
    b.className = "cat"; b.dataset.cat = cat; b.textContent = cat;
    b.addEventListener("click", () => showStamps(cat));
    catBox.appendChild(b);
  });
  showStamps("❤️ 기본");

  // ---------- 색 ----------
  const colorBox = $("colors"), myBox = $("myColors");
  function swatch(name, hex) {
    const b = document.createElement("button");
    b.className = "swatch"; b.style.setProperty("--c", hex);
    b.setAttribute("aria-label", name); b.title = name; b.dataset.hex = hex;
    b.setAttribute("aria-pressed", String(hex === color));
    b.addEventListener("click", () => setColor(hex));
    return b;
  }
  COLORS.forEach(([name, hex]) => colorBox.appendChild(swatch(name, hex)));

  // 내 색: '다른 색'으로 고른 색을 7개까지 이 컴퓨터에 기억해 둔다
  let myColors = [];
  try { myColors = JSON.parse(localStorage.getItem("malang-my-colors") || "[]").filter((h) => /^#[0-9a-f]{6}$/i.test(h)).slice(0, 7); } catch {}
  function showMyColors() {
    myBox.hidden = myColors.length === 0;
    myBox.replaceChildren(...myColors.map((h) => swatch("내 색", h)));
  }
  showMyColors();
  $("picker").addEventListener("input", (e) => setColor(e.target.value));
  $("picker").addEventListener("change", (e) => {
    const h = e.target.value.toLowerCase();
    if (COLORS.some(([, c]) => c.toLowerCase() === h)) return;
    myColors = [h, ...myColors.filter((c) => c !== h)].slice(0, 7);
    try { localStorage.setItem("malang-my-colors", JSON.stringify(myColors)); } catch {}
    showMyColors();
    setColor(h);
  });

  function setColor(hex) {
    color = hex;
    document.querySelectorAll(".swatch").forEach((s) => s.setAttribute("aria-pressed", String(s.dataset.hex === hex)));
    document.documentElement.style.setProperty("--c", hex);
    if (tool === "eraser") setTool("pencil");
  }

  $("size").addEventListener("input", (e) => { level = Number(e.target.value); showDot(); });
  $("alpha").addEventListener("input", (e) => { alpha = Number(e.target.value) / 10; $("alphaVal").textContent = e.target.value; showDot(); });
  function showDot() {
    const d = 4 + level * 4;
    $("dot").style.width = $("dot").style.height = d + "px";
    $("dot").style.opacity = alpha;
  }
  showDot();

  const width = () => level * 4;             // 연필·지우개·도형 선 굵기 (종이 픽셀)

  // ---------- 대칭 그리기 ----------
  $("symV").addEventListener("click", (e) => { symV = !symV; e.currentTarget.setAttribute("aria-pressed", String(symV)); $("guideV").hidden = !symV; });
  $("symH").addEventListener("click", (e) => { symH = !symH; e.currentTarget.setAttribute("aria-pressed", String(symH)); $("guideH").hidden = !symH; });
  // 한 점을 대칭으로 비춘 점들 (자기 자신 포함)
  function mirrors(p) {
    const out = [p];
    if (symV) out.push({ x: W - p.x, y: p.y });
    if (symH) out.push({ x: p.x, y: H - p.y });
    if (symV && symH) out.push({ x: W - p.x, y: H - p.y });
    return out;
  }

  // ---------- 커서: 도구 모양을 보여 준다(마우스일 때) ----------
  function setCursor() {
    const icon = { pencil: "✏️", crayon: "🖍️", water: "🖌️", spray: "💨", eraser: "🧽" }[tool];
    if (!icon) { canvas.style.cursor = "crosshair"; return; }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36"><text x="0" y="30" font-size="28">${icon}</text></svg>`;
    canvas.style.cursor = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}") 2 32, crosshair`;
  }
  setCursor();

  // ---------- 종이 ----------
  function newPaper(w, h) {
    W = w; H = h;
    for (const c of [canvas, ghost, under]) { c.width = W; c.height = H; }
    removeUnder();
    undos = []; redos = [];
    updateButtons();
    $("grid").style.backgroundSize = `${(50 / W) * 100}% ${(50 / H) * 100}%`;
    fitPaper();
  }

  // 종이 모양은 그대로 두고, 보이는 크기만 화면에 맞춘다
  function fitPaper() {
    const narrow = window.matchMedia("(max-width: 820px)").matches;
    const pad = narrow ? 16 : 32;
    const bw = board.clientWidth - pad;
    const bh = narrow ? window.innerHeight * 0.62 : board.clientHeight - pad;
    const s = Math.max(0.05, Math.min(bw / W, bh / H));
    paper.style.width = Math.floor(W * s) + "px";
    paper.style.height = Math.floor(H * s) + "px";
  }
  new ResizeObserver(fitPaper).observe(board);
  window.addEventListener("resize", fitPaper);

  $("page").addEventListener("change", async (e) => {
    const [w, h] = e.target.value.split("x").map(Number);
    if ((undos.length || hasUnder) && !(await ask("종이를 바꾸면 지금 그림과 도안이 지워져요.<br>바꿀까요?", "네, 바꿔요"))) {
      e.target.value = `${W}x${H}`;
      return;
    }
    newPaper(w, h);
  });

  // ---------- 도안 (맨 아래 겹) ----------
  // 도안을 새로 깔면 위에 그린 그림은 지운다(도안과 안 맞으니까)
  async function setUnder(draw, message) {
    if (undos.length && !(await ask(message || "새 도안을 깔면 지금 그림이 지워져요.<br>깔까요?", "네"))) return false;
    uctx.clearRect(0, 0, W, H);
    pixel = null;
    draw(uctx);
    underData = uctx.getImageData(0, 0, W, H).data;
    hasUnder = true;
    ctx.clearRect(0, 0, W, H);
    undos = []; redos = []; updateButtons();
    $("underOpts").hidden = false;
    $("underAlpha").value = 100; $("underVal").textContent = "100"; under.style.opacity = 1;
    if (tool === "pixel") setTool("pencil"); // 픽셀판이 아닌 도안이면 픽셀 칠하기를 끈다
    return true;
  }
  function removeUnder() {
    uctx.clearRect(0, 0, W, H);
    underData = null; hasUnder = false; pixel = null;
    $("underOpts").hidden = true;
    under.style.opacity = 1;
    if (tool === "pixel") setTool("pencil");
  }
  $("underAlpha").addEventListener("input", (e) => { under.style.opacity = e.target.value / 100; $("underVal").textContent = e.target.value; });
  $("underOff").addEventListener("click", async () => {
    if (await ask("도안을 뺄까요?<br>내가 칠한 그림은 남아요.", "네, 빼요")) removeUnder();
  });

  // 도안 불러오기: 내 컴퓨터의 그림을 종이 밑에 깐다
  $("open").addEventListener("click", () => $("file").click());
  $("file").addEventListener("change", (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      setUnder((c) => {
        const s = Math.min(W / img.width, H / img.height);
        const w = img.width * s, h = img.height * s;
        c.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
      }).then((ok) => { if (ok) toast("도안을 깔았어요! 🪣 물감으로 칸을 채워 보세요"); });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => { toast("그림 파일만 불러올 수 있어요"); URL.revokeObjectURL(url); };
    img.src = url;
  });

  // 달력: 연도와 달을 고르면 종이 가득 달력 도안을 깐다
  let calYear = new Date().getFullYear();
  $("calBtn").addEventListener("click", () => { $("yearVal").textContent = `${calYear}년`; $("calDlg").showModal(); });
  $("yearPrev").addEventListener("click", () => { calYear = Math.max(1900, calYear - 1); $("yearVal").textContent = `${calYear}년`; });
  $("yearNext").addEventListener("click", () => { calYear = Math.min(2999, calYear + 1); $("yearVal").textContent = `${calYear}년`; });
  for (let m = 1; m <= 12; m++) {
    const b = document.createElement("button");
    b.className = "pill"; b.textContent = `${m}월`;
    b.addEventListener("click", async () => {
      $("calDlg").close();
      if (await setUnder((c) => drawCalendar(c, calYear, m), "달력을 깔면 지금 그림이 지워져요.<br>깔까요?")) {
        toast(`${calYear}년 ${m}월 달력이에요 📅`);
      }
    });
    $("months").appendChild(b);
  }
  function drawCalendar(c, year, m) {
    const pad = Math.round(W * 0.04), top = Math.round(H * 0.15), head = Math.round(H * 0.06);
    const cw = (W - pad * 2) / 7, ch = (H - top - head - pad) / 6;
    c.textAlign = "center"; c.textBaseline = "middle";
    c.fillStyle = "#141414";
    c.font = TEXT_FONT.replace("{s}", Math.round(H * 0.065));
    c.fillText(`${year}년 ${m}월`, W / 2, top / 2 + 6);
    c.font = TEXT_FONT.replace("{s}", Math.round(H * 0.03));
    ["일", "월", "화", "수", "목", "금", "토"].forEach((d, i) => {
      c.fillStyle = i === 0 ? "#E8443A" : i === 6 ? "#2F5BEA" : "#5E5C56";
      c.fillText(d, pad + cw * i + cw / 2, top + head / 2);
    });
    c.strokeStyle = "#BDBBB3"; c.lineWidth = 2;
    c.beginPath();
    for (let i = 0; i <= 7; i++) { c.moveTo(pad + cw * i, top + head); c.lineTo(pad + cw * i, top + head + ch * 6); }
    for (let i = 0; i <= 6; i++) { c.moveTo(pad, top + head + ch * i); c.lineTo(W - pad, top + head + ch * i); }
    c.stroke();
    const first = new Date(year, m - 1, 1).getDay(), last = new Date(year, m, 0).getDate();
    c.textAlign = "left"; c.textBaseline = "top";
    c.font = TEXT_FONT.replace("{s}", Math.round(Math.min(cw, ch) * 0.22));
    for (let d = 1; d <= last; d++) {
      const i = first + d - 1, col = i % 7, row = Math.floor(i / 7);
      c.fillStyle = col === 0 ? "#E8443A" : col === 6 ? "#2F5BEA" : "#141414";
      c.fillText(String(d), pad + cw * col + 8, top + head + ch * row + 6);
    }
  }

  // 픽셀판: 가로·세로 칸 수를 고르면 네모 칸 도안을 깐다
  function openPixelDialog() { $("pixDlg").showModal(); }
  $("pixelNew").addEventListener("click", openPixelDialog);
  $("pixW").addEventListener("input", (e) => { $("pixWVal").textContent = e.target.value; });
  $("pixH").addEventListener("input", (e) => { $("pixHVal").textContent = e.target.value; });
  $("pixGo").addEventListener("click", async () => {
    $("pixDlg").close();
    const w = Number($("pixW").value), h = Number($("pixH").value);
    const s = Math.floor(Math.min((W - 20) / w, (H - 20) / h));
    const p = { w, h, s, ox: Math.round((W - s * w) / 2), oy: Math.round((H - s * h) / 2) };
    const ok = await setUnder((c) => {
      c.strokeStyle = "#C4C2BA"; c.lineWidth = 2;
      c.beginPath();
      for (let i = 0; i <= w; i++) { c.moveTo(p.ox + s * i, p.oy); c.lineTo(p.ox + s * i, p.oy + s * h); }
      for (let i = 0; i <= h; i++) { c.moveTo(p.ox, p.oy + s * i); c.lineTo(p.ox + s * w, p.oy + s * i); }
      c.stroke();
    }, "픽셀판을 깔면 지금 그림이 지워져요.<br>깔까요?");
    if (!ok) return;
    pixel = p;
    setTool("pixel");
  });
  function paintPixel(pt) {
    for (const q of mirrors(pt)) {
      const col = Math.floor((q.x - pixel.ox) / pixel.s), row = Math.floor((q.y - pixel.oy) / pixel.s);
      if (col < 0 || row < 0 || col >= pixel.w || row >= pixel.h) continue;
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      ctx.clearRect(pixel.ox + col * pixel.s + 1, pixel.oy + row * pixel.s + 1, pixel.s - 2, pixel.s - 2);
      ctx.fillRect(pixel.ox + col * pixel.s + 1, pixel.oy + row * pixel.s + 1, pixel.s - 2, pixel.s - 2);
      ctx.globalAlpha = 1;
    }
  }

  // ---------- 되돌리기 · 다시 하기 ----------
  function saveStep() {
    undos.push(ctx.getImageData(0, 0, W, H));
    if (undos.length > MAX_UNDO) undos.shift();
    redos = [];
    updateButtons();
  }
  function updateButtons() {
    $("undo").disabled = undos.length === 0;
    $("redo").disabled = redos.length === 0;
  }
  function undo() {
    if (!undos.length) return;
    redos.push(ctx.getImageData(0, 0, W, H));
    ctx.putImageData(undos.pop(), 0, 0);
    updateButtons();
  }
  function redo() {
    if (!redos.length) return;
    undos.push(ctx.getImageData(0, 0, W, H));
    ctx.putImageData(redos.pop(), 0, 0);
    updateButtons();
  }
  $("undo").addEventListener("click", undo);
  $("redo").addEventListener("click", redo);
  document.addEventListener("keydown", (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.target.tagName === "INPUT") return;
    const k = e.key.toLowerCase();
    if (k === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
    else if (k === "y" || (k === "z" && e.shiftKey)) { e.preventDefault(); redo(); }
  });

  // ---------- 그리기 ----------
  let active = null;               // 지금 그리고 있는 손가락(포인터)
  let start = null, last = null;
  let sprayTimer = null;

  function point(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
  }

  canvas.addEventListener("pointerdown", (e) => {
    if (active !== null || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.preventDefault();
    const p = point(e);

    if (tool === "fill") { saveStep(); mirrors(p).forEach((q) => fill(Math.floor(q.x), Math.floor(q.y))); return; }
    if (tool === "stamp") { saveStep(); clearGhost(); mirrors(p).forEach((q) => drawStamp(ctx, q)); return; }
    if (tool === "text") {
      const t = $("textInput").value.trim();
      if (!t) { toast("먼저 쓸 글자를 적어 주세요 ✍️"); $("textInput").focus(); return; }
      saveStep(); clearGhost(); mirrors(p).forEach((q) => drawText(ctx, q, t));
      return;
    }

    active = e.pointerId;
    try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* 잡지 못해도 그리기는 된다 */ }
    saveStep();
    start = last = p;

    if (tool === "pixel") { paintPixel(p); return; }
    if (STROKE_TOOLS.includes(tool) || tool === "shape") {
      ghost.style.opacity = tool === "water" ? alpha * 0.6 : alpha;
    }
    if (tool === "spray") {
      mirrors(p).forEach(spray);
      sprayTimer = setInterval(() => mirrors(last).forEach(spray), 40);
    } else if (tool !== "shape") segment(p, p);
  });

  canvas.addEventListener("pointermove", (e) => {
    if (e.pointerId !== active) {
      // 도장·글자는 누르기 전에 어디에 찍힐지 흐리게 보여 준다(마우스일 때)
      if ((tool === "stamp" || tool === "text") && e.pointerType === "mouse" && active === null) {
        const p = point(e), t = $("textInput").value.trim();
        clearGhost(); gctx.globalAlpha = 0.45;
        mirrors(p).forEach((q) => (tool === "stamp" ? drawStamp(gctx, q) : t && drawText(gctx, q, t)));
        gctx.globalAlpha = 1;
      }
      return;
    }
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    for (const ev of (events.length ? events : [e])) {
      const p = point(ev);
      if (tool === "pixel") paintPixel(p);
      else if (tool === "spray") mirrors(p).forEach(spray);
      else if (tool !== "shape") segment(last, p);
      last = p;
    }
    if (tool === "shape") { clearGhost(); drawShape(gctx, start, last); }
  });

  function stop(e) {
    if (e.pointerId !== active) return;
    clearInterval(sprayTimer);
    if (STROKE_TOOLS.includes(tool) || tool === "shape") {
      if (tool === "shape") { clearGhost(); drawShape(gctx, start, last); }
      // ghost에 그린 선을 진하기만큼 종이에 옮긴다 (선이 겹쳐도 얼룩지지 않는다)
      ctx.save();
      ctx.globalAlpha = Number(ghost.style.opacity) || 1;
      ctx.drawImage(ghost, 0, 0);
      ctx.restore();
      clearGhost();
    }
    ghost.style.opacity = 1;
    active = null;
  }
  canvas.addEventListener("pointerup", stop);
  canvas.addEventListener("pointercancel", stop);
  canvas.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse" && active === null) clearGhost(); });

  // 선 한 토막을 (대칭이면 거울 쪽까지) 긋는다
  function segment(a, b) {
    const as = mirrors(a), bs = mirrors(b);
    as.forEach((m, i) => {
      if (tool === "eraser") erase(m, bs[i]);
      else if (tool === "crayon") crayon(m, bs[i]);
      else if (tool === "water") water(m, bs[i]);
      else line(m, bs[i]);
    });
  }

  function line(a, b) {
    gctx.strokeStyle = color; gctx.lineWidth = width();
    gctx.lineCap = "round"; gctx.lineJoin = "round";
    gctx.beginPath(); gctx.moveTo(a.x, a.y); gctx.lineTo(b.x, b.y); gctx.stroke();
  }

  function erase(a, b) {
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineWidth = width() * 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.restore();
  }

  // 수채화: 번지는 가장자리(그림자)를 붙인 부드러운 붓
  function water(a, b) {
    gctx.save();
    gctx.strokeStyle = color; gctx.lineWidth = width() * 1.6;
    gctx.lineCap = "round"; gctx.lineJoin = "round";
    gctx.shadowColor = color; gctx.shadowBlur = width() * 1.2;
    gctx.beginPath(); gctx.moveTo(a.x, a.y); gctx.lineTo(b.x, b.y); gctx.stroke();
    gctx.restore();
  }

  // 크레파스: 흐린 바탕 선 위에 작은 알갱이를 뿌려 거친 느낌을 낸다
  function crayon(a, b) {
    const r = Math.max(3, width() * 0.8);
    gctx.save();
    gctx.globalAlpha = 0.35;
    gctx.strokeStyle = color; gctx.lineWidth = r * 1.4; gctx.lineCap = "round";
    gctx.beginPath(); gctx.moveTo(a.x, a.y); gctx.lineTo(b.x, b.y); gctx.stroke();
    gctx.globalAlpha = 0.75; gctx.fillStyle = color;
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.ceil(dist / (r * 0.35)));
    for (let i = 0; i <= steps; i++) {
      const x = a.x + ((b.x - a.x) * i) / steps, y = a.y + ((b.y - a.y) * i) / steps;
      for (let k = 0; k < r * 1.2; k++) {
        const ang = Math.random() * Math.PI * 2, rr = Math.random() * r;
        const s = 1 + Math.random() * 2;
        gctx.fillRect(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr, s, s);
      }
    }
    gctx.restore();
  }

  function spray(p) {
    const r = 10 + level * 6;
    gctx.fillStyle = color;
    for (let i = 0; i < r * 0.9; i++) {
      const ang = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * r;
      gctx.fillRect(p.x + Math.cos(ang) * rr, p.y + Math.sin(ang) * rr, 2, 2);
    }
  }

  function drawStamp(c, p) {
    const s = 28 + level * 14;
    c.font = `${s}px ${EMOJI_FONT}`;
    c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText(stamp, p.x, p.y);
  }

  function drawText(c, p, t) {
    c.font = TEXT_FONT.replace("{s}", 20 + level * 8);
    c.textAlign = "center"; c.textBaseline = "middle";
    c.fillStyle = color;
    c.fillText(t, p.x, p.y);
  }

  function drawShape(c, a, b) {
    const filled = $("shapeFill").checked && shape !== "line";
    c.save();
    c.strokeStyle = c.fillStyle = color;
    c.lineWidth = width(); c.lineCap = "round"; c.lineJoin = "round";
    mirrors(a).forEach((ma, i) => {
      const mb = mirrors(b)[i];
      const x = Math.min(ma.x, mb.x), y = Math.min(ma.y, mb.y);
      const w = Math.abs(mb.x - ma.x), h = Math.abs(mb.y - ma.y);
      c.beginPath();
      if (shape === "rect") c.rect(x, y, w, h);
      else if (shape === "circle") c.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      else if (shape === "tri") { c.moveTo(x + w / 2, y); c.lineTo(x + w, y + h); c.lineTo(x, y + h); c.closePath(); }
      else if (shape === "line") { c.moveTo(ma.x, ma.y); c.lineTo(mb.x, mb.y); }
      else if (shape === "star") {
        for (let k = 0; k < 10; k++) {
          const ang = -Math.PI / 2 + (k * Math.PI) / 5, f = k % 2 ? 0.45 : 1;
          const px = x + w / 2 + Math.cos(ang) * (w / 2) * f, py = y + h / 2 + Math.sin(ang) * (h / 2) * f;
          k ? c.lineTo(px, py) : c.moveTo(px, py);
        }
        c.closePath();
      }
      filled ? c.fill() : c.stroke();
    });
    c.restore();
  }

  function clearGhost() { gctx.clearRect(0, 0, W, H); }

  // 물감: 누른 곳과 비슷한 색으로 이어진 곳을 모두 칠한다. 도안의 선은 넘지 않는다.
  function fill(x, y) {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const img = ctx.getImageData(0, 0, W, H), d = img.data, u = underData;
    // 도안에서 어두운 곳(선)은 벽으로 본다
    const wall = (i) => u && u[i + 3] > 40 && (0.299 * u[i] + 0.587 * u[i + 1] + 0.114 * u[i + 2]) < 200;
    const t = (y * W + x) * 4;
    if (wall(t)) return;
    const tr = d[t], tg = d[t + 1], tb = d[t + 2], ta = d[t + 3];
    const n = parseInt(color.slice(1), 16);
    const fr = (n >> 16) & 255, fg = (n >> 8) & 255, fb = n & 255;
    if (ta === 255 && Math.abs(tr - fr) + Math.abs(tg - fg) + Math.abs(tb - fb) < 10) return;

    const TOL = 90;
    const same = (i) => !wall(i) &&
      Math.abs(d[i] - tr) + Math.abs(d[i + 1] - tg) + Math.abs(d[i + 2] - tb) + Math.abs(d[i + 3] - ta) <= TOL;
    const seen = new Uint8Array(W * H);
    const stack = [x, y];
    while (stack.length) {
      const sy = stack.pop(), sx0 = stack.pop();
      let sx = sx0;
      while (sx > 0 && !seen[sy * W + sx - 1] && same((sy * W + sx - 1) * 4)) sx--;
      let up = false, down = false;
      for (; sx < W; sx++) {
        const p = sy * W + sx;
        if (seen[p] || !same(p * 4)) break;
        seen[p] = 1;
        d[p * 4] = fr; d[p * 4 + 1] = fg; d[p * 4 + 2] = fb; d[p * 4 + 3] = 255;
        if (sy > 0) {
          const q = p - W, ok = !seen[q] && same(q * 4);
          if (ok && !up) stack.push(sx, sy - 1);
          up = ok;
        }
        if (sy < H - 1) {
          const q = p + W, ok = !seen[q] && same(q * 4);
          if (ok && !down) stack.push(sx, sy + 1);
          down = ok;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  // ---------- 새로 그리기 (도안은 남긴다) ----------
  $("clear").addEventListener("click", async () => {
    const msg = hasUnder ? "내가 그린 것을 <b>모두</b> 지울까요?<br>도안은 남아요." : "그림을 <b>모두</b> 지울까요?";
    if (!(await ask(msg, "네, 지워요"))) return;
    saveStep(); // 실수로 지웠으면 되돌리기로 살릴 수 있다
    ctx.clearRect(0, 0, W, H);
  });

  // ---------- 저장 (이 컴퓨터로 내려받기) ----------
  // 흰 종이 + 도안 + 그림을 한 장으로 합친다 (격자·대칭 선은 넣지 않는다)
  function exportCanvas() {
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const x = c.getContext("2d");
    x.fillStyle = "#fff"; x.fillRect(0, 0, W, H);
    if (hasUnder) { x.globalAlpha = Number(under.style.opacity) || 1; x.drawImage(under, 0, 0); x.globalAlpha = 1; }
    x.drawImage(canvas, 0, 0);
    return c;
  }
  window.malangExport = exportCanvas;

  $("save").addEventListener("click", () => {
    exportCanvas().toBlob((blob) => {
      if (!blob) return;
      const d = new Date(), pad = (n) => String(n).padStart(2, "0");
      const name = `내그림-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.png`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast("저장했어요! 💾");
    }, "image/png");
  });

  // ---------- 작은 도우미 ----------
  const dlg = $("ask");
  function ask(html, yes) {
    $("askText").innerHTML = html;
    $("askYes").textContent = yes;
    if (typeof dlg.showModal !== "function") return Promise.resolve(confirm($("askText").textContent));
    dlg.showModal();
    return new Promise((done) => {
      const finish = (v) => { dlg.close(); $("askYes").onclick = $("askNo").onclick = dlg.oncancel = null; done(v); };
      $("askYes").onclick = () => finish(true);
      $("askNo").onclick = () => finish(false);
      dlg.oncancel = () => finish(false);
    });
  }

  function toast(text) {
    document.querySelectorAll(".toast").forEach((x) => x.remove());
    const t = document.createElement("div");
    t.className = "toast"; t.textContent = text;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1800);
  }

  newPaper(W, H);
})();
