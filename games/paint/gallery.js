// 친구들 작품 전시판: 올린 그림은 바로 전시되고, 선생님은 숨기거나 지울 수 있다.
// 선생님 비밀번호는 첫 화면·관리자 화면과 같은 sessionStorage 칸(탭을 닫으면 사라짐)에만 둔다.
// 내가 올린 그림의 '열쇠'는 이 브라우저(localStorage)에만 두고, 지울 때 보낸다.
(function () {
  const $ = (id) => document.getElementById(id);
  const PW_KEY = "admin-pw";
  const getPw = () => { try { return sessionStorage.getItem(PW_KEY) || ""; } catch { return ""; } };
  const setPw = (v) => { try { v ? sessionStorage.setItem(PW_KEY, v) : sessionStorage.removeItem(PW_KEY); } catch {} };

  function toast(text) {
    document.querySelectorAll(".toast").forEach((x) => x.remove());
    const t = document.createElement("div");
    t.className = "toast"; t.textContent = text;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2400);
  }
  const MINE_KEY = "malang-mine";
  const getMine = () => { try { return JSON.parse(localStorage.getItem(MINE_KEY) || "{}") || {}; } catch { return {}; } };
  const setMine = (m) => { try { localStorage.setItem(MINE_KEY, JSON.stringify(m)); } catch {} };

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // ---------- 전시판 (누구나) ----------
  let offset = 0;
  async function loadGallery(reset) {
    if (reset) { offset = 0; $("cards").replaceChildren(); }
    let data;
    try {
      const r = await fetch(`/api/gallery?offset=${offset}`);
      data = await r.json();
      if (!r.ok) throw new Error(data.error);
    } catch {
      $("empty").hidden = false;
      $("empty").textContent = "전시판을 불러오지 못했어요. 잠시 뒤 다시 열어 보세요.";
      return;
    }
    const mine = getMine();
    data.items.forEach((it) => {
      const c = card(it, `/api/gallery?img=${it.id}`);
      if (mine[it.id]) {
        // 이 브라우저에서 올린 그림에만 지우기 버튼을 단다
        c.classList.add("mine");
        const b = el("button", "pill small del-mine", "🗑️ 내 그림 지우기");
        b.addEventListener("click", () => askDelete(it.id));
        c.appendChild(b);
      }
      $("cards").appendChild(c);
    });
    offset += data.items.length;
    $("empty").hidden = offset > 0;
    $("more").hidden = !data.more;
  }
  $("more").addEventListener("click", () => loadGallery(false));

  function card(it, src) {
    const c = el("figure", "art");
    const b = el("button", "art-img");
    b.setAttribute("aria-label", `${it.title || "그림"} 크게 보기`);
    const img = el("img");
    img.alt = it.title || "친구 그림"; img.loading = "lazy";
    if (src) img.src = src;
    b.appendChild(img);
    b.addEventListener("click", () => {
      $("viewImg").src = img.src;
      $("viewImg").alt = img.alt;
      $("viewCap").textContent = caption(it);
      $("viewDlg").showModal();
    });
    const cap = el("figcaption");
    cap.appendChild(el("b", null, it.title || "제목 없음"));
    cap.appendChild(el("span", null, it.nickname ? `🎨 ${it.nickname}` : "🎨 이름 없음"));
    c.append(b, cap);
    c._img = img;
    return c;
  }
  const caption = (it) => `${it.title || "제목 없음"} · ${it.nickname || "이름 없음"}`;

  // ---------- 전시판에 올리기 ----------
  const shareDlg = $("shareDlg");
  let shareData = "";

  // 큰 종이는 줄여서 JPEG로 만든다(흰 바탕이라 JPEG로 충분)
  function snapshot() {
    const src = window.malangExport ? window.malangExport() : $("canvas");
    const s = Math.min(1, 1000 / Math.max(src.width, src.height));
    const c = document.createElement("canvas");
    c.width = Math.round(src.width * s); c.height = Math.round(src.height * s);
    const x = c.getContext("2d");
    x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
    x.drawImage(src, 0, 0, c.width, c.height);
    let q = 0.85, url = c.toDataURL("image/jpeg", q);
    while (url.length > 650000 && q > 0.4) { q -= 0.15; url = c.toDataURL("image/jpeg", q); }
    return url;
  }

  $("share").addEventListener("click", () => {
    shareData = snapshot();
    $("shareThumb").src = shareData;
    $("shareGo").disabled = false;
    shareDlg.showModal();
  });

  $("shareGo").addEventListener("click", async () => {
    const f = $("shareForm");
    $("shareGo").disabled = true;
    $("shareGo").textContent = "올리는 중…";
    try {
      const r = await fetch("/api/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: shareData, nickname: f.nickname.value, title: f.title.value }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "올리지 못했어요. 잠시 뒤 다시 해 보세요.");
      if (data.id && data.token) setMine({ ...getMine(), [data.id]: data.token });
      shareDlg.close();
      f.title.value = "";
      toast("전시판에 올렸어요! 🎉");
      refresh();
      $("gallery").scrollIntoView({ behavior: "smooth" });
    } catch (e) {
      toast(e.message);
      $("shareGo").disabled = false;
    } finally {
      $("shareGo").textContent = "올리기";
    }
  });

  // ---------- 내 그림 지우기 (올린 사람만) ----------
  const delDlg = $("delDlg");
  let delId = null;
  function askDelete(id) {
    delId = id;
    $("delErr").hidden = true; $("delGo").disabled = false;
    delDlg.showModal();
  }
  $("delNo").addEventListener("click", () => delDlg.close());
  $("delGo").addEventListener("click", async () => {
    $("delGo").disabled = true;
    try {
      const r = await fetch(`/api/gallery?id=${delId}`, {
        method: "DELETE",
        headers: { "x-owner-token": getMine()[delId] || "" },
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "지우지 못했어요.");
      const m = getMine(); delete m[delId]; setMine(m);
      delDlg.close();
      toast("내 그림을 지웠어요 🗑️");
      refresh();
    } catch (e) {
      $("delErr").textContent = e.message; $("delErr").hidden = false;
      $("delGo").disabled = false;
    }
  });

  // ---------- 선생님 모드 ----------
  let teaching = false;
  let tab = "approved";
  const pwDlg = $("pwDlg");

  async function admin(method, { query = "", body } = {}) {
    const r = await fetch(`/api/gallery-admin${query}`, {
      method,
      headers: { "x-admin-password": getPw(), ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await r.json().catch(() => ({}));
    if (r.status === 401) { setPw(""); stopTeach(); throw new Error("비밀번호가 맞지 않아요."); }
    if (!r.ok) throw new Error(data.error || "문제가 생겼어요.");
    return data;
  }

  $("teacher").addEventListener("click", () => {
    if (teaching) return stopTeach();
    if (getPw()) return startTeach();
    $("pwInput").value = ""; $("pwErr").hidden = true;
    pwDlg.showModal();
  });
  async function tryPw() {
    setPw($("pwInput").value);
    try {
      await admin("GET", { query: "?status=approved" });
      pwDlg.close();
      startTeach();
    } catch (e) {
      $("pwErr").textContent = e.message; $("pwErr").hidden = false;
    }
  }
  $("pwGo").addEventListener("click", tryPw);
  $("pwInput").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); tryPw(); } });

  function startTeach() {
    teaching = true;
    $("teach").hidden = false;
    $("teacher").textContent = "🔓 선생님 모드";
    $("teacher").setAttribute("aria-pressed", "true");
    loadTeach();
  }
  function stopTeach() {
    teaching = false;
    $("teach").hidden = true;
    $("teacher").textContent = "🔒 선생님";
    $("teacher").setAttribute("aria-pressed", "false");
    $("teachCards").replaceChildren();
  }
  $("teachOff").addEventListener("click", () => { setPw(""); stopTeach(); });

  document.querySelectorAll("[data-status]").forEach((b) => b.addEventListener("click", () => {
    tab = b.dataset.status;
    document.querySelectorAll("[data-status]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    loadTeach();
  }));

  async function loadTeach() {
    let data;
    try { data = await admin("GET", { query: `?status=${tab}` }); } catch (e) { toast(e.message); return; }
    for (const [k, n] of Object.entries(data.counts)) {
      const c = document.querySelector(`[data-count="${k}"]`);
      if (c) c.textContent = n;
    }
    $("teachEmpty").hidden = data.items.length > 0;
    $("teachCards").replaceChildren(...data.items.map(teachCard));
  }

  function teachCard(it) {
    const c = card(it, null);
    // 승인 전 그림은 비밀번호를 붙여서 받아 온다
    fetch(`/api/gallery-admin?img=${it.id}`, { headers: { "x-admin-password": getPw() } })
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => { if (b) c._img.src = URL.createObjectURL(b); })
      .catch(() => {});
    const row = el("div", "teach-btns");
    const act = (label, cls, fn) => { const b = el("button", `pill ${cls}`, label); b.addEventListener("click", fn); row.appendChild(b); };
    if (it.status !== "approved") act("✅ 전시", "ok", () => setStatus(it.id, "approved"));
    if (it.status !== "hidden") act("🙈 숨기기", "", () => setStatus(it.id, "hidden"));
    act("🗑️ 지우기", "danger", async () => {
      if (!confirm("이 그림을 완전히 지울까요? 다시 살릴 수 없어요.")) return;
      try { await admin("DELETE", { query: `?id=${it.id}` }); toast("지웠어요"); refresh(); } catch (e) { toast(e.message); }
    });
    c.appendChild(row);
    return c;
  }
  async function setStatus(id, status) {
    try {
      await admin("PATCH", { body: { id, status } });
      toast(status === "approved" ? "전시판에 올렸어요 ✅" : "숨겼어요 🙈");
      refresh();
    } catch (e) { toast(e.message); }
  }
  function refresh() { if (teaching) loadTeach(); loadGallery(true); }

  loadGallery(true);
})();
