(function () {
  const MACHINE_IMG = "GUI/La%20Craft%20Machine.png";
  const VIDEO_SRC = "GUI/Transition%20Witch%20Fuse.mp4";
  const TITLE = "Craft Machine";
  const LETTER_COLORS = ["#4f1c79", "#5f2687"];

  const RECIPES = [
    { id: "skull", in: { red: 100, green: 50 }, out: "skull", cost: 0 },
    { id: "poisoned", in: { skull: 3, golden: 100 }, out: "poisoned", cost: 1000 },
    { id: "frostfire", in: { poisoned: 2, diamond: 50, candy: 20 }, out: "frostfire", cost: 5000 }
  ];

  const $ = id => document.getElementById(id);
  const T = s => (window.T ? window.T(s) : s);
  const acc = () => accounts[currentAccountName];
  const active = () => typeof gameActive !== "undefined" && gameActive && currentGameMode === "adventure";
  const stockOf = t => { const a = acc(); return a ? (a[APPLE_FIELDS[t]] || 0) : 0; };
  const say = m => { try { showAdvancedMsg(T(m), "top", { color: "white" }); } catch (e) {} };

  const css = document.createElement("style");
  css.textContent = `
  #cm-map{position:fixed;left:0;top:0;z-index:-1;pointer-events:none;display:none;transition:filter .2s,transform .2s}
  #cm-map.hot{filter:drop-shadow(0 0 14px #b47cff) drop-shadow(0 0 4px #fff);transform:scale(1.06)}
  #cm-prompt{position:fixed;z-index:30;display:none;align-items:center;gap:10px;padding:8px 12px 8px 8px;background:rgba(20,20,25,.85);border:2px solid rgba(255,255,255,.35);border-radius:12px;color:#fff;font-size:9px;line-height:1.4;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,.45);pointer-events:auto;cursor:pointer}
  .cm-k{width:26px;height:26px;flex:none;border-radius:8px;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:12px;background:rgba(255,255,255,.12)}
  #cm-video{position:fixed;inset:0;width:100vw;height:100vh;object-fit:cover;background:#000;z-index:9500;display:none;transition:opacity .45s}
  #cm-dim{position:fixed;inset:0;z-index:9400;display:none;overflow:hidden;color:#fff;background:radial-gradient(circle at 50% 36%,#b9a3d9 0%,#6b4a96 26%,#2a1646 55%,#0d0618 100%)}
  #cm-title{position:absolute;left:0;right:0;bottom:calc(50vh + 26px);text-align:center;white-space:pre-wrap;font-family:'Inter',sans-serif;font-size:clamp(16px,3.6vw,44px);line-height:1.4;opacity:0;-webkit-text-stroke:3px #f4ecff;paint-order:stroke fill;text-shadow:0 4px 0 rgba(0,0,0,.35)}
  #cm-machine{position:absolute;left:50%;bottom:0;height:50vh;max-width:90vw;object-fit:contain;object-position:bottom;transform:translate(-50%,105%);pointer-events:none;transition:filter .15s}
  #cm-machine.glow{filter:drop-shadow(0 0 24px #e0c2ff) drop-shadow(0 0 6px #fff)}
  #cm-dim.go #cm-machine{animation:cm-rise 1.6s cubic-bezier(.2,.8,.25,1) forwards}
  #cm-dim.go #cm-title{animation:cm-fade .7s ease-out 1.1s forwards}
  @keyframes cm-rise{from{transform:translate(-50%,105%)}to{transform:translate(-50%,0)}}
  @keyframes cm-fade{from{opacity:0}to{opacity:1}}
  #cm-exit{position:absolute;left:20px;bottom:20px;border:0;border-radius:10px;padding:12px 18px;background:#c23616;color:#fff;font-size:10px;cursor:pointer;z-index:3}
  #cm-exit:hover{background:#ea2027}
  #cm-recipes{position:absolute;left:0;right:0;top:20px;bottom:calc(50vh + clamp(16px,3.6vw,44px) * 1.4 + 40px);display:flex;flex-wrap:wrap;justify-content:center;align-content:flex-start;gap:14px;padding:6px 20px;overflow-y:auto;z-index:2}
  .cm-rc{display:flex;align-items:center;gap:12px;padding:10px 14px;background:rgba(10,4,20,.72);border:2px solid rgba(255,255,255,.25);border-radius:14px;color:#fff}
  .cm-ri{display:flex;flex-direction:column;align-items:center;gap:2px;font-size:9px}
  .cm-ri img{width:40px;height:40px;object-fit:contain}
  .cm-ri.ok span{color:#4ADE80}.cm-ri.ko span{color:#ff6b6b}
  .cm-arrow{font-size:18px;opacity:.7}
  .cm-out{display:flex;flex-direction:column;align-items:center;gap:2px;font-size:9px}
  .cm-out img{width:52px;height:52px;object-fit:contain}
  .cm-out .vl{color:#4ADE80}
  .cm-cb{border:0;border-radius:10px;padding:12px 16px;background:#27ae60;color:#fff;font-size:11px;cursor:pointer}
  .cm-cb:hover{background:#2ecc71}
  .cm-cb.off,.cm-cb.off:hover{background:#1c3d2a;color:#6f8f7c;cursor:not-allowed}
  #cm-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:4}
  #cm-flash.on{animation:cm-flash .7s ease-out}
  @keyframes cm-flash{0%{opacity:0}25%{opacity:.95}100%{opacity:0}}
  #cm-result{position:absolute;inset:0;z-index:5;display:none;align-items:center;justify-content:center;background:rgba(5,2,10,.55)}
  #cm-result .box{display:flex;flex-direction:column;align-items:center;gap:14px;padding:28px 40px;background:rgba(20,8,36,.92);border:3px solid #b47cff;border-radius:18px;animation:cm-pop .35s ease-out;text-align:center;font-size:12px}
  @keyframes cm-pop{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}
  #cm-result img{width:120px;height:120px;object-fit:contain}
  #cm-result .nm{font-size:16px}#cm-result .vl{color:#4ADE80}
  #cm-result button{margin-top:6px;border:0;border-radius:10px;padding:12px 22px;background:#487eb0;color:#fff;font-size:11px;cursor:pointer}`;
  document.head.appendChild(css);

  const map = new Image(); map.id = "cm-map"; map.src = MACHINE_IMG; map.alt = ""; map.draggable = false;
  map.onerror = () => { map.style.visibility = "hidden"; };
  document.body.appendChild(map);
  function placeMap() {
    if (!map.naturalWidth) return;
    const H = Math.round(Math.max(64, Math.min(120, window.innerHeight * 0.18)));
    const W = Math.round(H * map.naturalWidth / map.naturalHeight);
    map.style.width = W + "px"; map.style.height = H + "px";
    map.style.left = (window.innerWidth - W - 20) + "px"; map.style.top = (window.innerHeight - H) + "px";
  }
  map.onload = placeMap; window.addEventListener("resize", placeMap); if (map.complete) placeMap();

  const prompt = document.createElement("div"); prompt.id = "cm-prompt";
  prompt.innerHTML = '<div class="cm-k">E</div><div>Enter the craft machine</div>';
  document.body.appendChild(prompt);

  const vid = document.createElement("video"); vid.id = "cm-video"; vid.playsInline = true; vid.preload = "auto"; vid.src = VIDEO_SRC;
  document.body.appendChild(vid);

  const dim = document.createElement("div"); dim.id = "cm-dim";
  dim.innerHTML = `<div id="cm-recipes"></div><div id="cm-title"></div><img id="cm-machine" src="${MACHINE_IMG}" alt="" draggable="false"><div id="cm-flash"></div><div id="cm-result"></div><button id="cm-exit">Close ✖</button>`;
  document.body.appendChild(dim);
  $("cm-machine").onerror = function () { this.style.display = "none"; };
  const rbox = $("cm-recipes"), flash = $("cm-flash"), res = $("cm-result");

  (function () {
    const t = $("cm-title"); let i = 0;
    for (const ch of TITLE) {
      const s = document.createElement("span"); s.textContent = ch;
      if (ch !== " ") s.style.color = LETTER_COLORS[i++ % 2];
      t.appendChild(s);
    }
  })();

  let vidOpen = false, dimOpen = false, dimReady = false, promptOn = false, overPrompt = false, mx = -1, my = -1, readyT = 0, crafting = false, shakeAnim = null, sig = "";

  prompt.addEventListener("pointerenter", () => { overPrompt = true; });
  prompt.addEventListener("pointerleave", () => { overPrompt = false; });
  prompt.addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); overPrompt = false; startVideo(); });
  window.addEventListener("pointerdown", e => {
    if (e.pointerType !== "touch" || (e.target.closest && e.target.closest("#cm-prompt"))) return;
    mx = e.clientX; my = e.clientY; refresh();
  }, true);
  window.addEventListener("pointermove", e => { mx = e.clientX; my = e.clientY; refresh(); });

  function startVideo() {
    if (vidOpen || dimOpen) return;
    vidOpen = true; hideTip();
    vid.style.opacity = "1"; vid.style.display = "block"; vid.currentTime = 0;
    const p = vid.play(); if (p && p.catch) p.catch(() => enterDimension());
  }
  vid.addEventListener("ended", () => enterDimension());
  vid.addEventListener("error", () => { if (vidOpen) enterDimension(); });

  function enterDimension() {
    if (dimOpen || !vidOpen) return;
    vidOpen = false; dimOpen = true; dimReady = false; crafting = false; sig = "";
    res.style.display = "none"; rbox.style.visibility = "visible";
    dim.classList.remove("go"); dim.style.display = "block"; void dim.offsetWidth; dim.classList.add("go");
    renderRecipes();
    clearTimeout(readyT); readyT = setTimeout(() => { dimReady = true; }, 1700);
    vid.style.opacity = "0";
    setTimeout(() => { vid.pause(); vid.style.display = "none"; }, 480);
  }
  function closeAll() {
    if (vidOpen) { vid.pause(); vid.style.display = "none"; vidOpen = false; }
    if (dimOpen) { dim.style.display = "none"; dim.classList.remove("go"); dimOpen = false; dimReady = false; clearTimeout(readyT); res.style.display = "none"; }
  }
  $("cm-exit").onclick = closeAll;

  const canCraft = (r, a) => !!a && (a.money || 0) >= (r.cost || 0) && Object.entries(r.in).every(([t, n]) => stockOf(t) >= n);

  function renderRecipes() {
    const a = acc();
    const s = JSON.stringify(RECIPES.map(r => [canCraft(r, a), Object.keys(r.in).map(stockOf)]));
    if (s === sig) return; sig = s;
    rbox.innerHTML = "";
    RECIPES.forEach(r => {
      const c = document.createElement("div"); c.className = "cm-rc";
      Object.entries(r.in).forEach(([t, n]) => {
        const d = document.createElement("div"); d.className = "cm-ri " + (stockOf(t) >= n ? "ok" : "ko");
        const im = new Image(); im.src = IMG_FRUITS[t]; im.alt = APPLE_NAMES[t]; im.title = APPLE_NAMES[t]; im.draggable = false;
        const q = document.createElement("span"); q.textContent = fmtNum(stockOf(t)) + "/" + fmtNum(n);
        d.append(im, q); c.appendChild(d);
      });
      const ar = document.createElement("div"); ar.className = "cm-arrow"; ar.textContent = "➜"; c.appendChild(ar);
      const o = document.createElement("div"); o.className = "cm-out";
      const oi = new Image(); oi.src = IMG_FRUITS[r.out]; oi.alt = APPLE_NAMES[r.out]; oi.title = APPLE_NAMES[r.out]; oi.draggable = false;
      const on = document.createElement("div"); on.textContent = APPLE_NAMES[r.out];
      const ov = document.createElement("div"); ov.className = "vl"; ov.textContent = "$" + fmtNum(window.FC.priceOf(r.out));
      o.append(oi, on, ov); c.appendChild(o);
      const b = document.createElement("button"); b.className = "cm-cb" + (canCraft(r, a) ? "" : " off");
      b.textContent = r.cost ? "$" + fmtNum(r.cost) : "CRAFT";
      b.onclick = () => startCraft(r);
      c.appendChild(b); rbox.appendChild(c);
    });
  }

  function showResult(t) {
    res.innerHTML = "";
    const box = document.createElement("div"); box.className = "box";
    const im = new Image(); im.draggable = false; im.src = IMG_FRUITS[t]; box.appendChild(im);
    const add = (cls, txt) => { const d = document.createElement("div"); d.className = cls; d.textContent = txt; box.appendChild(d); };
    add("", "You got"); add("nm", APPLE_NAMES[t]); add("vl", "$" + fmtNum(window.FC.priceOf(t)));
    const ok = document.createElement("button"); ok.textContent = "OK";
    ok.onclick = () => { res.style.display = "none"; sig = ""; rbox.style.visibility = "visible"; };
    box.appendChild(ok); res.appendChild(box); res.style.display = "flex";
  }

  function startCraft(r) {
    const a = acc();
    if (crafting || !dimReady || !a) return;
    if ((a.money || 0) < (r.cost || 0)) return say("Not enough money");
    if (!canCraft(r, a)) return say("Missing ingredients");
    crafting = true; rbox.style.visibility = "hidden";
    window.FC.act("/craft", { id: r.id }).then(resp => {
      const t = (resp && resp.result) || r.out;
      const m = $("cm-machine");
      shakeAnim = m.animate([{ rotate: "-1.5deg", translate: "-4px 0" }, { rotate: "1.5deg", translate: "4px 0" }], { duration: 110, iterations: Infinity, direction: "alternate" });
      m.classList.add("glow");
      setTimeout(() => {
        if (shakeAnim) shakeAnim.cancel(); shakeAnim = null; m.classList.remove("glow");
        flash.classList.remove("on"); void flash.offsetWidth; flash.classList.add("on");
        setTimeout(() => {
          crafting = false;
          if (dimOpen) return showResult(t);
          sig = ""; rbox.style.visibility = "visible";
          showAdvancedMsg(`${T("You got")} ${T(APPLE_NAMES[t])}!`, "top", { color: "#4ADE80" });
        }, 250);
      }, 2000);
    }).catch(() => { crafting = false; sig = ""; rbox.style.visibility = "visible"; });
  }

  const blocked = () => ["inventory-screen", "shop-screen", "index-screen", "trade-screen", "trading-screen", "profile-page", "sell-modal", "custom-confirm-modal", "autosell-modal", "add-modal", "account-modal"]
    .some(id => { const e = $(id); return e && getComputedStyle(e).display !== "none"; });

  function hideTip() { promptOn = false; prompt.style.display = "none"; map.classList.remove("hot"); }
  function refresh() {
    if (dimOpen) return;
    const on = active() && !vidOpen;
    map.style.display = active() ? "block" : "none";
    if (!on) { if (promptOn) hideTip(); if (!active()) closeAll(); return; }
    const r = map.getBoundingClientRect(), pad = 6;
    const hover = mx >= r.left - pad && mx <= r.right + pad && my >= r.top - pad && my <= r.bottom + pad;
    const show = (hover || overPrompt) && !blocked();
    map.classList.toggle("hot", show);
    if (show) {
      prompt.style.display = "flex"; promptOn = true;
      const w = prompt.offsetWidth, h = prompt.offsetHeight;
      prompt.style.left = Math.max(8, r.left - w - 4) + "px";
      prompt.style.top = Math.max(8, Math.min(window.innerHeight - h - 8, r.top + r.height / 2 - h / 2)) + "px";
    } else if (promptOn) hideTip();
  }

  window.addEventListener("keydown", e => {
    if ((vidOpen || dimOpen) && e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); closeAll(); return; }
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.toLowerCase() !== "e") return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).nodeName)) return;
    if (promptOn) { e.preventDefault(); startVideo(); }
  }, true);

  setInterval(() => {
    refresh();
    if (dimOpen && !crafting) renderRecipes();
  }, 200);
})();