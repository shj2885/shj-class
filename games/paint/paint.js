// 말랑 그림판: 그림은 이 컴퓨터 안에서만 그리고, 저장도 내려받기로만 한다(서버로 보내지 않는다).
(function () {
  const COLORS = [
    ["검정", "#141414"], ["회색", "#8A8A8A"], ["흰색", "#FFFFFF"], ["갈색", "#8B5A2B"],
    ["살구", "#FFC9A3"], ["빨강", "#E8443A"], ["주황", "#FF8A1F"], ["노랑", "#FFD43B"],
    ["연두", "#9BD41C"], ["초록", "#1F9D55"], ["하늘", "#38B6FF"], ["파랑", "#2F5BEA"],
    ["보라", "#8E4DE0"], ["분홍", "#FF6FB5"]
  ];
  const STAMPS = ["❤️", "⭐", "🌸", "🌈", "🍎", "🍦", "🐶", "🐱", "🐰", "🦋", "🚗", "👑", "😀", "🎈"];
  const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
  const PAPER = "#FFFFFF";
  const MAX_UNDO = 15;

  const $ = (id) => document.getElementById(id);
  const canvas = $("canvas"), ghost = $("ghost");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const gctx = ghost.getContext("2d");
  const board = $("board"), paper = $("paper");

  let W = 1200, H = 800;
  let tool = "pencil";
  let color = COLORS[0][1];
  let level = 3;          // 굵기 1~10
  let shape = "rect";
  let stamp = STAMPS[0];
  let undos = [], redos = [];

  // ---------- 도구 상자 ----------
  function press(all, one) { all.forEach((x) => x.setAttribute("aria-pressed", String(x === one))); }

  const toolBtns = [...document.querySelectorAll("[data-tool]")];
  toolBtns.forEach((b) => b.addEventListener("click", () => {
    tool = b.dataset.tool;
    press(toolBtns, b);
    $("shapeOpts").hidden = tool !== "shape";
    $("stampOpts").hidden = tool !== "stamp";
    clearGhost();
  }));

  $("gridBtn").addEventListener("click", (e) => {
    const on = $("grid").hidden;
    $("grid").hidden = !on;
    e.currentTarget.setAttribute("aria-pressed", String(on));
  });

  const shapeBtns = [...document.querySelectorAll("[data-shape]")];
  shapeBtns.forEach((b) => b.addEventListener("click", () => { shape = b.dataset.shape; press(shapeBtns, b); }));

  const stampBox = $("stamps");
  STAMPS.forEach((s, i) => {
    const b = document.createElement("button");
    b.className = "chip"; b.textContent = s;
    b.setAttribute("aria-pressed", String(i === 0));
    b.addEventListener("click", () => { stamp = s; press(stampBox.querySelectorAll(".chip"), b); });
    stampBox.appendChild(b);
  });

  const colorBox = $("colors");
  COLORS.forEach(([name, hex], i) => {
    const b = document.createElement("button");
    b.className = "swatch"; b.style.setProperty("--c", hex);
    b.setAttribute("aria-label", name); b.title = name;
    b.setAttribute("aria-pressed", String(i === 0));
    b.addEventListener("click", () => setColor(hex, b));
    colorBox.appendChild(b);
  });
  $("picker").addEventListener("input", (e) => setColor(e.target.value, null));

  function setColor(hex, btn) {
    color = hex;
    press(colorBox.querySelectorAll(".swatch"), btn);
    document.documentElement.style.setProperty("--c", hex);
    if (tool === "eraser") $("tools").querySelector('[data-tool="pencil"]').click();
  }

  $("size").addEventListener("input", (e) => { level = Number(e.target.value); showDot(); });
  function showDot() {
    const d = 4 + level * 4;
    $("dot").style.width = $("dot").style.height = d + "px";
  }
  showDot();

  const width = () => level * 4;             // 연필·지우개·도형 선 굵기 (종이 픽셀)

  // ---------- 종이 ----------
  function newPaper(w, h) {
    W = w; H = h;
    for (const c of [canvas, ghost]) { c.width = W; c.height = H; }
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W, H);
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
    if (undos.length && !(await ask("종이를 바꾸면 지금 그림이 지워져요.<br>바꿀까요?", "네, 바꿔요"))) {
      e.target.value = `${W}x${H}`;
      return;
    }
    newPaper(w, h);
  });

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
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    if (k === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
    else if (k === "y" || (k === "z" && e.shiftKey)) { e.preventDefault(); redo(); }
  });

  // ---------- 그리기 ----------
  let active = null;               // 지금 그리고 있는 손가락(포인터)
  let start = null, last = null, mid = null;
  let sprayTimer = null;

  function point(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
  }

  canvas.addEventListener("pointerdown", (e) => {
    if (active !== null || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.preventDefault();
    const p = point(e);

    if (tool === "fill") { saveStep(); fill(Math.floor(p.x), Math.floor(p.y)); return; }
    if (tool === "stamp") { saveStep(); clearGhost(); drawStamp(ctx, p); return; }

    active = e.pointerId;
    try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* 잡지 못해도 그리기는 된다 */ }
    saveStep();
    start = last = mid = p;

    if (tool === "pencil" || tool === "eraser") dot(p);
    else if (tool === "crayon") crayon(p, p);
    else if (tool === "spray") {
      spray(p);
      sprayTimer = setInterval(() => spray(last), 40);
    }
  });

  canvas.addEventListener("pointermove", (e) => {
    if (e.pointerId !== active) {
      // 도장은 누르기 전에 어디에 찍힐지 흐리게 보여 준다(마우스일 때)
      if (tool === "stamp" && e.pointerType === "mouse" && active === null) {
        clearGhost(); gctx.globalAlpha = 0.45; drawStamp(gctx, point(e)); gctx.globalAlpha = 1;
      }
      return;
    }
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    for (const ev of (events.length ? events : [e])) {
      const p = point(ev);
      if (tool === "pencil" || tool === "eraser") {
        const m = { x: (last.x + p.x) / 2, y: (last.y + p.y) / 2 };
        stroke((c) => { c.moveTo(mid.x, mid.y); c.quadraticCurveTo(last.x, last.y, m.x, m.y); });
        mid = m;
      } else if (tool === "crayon") crayon(last, p);
      else if (tool === "spray") spray(p);
      last = p;
    }
    if (tool === "shape") { clearGhost(); drawShape(gctx, start, last); }
  });

  function stop(e) {
    if (e.pointerId !== active) return;
    if (tool === "pencil" || tool === "eraser") stroke((c) => { c.moveTo(mid.x, mid.y); c.lineTo(last.x, last.y); });
    if (tool === "shape") { clearGhost(); drawShape(ctx, start, last); }
    clearInterval(sprayTimer);
    active = null;
  }
  canvas.addEventListener("pointerup", stop);
  canvas.addEventListener("pointercancel", stop);
  canvas.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse" && active === null) clearGhost(); });

  function ink() { return tool === "eraser" ? PAPER : color; }
  function penWidth() { return tool === "eraser" ? width() * 2.5 : width(); }

  function dot(p) {
    ctx.fillStyle = ink();
    ctx.beginPath(); ctx.arc(p.x, p.y, penWidth() / 2, 0, Math.PI * 2); ctx.fill();
  }
  function stroke(path) {
    ctx.strokeStyle = ink(); ctx.lineWidth = penWidth();
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); path(ctx); ctx.stroke();
  }

  // 크레파스: 흐린 바탕 선 위에 작은 알갱이를 뿌려 거친 느낌을 낸다
  function crayon(a, b) {
    const r = Math.max(3, width() * 0.8);
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = color; ctx.lineWidth = r * 1.4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.globalAlpha = 0.75; ctx.fillStyle = color;
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.ceil(dist / (r * 0.35)));
    for (let i = 0; i <= steps; i++) {
      const x = a.x + ((b.x - a.x) * i) / steps, y = a.y + ((b.y - a.y) * i) / steps;
      for (let k = 0; k < r * 1.2; k++) {
        const ang = Math.random() * Math.PI * 2, rr = Math.random() * r;
        const s = 1 + Math.random() * 2;
        ctx.fillRect(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr, s, s);
      }
    }
    ctx.restore();
  }

  function spray(p) {
    const r = 10 + level * 6;
    ctx.fillStyle = color;
    for (let i = 0; i < r * 0.9; i++) {
      const ang = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * r;
      ctx.fillRect(p.x + Math.cos(ang) * rr, p.y + Math.sin(ang) * rr, 2, 2);
    }
  }

  function drawStamp(c, p) {
    const s = 28 + level * 14;
    c.font = `${s}px ${EMOJI_FONT}`;
    c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText(stamp, p.x, p.y);
  }

  function drawShape(c, a, b) {
    const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
    const w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
    const filled = $("shapeFill").checked && shape !== "line";
    c.save();
    c.strokeStyle = c.fillStyle = color;
    c.lineWidth = width(); c.lineCap = "round"; c.lineJoin = "round";
    c.beginPath();
    if (shape === "rect") c.rect(x, y, w, h);
    else if (shape === "circle") c.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    else if (shape === "tri") { c.moveTo(x + w / 2, y); c.lineTo(x + w, y + h); c.lineTo(x, y + h); c.closePath(); }
    else if (shape === "line") { c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); }
    else if (shape === "star") {
      for (let i = 0; i < 10; i++) {
        const ang = -Math.PI / 2 + (i * Math.PI) / 5, k = i % 2 ? 0.45 : 1;
        const px = x + w / 2 + Math.cos(ang) * (w / 2) * k, py = y + h / 2 + Math.sin(ang) * (h / 2) * k;
        i ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.closePath();
    }
    filled ? c.fill() : c.stroke();
    c.restore();
  }

  function clearGhost() { gctx.clearRect(0, 0, W, H); }

  // 물감: 누른 곳과 비슷한 색으로 이어진 곳을 모두 칠한다
  function fill(x, y) {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const img = ctx.getImageData(0, 0, W, H), d = img.data;
    const t = (y * W + x) * 4;
    const tr = d[t], tg = d[t + 1], tb = d[t + 2];
    const n = parseInt(color.slice(1), 16);
    const fr = (n >> 16) & 255, fg = (n >> 8) & 255, fb = n & 255;
    if (Math.abs(tr - fr) + Math.abs(tg - fg) + Math.abs(tb - fb) < 10) return;

    const TOL = 90;
    const same = (i) => Math.abs(d[i] - tr) + Math.abs(d[i + 1] - tg) + Math.abs(d[i + 2] - tb) <= TOL;
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

  // ---------- 새로 그리기 ----------
  $("clear").addEventListener("click", async () => {
    if (!(await ask("그림을 <b>모두</b> 지울까요?", "네, 지워요"))) return;
    saveStep(); // 실수로 지웠으면 되돌리기로 살릴 수 있다
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W, H);
  });

  // ---------- 불러오기 (내 컴퓨터의 그림을 종이에 올리기) ----------
  $("open").addEventListener("click", () => $("file").click());
  $("file").addEventListener("change", (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      saveStep();
      const s = Math.min(W / img.width, H / img.height);
      const w = img.width * s, h = img.height * s;
      ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
      ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
      URL.revokeObjectURL(url);
    };
    img.onerror = () => { toast("그림 파일만 불러올 수 있어요"); URL.revokeObjectURL(url); };
    img.src = url;
  });

  // ---------- 저장 (이 컴퓨터로 내려받기) ----------
  $("save").addEventListener("click", () => {
    canvas.toBlob((blob) => {
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
