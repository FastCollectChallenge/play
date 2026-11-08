(function () {
  const MACHINE_IMG = "GUI/La%20Craft%20Machine.png";
  const VIDEO_SRC = "GUI/Transition%20Craft%20Machine.mp4";
  const TITLE = "La Craft Machine";

  // Recettes fournies par le serveur : 4 recettes de 4 pommes, renouvelées toutes les 30 min
  let RECIPES = [], SLOT = 0, NEXT = 0, loadingR = false;

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
  #cm-dim{position:fixed;inset:0;z-index:9400;display:none;overflow:hidden;color:#e8ecf4;background:radial-gradient(1200px 700px at 15% 10%,rgba(124,92,255,.22),transparent 60%),radial-gradient(900px 600px at 90% 90%,rgba(34,211,238,.16),transparent 60%),linear-gradient(180deg,#0a0d14,#0d1220)}
  #cm-lcol{position:absolute;left:0;top:0;bottom:0;width:50%;display:flex;flex-direction:column;align-items:center;gap:12px;padding:56px 10px 16px 20px;box-sizing:border-box;z-index:2;transition:width .6s ease,padding .6s ease}
  #cm-inv{width:100%;max-height:26vh;overflow-y:auto;padding:10px 12px;box-sizing:border-box;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);border-radius:16px;backdrop-filter:blur(12px);scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.2) transparent;flex:none}
  .cm-invh{font-size:11px;font-weight:700;color:#a5b4fc;margin-bottom:6px}
  #cm-invg{display:flex;flex-wrap:wrap;gap:6px}
  .cm-ic{display:flex;align-items:center;gap:4px;padding:3px 9px 3px 4px;border-radius:10px;background:rgba(255,255,255,.08);font-size:11px;font-weight:600}
  .cm-ic img{width:26px;height:26px;object-fit:contain}
  .cm-ic.none{color:#8b95a8}
  #cm-center{flex:1;min-height:0;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px}
  #cm-title{max-height:90px;overflow:hidden;transition:max-height .6s ease,margin .6s ease;text-align:center;white-space:pre-wrap;font-weight:800;letter-spacing:-.03em;font-size:clamp(24px,3.6vw,52px);line-height:1.3;opacity:0;background:linear-gradient(90deg,#ffffff,#a5b4fc 50%,#67e8f9);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;text-shadow:none}
  #cm-mw{position:relative;height:42vh;max-width:100%;transform:translateY(120vh);pointer-events:none;transition:filter .15s,height .6s ease}
  #cm-machine{display:block;height:100%;width:auto;max-width:100%;object-fit:contain}
  #cm-mw.glow{filter:drop-shadow(0 0 24px #a5b4fc) drop-shadow(0 0 6px #fff)}
  #cm-ap{position:absolute;left:50%;bottom:25%;width:24%;aspect-ratio:1;transform:translateX(-50%);transform-origin:50% 100%;display:none;pointer-events:none}
  #cm-ap.grow{animation:cm-grow .7s ease-in forwards}
  @keyframes cm-grow{from{scale:1;filter:brightness(1)}to{scale:1.7;filter:brightness(1.4) drop-shadow(0 0 18px #a5b4fc)}}
  #cm-ap img{width:100%;height:100%;object-fit:contain;display:block;clip-path:inset(100% 0 0 0)}
  #cm-ap i{position:absolute;left:-6%;right:-6%;top:100%;height:2px;background:#fff;box-shadow:0 0 10px 2px #a5b4fc,0 0 18px 4px #67e8f9;opacity:0}
  #cm-ap.draw img{animation:cm-draw 5s steps(40,end) forwards}
  #cm-ap.draw i{animation:cm-scan 5s steps(40,end) forwards}
  @keyframes cm-draw{from{clip-path:inset(100% 0 0 0)}to{clip-path:inset(0 0 0 0)}}
  @keyframes cm-scan{0%{top:100%;opacity:1}99%{opacity:1}100%{top:0;opacity:0}}
  #cm-dim.go #cm-mw{animation:cm-rise 1.6s cubic-bezier(.2,.8,.25,1) forwards}
  #cm-dim.go #cm-title{animation:cm-fade .7s ease-out 1.1s forwards}
  #cm-timer{transition:opacity .4s}
  #cm-dim.cr #cm-timer,#cm-dim.cr #cm-exit{opacity:0;pointer-events:none}
  #cm-dim.cr #cm-lcol{width:100%;padding-right:20px}
  #cm-dim.cr #cm-title{max-height:0;margin-bottom:-18px}
  #cm-dim.cr #cm-mw{height:52vh}
  @keyframes cm-rise{from{transform:translateY(120vh)}to{transform:translateY(0)}}
  @keyframes cm-fade{from{opacity:0}to{opacity:1}}
  #cm-exit{position:absolute;left:20px;bottom:20px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);color:#e8ecf4;font-size:12px;font-weight:600;border-radius:10px;padding:9px 16px;cursor:pointer;z-index:3;backdrop-filter:blur(12px);transition:background .2s,border-color .2s,opacity .4s}
  #cm-exit:hover{background:rgba(244,63,94,.22);border-color:rgba(244,63,94,.5)}
  #cm-recipes{position:absolute;right:0;top:56px;bottom:16px;width:50%;display:flex;align-items:stretch;justify-content:center;padding:0 20px 0 10px;box-sizing:border-box;overflow:hidden;z-index:2}
  #cm-grid{display:grid;grid-template-columns:minmax(0,1fr);grid-auto-rows:1fr;gap:12px;width:100%;height:100%}
  .cm-rc{display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px 10px;background:rgba(10,4,20,.72);border:2px solid rgba(255,255,255,.25);border-radius:14px;color:#fff;min-width:0;justify-content:center}
  .cm-orow{display:flex;align-items:center;gap:8px}
  .cm-on{display:flex;flex-direction:column;align-items:flex-start;gap:1px;font-size:9px;line-height:1.2}
  .cm-ings{display:flex;flex-wrap:wrap;gap:6px;justify-content:center}
  .cm-rc.adm{border-color:#f1c40f}
  .cm-tag{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 8px;font-size:8px;line-height:1.3;color:#f6e27a}
  .cm-rc.none{opacity:.8;font-size:10px;grid-column:1/-1}
  #cm-timer{position:absolute;left:0;right:0;top:0;width:100%;box-sizing:border-box;z-index:3;padding:14px 20px;text-align:center;background:rgba(10,13,20,.8);border-bottom:1px solid rgba(255,255,255,.10);backdrop-filter:blur(12px);font-size:14px;font-weight:600;color:#e8ecf4}
  #cm-timer b{color:#a5b4fc}
  .cm-ri{display:flex;flex-direction:column;align-items:center;gap:2px;font-size:9px;padding:3px;border-radius:9px;border:2px solid rgba(255,255,255,.18);background:rgba(255,255,255,.05)}
  .cm-ri img{opacity:.55;transition:opacity .15s}
  .cm-ri.ok{border-color:#4ADE80;background:rgba(74,222,128,.35)}
  .cm-ri.ok img{opacity:1}
  .cm-rc.ready{background:rgba(46,204,113,.5);border-color:#4ADE80}
  .cm-ri img{width:clamp(22px,4.4vh,34px);height:clamp(22px,4.4vh,34px);object-fit:contain}
  .cm-ri.ok span{color:#fff}.cm-ri.ko span{color:#ff6b6b}
  .cm-arrow{font-size:16px;opacity:.7}
  .cm-out{display:flex;flex-direction:column;align-items:center;gap:2px;font-size:9px}
  .cm-orow img{width:clamp(28px,5.5vh,42px);height:clamp(28px,5.5vh,42px);object-fit:contain}
  .cm-on .vl{color:#4ADE80}
  .cm-cb{border:0;border-radius:10px;padding:8px 12px;background:#27ae60;color:#fff;font-size:11px;cursor:pointer}
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
  dim.innerHTML = `<div id="cm-timer">Next recipes in <b id="cm-left">--:--</b></div><div id="cm-lcol"><div id="cm-inv"></div><div id="cm-center"><div id="cm-title"></div><div id="cm-mw"><img id="cm-machine" src="${MACHINE_IMG}" alt="" draggable="false"><div id="cm-ap"><img alt="" draggable="false"><i></i></div></div></div></div><div id="cm-recipes"></div><div id="cm-flash"></div><div id="cm-result"></div><button id="cm-exit">Close ✖</button>`;
  document.body.appendChild(dim);
  $("cm-machine").onerror = function () { this.style.display = "none"; };
  const rbox = $("cm-recipes"), flash = $("cm-flash"), res = $("cm-result");

  $("cm-title").textContent = TITLE;

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
    vidOpen = false; dimOpen = true; dimReady = false; crafting = false; sig = ""; dim.classList.remove("cr");
    res.style.display = "none"; rbox.style.visibility = "visible";
    dim.classList.remove("go"); dim.style.display = "block"; void dim.offsetWidth; dim.classList.add("go");
    invSig = ""; renderInv(); renderRecipes(); loadRecipes();
    clearTimeout(readyT); readyT = setTimeout(() => { dimReady = true; }, 1700);
    vid.style.opacity = "0";
    setTimeout(() => { vid.pause(); vid.style.display = "none"; }, 480);
  }
  function closeAll() {
    if (vidOpen) { vid.pause(); vid.style.display = "none"; vidOpen = false; }
    if (dimOpen) { dim.style.display = "none"; dim.classList.remove("go", "cr"); dimOpen = false; dimReady = false; clearTimeout(readyT); res.style.display = "none"; }
  }
  $("cm-exit").onclick = closeAll;

  const sold = r => r.stock === 0, owned = r => r.per > 0 && (r.mine || 0) >= r.per;
  const canCraft = (r, a) => !!a && !sold(r) && !owned(r) && (a.money || 0) >= (r.cost || 0) && Object.entries(r.in).every(([t, n]) => stockOf(t) >= n);
  const priceTxt = t => { const p = window.FC.priceOf(t); return p > 0 ? "$" + fmtNum(p) : T("Untradable"); };
  const fmtLeft = ms => { ms = Math.max(0, ms); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sc = Math.floor(ms / 1000) % 60; return h ? h + "h " + String(m).padStart(2, "0") + "m" : String(m).padStart(2, "0") + ":" + String(sc).padStart(2, "0"); };

  function loadRecipes() {
    if (loadingR) return Promise.resolve(); loadingR = true;
    return window.FC.api("/craft/recipes").then(j => { RECIPES = j.recipes || []; SLOT = j.slot; NEXT = j.next; sig = ""; })
      .catch(() => {}).then(() => { loadingR = false; sig = ""; });
  }
  function tickTimer() {
    const el = $("cm-left"); if (!el) return;
    const left = Math.max(0, NEXT - window.FC.srvNow()), m = Math.floor(left / 60000), sec = Math.floor(left / 1000) % 60;
    el.textContent = NEXT ? String(m).padStart(2, "0") + ":" + String(sec).padStart(2, "0") : "--:--";
    if (NEXT && left <= 0 && !crafting) loadRecipes();
  }

  function fit() { // les 4 recettes doivent toujours être visibles sans scroll
    const g = $("cm-grid"); if (!g) return;
    g.style.zoom = 1;
    if (!rbox.clientHeight || !g.offsetHeight) return;
    g.style.zoom = Math.min(1, rbox.clientHeight / g.offsetHeight);
  }
  window.addEventListener("resize", () => { if (dimOpen) fit(); });

  function tickTags() {
    const now = window.FC.srvNow();
    document.querySelectorAll("#cm-grid .cm-exp").forEach(el => {
      const left = Number(el.dataset.exp) - now; el.textContent = fmtLeft(left);
      if (left <= 0 && !crafting && !loadingR) loadRecipes();
    });
  }

  function renderRecipes() {
    const a = acc();
    const s = SLOT + JSON.stringify(RECIPES.map(r => [r.id, r.stock, r.mine, canCraft(r, a), Object.keys(r.in).map(stockOf)]));
    if (s === sig) return; sig = s;
    rbox.innerHTML = "";
    const grid = document.createElement("div"); grid.id = "cm-grid"; rbox.appendChild(grid);
    if (!RECIPES.length) { const e = document.createElement("div"); e.className = "cm-rc none"; e.textContent = T(loadingR ? "Loading..." : "No recipe available"); grid.appendChild(e); return; }
    RECIPES.forEach(r => {
      const c = document.createElement("div"); c.className = "cm-rc" + (String(r.id).startsWith("a:") ? " adm" : "") + (canCraft(r, a) ? " ready" : "");
      if (String(r.id).startsWith("a:")) {
        const tg = document.createElement("div"); tg.className = "cm-tag";
        const add = txt => { const x = document.createElement("span"); x.textContent = txt; tg.appendChild(x); return x; };
        add(r.stock < 0 ? "∞ " + T("stock") : r.stock === 0 ? T("SOLD OUT") : r.stock + " " + T("left"));
        if (r.per > 0) add((r.mine || 0) + "/" + r.per + " " + T("per player"));
        if (r.expires) { const x = add(""); x.className = "cm-exp"; x.dataset.exp = r.expires; x.textContent = fmtLeft(r.expires - window.FC.srvNow()); }
        c.appendChild(tg);
      }
      const ings = document.createElement("div"); ings.className = "cm-ings"; c.appendChild(ings);
      Object.entries(r.in).forEach(([t, n]) => {
        const have = stockOf(t), mk = ok => { // une case par pomme ; elle devient verte quand la pomme est disponible
          const d = document.createElement("div"); d.className = "cm-ri " + (ok ? "ok" : "ko");
          const im = new Image(); im.src = IMG_FRUITS[t]; im.alt = APPLE_NAMES[t]; im.title = APPLE_NAMES[t]; im.draggable = false;
          d.appendChild(im); return d;
        };
        if (n <= 8) { for (let k = 0; k < n; k++) ings.appendChild(mk(have > k)); }
        else { const d = mk(have >= n), q = document.createElement("span"); q.textContent = fmtNum(have) + "/" + fmtNum(n); d.appendChild(q); ings.appendChild(d); } // grosses quantités (recettes admin) : compteur
      });
      const row = document.createElement("div"); row.className = "cm-orow";
      const ar = document.createElement("div"); ar.className = "cm-arrow"; ar.textContent = "➜";
      const oi = new Image(); oi.src = IMG_FRUITS[r.out]; oi.alt = APPLE_NAMES[r.out]; oi.title = APPLE_NAMES[r.out]; oi.draggable = false;
      const on = document.createElement("div"); on.className = "cm-on";
      const nm = document.createElement("div"); nm.textContent = APPLE_NAMES[r.out];
      const ov = document.createElement("div"); ov.className = "vl"; ov.textContent = priceTxt(r.out);
      on.append(nm, ov);
      const b = document.createElement("button"); b.className = "cm-cb" + (canCraft(r, a) ? "" : " off");
      b.textContent = sold(r) ? T("SOLD OUT") : owned(r) ? T("OWNED") : r.cost ? "$" + fmtNum(r.cost) : "CRAFT";
      b.onclick = () => startCraft(r);
      row.append(ar, oi, on, b); c.appendChild(row); grid.appendChild(c);
    });
    fit();
  }

  let invSig = "";
  function renderInv() {
    const box = $("cm-inv"), a = acc(); if (!box || !a) return;
    const items = APPLE_ORDER.filter(t => APPLE_FIELDS[t] && stockOf(t) > 0);
    const s = items.map(t => t + ":" + stockOf(t)).join("|");
    if (s === invSig) return; invSig = s;
    box.innerHTML = "";
    const h = document.createElement("div"); h.className = "cm-invh"; h.textContent = T("Inventory"); box.appendChild(h);
    const g = document.createElement("div"); g.id = "cm-invg"; box.appendChild(g);
    if (!items.length) { const e = document.createElement("div"); e.className = "cm-ic none"; e.textContent = "-"; g.appendChild(e); return; }
    items.forEach(t => {
      const c = document.createElement("div"); c.className = "cm-ic"; c.title = APPLE_NAMES[t];
      const im = new Image(); im.src = IMG_FRUITS[t]; im.alt = APPLE_NAMES[t]; im.draggable = false;
      const q = document.createElement("span"); q.textContent = "x" + fmtNum(stockOf(t));
      c.append(im, q); g.appendChild(c);
    });
  }

  function showResult(t) {
    rbox.style.visibility = "visible"; sig = "";
    res.innerHTML = "";
    const box = document.createElement("div"); box.className = "box";
    const im = new Image(); im.draggable = false; im.src = IMG_FRUITS[t]; box.appendChild(im);
    const add = (cls, txt) => { const d = document.createElement("div"); d.className = cls; d.textContent = txt; box.appendChild(d); };
    add("", "You got"); add("nm", APPLE_NAMES[t]); add("vl", priceTxt(t));
    const ok = document.createElement("button"); ok.textContent = "OK";
    ok.onclick = () => { res.style.display = "none"; sig = ""; rbox.style.visibility = "visible"; };
    box.appendChild(ok); res.appendChild(box); res.style.display = "flex";
  }

  function startCraft(r) {
    const a = acc();
    if (crafting || !dimReady || !a) return;
    if ((a.money || 0) < (r.cost || 0)) return say("Not enough money");
    if (!canCraft(r, a)) return say("Missing ingredients");
    crafting = true; rbox.style.visibility = "hidden"; dim.classList.add("cr");
    window.FC.act("/craft", { id: r.id, slot: SLOT }).then(resp => {
      const t = (resp && resp.result) || r.out;
      const m = $("cm-mw"), ap = $("cm-ap"), api = ap.querySelector("img");
      api.src = IMG_FRUITS[t]; ap.style.display = "block"; ap.classList.remove("draw", "grow", "boom"); void ap.offsetWidth; ap.classList.add("draw");
      shakeAnim = m.animate([{ rotate: "-1.5deg", translate: "-4px 0" }, { rotate: "1.5deg", translate: "4px 0" }], { duration: 110, iterations: Infinity, direction: "alternate" });
      m.classList.add("glow");
      setTimeout(() => { // la pomme est finie : elle grossit, la machine tremble plus fort
        if (shakeAnim) shakeAnim.cancel();
        shakeAnim = m.animate([{ rotate: "-3deg", translate: "-9px 0" }, { rotate: "3deg", translate: "9px 0" }], { duration: 70, iterations: Infinity, direction: "alternate" });
        ap.classList.add("grow");
      }, 5000);
      setTimeout(() => { // la pomme s'envole vers l'inventaire en tournant
        if (shakeAnim) shakeAnim.cancel(); shakeAnim = null; m.classList.remove("glow");
        const r = ap.getBoundingClientRect(), inv = $("cm-inv"), ir = inv.getBoundingClientRect();
        ap.classList.remove("grow", "draw"); dim.appendChild(ap);
        ap.style.cssText = `display:block;position:fixed;z-index:3;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;bottom:auto;transform:none;transform-origin:50% 50%;filter:brightness(1.4) drop-shadow(0 0 18px #a5b4fc)`;
        api.style.clipPath = "none";
        const dx = ir.left + ir.width / 2 - (r.left + r.width / 2), dy = ir.top + ir.height / 2 - (r.top + r.height / 2);
        const fly = ap.animate([{ translate: "0 0", rotate: "0deg", scale: 1 }, { translate: dx + "px " + dy + "px", rotate: "720deg", scale: 0.25 }], { duration: 900, easing: "ease-in", fill: "forwards" });
        fly.onfinish = () => { // elle entre dans l'inventaire : il rebondit et l'écran flashe
          fly.cancel(); ap.style.cssText = "display:none"; api.style.clipPath = ""; $("cm-mw").appendChild(ap);
          inv.animate([{ scale: 1 }, { scale: 1.07 }, { scale: 0.97 }, { scale: 1.03 }, { scale: 1 }], { duration: 500, easing: "ease-out" });
          flash.classList.remove("on"); void flash.offsetWidth; flash.classList.add("on");
          setTimeout(() => {
            crafting = false; invSig = ""; dim.classList.remove("cr"); loadRecipes();
            if (dimOpen) return showResult(t);
            sig = ""; rbox.style.visibility = "visible";
            showAdvancedMsg(`${T("You got")} ${T(APPLE_NAMES[t])}!`, "top", { color: "#4ADE80" });
          }, 250);
        };
      }, 5700);
    }).catch(() => { crafting = false; dim.classList.remove("cr"); sig = ""; rbox.style.visibility = "visible"; loadRecipes(); });
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
    if (dimOpen) { tickTimer(); tickTags(); }
    if (dimOpen && !crafting) renderInv();
    if (dimOpen && !crafting) renderRecipes();
  }, 200);
})();