// witch-fuse.js : Witch Fuse Machine (machine sur la map, popup "E", vidéo, dimension de fusion avec glisser-déposer)
// Script classique : à charger après le script du jeu (même dossier que index.html).
(function () {
  const MACHINE_IMG = "Witch%20Fuze%20Machine.png";
  const VIDEO_SRC = "Transition%20Witch%20Fuse.mp4";
  const TITLE = "Witch Fuse Machine";
  const LETTER_COLORS = ["#4f1c79", "#5f2687"];
  const KEYS = ["A", "Z", "E", "R"], MAX = KEYS.length;

  const $ = id => document.getElementById(id);
  const T = s => (window.T ? window.T(s) : s);
  const acc = () => accounts[currentAccountName];
  const active = () => typeof gameActive !== "undefined" && gameActive && currentGameMode === "adventure";

  /* ---------- styles ---------- */
  const css = document.createElement("style");
  css.textContent = `
  #wf-map{position:fixed;left:0;top:0;z-index:-1;pointer-events:none;display:none;transition:filter .2s,transform .2s}
  #wf-map.hot{filter:drop-shadow(0 0 14px #b47cff) drop-shadow(0 0 4px #fff);transform:scale(1.06)}
  #wf-prompt{position:fixed;z-index:30;pointer-events:none;display:none;align-items:center;gap:10px;padding:8px 12px 8px 8px;background:rgba(20,20,25,.85);border:2px solid rgba(255,255,255,.35);border-radius:12px;color:#fff;font-size:9px;line-height:1.4;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,.45)}
  .wf-k{width:26px;height:26px;flex:none;border-radius:8px;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:12px;background:rgba(255,255,255,.12)}
  #wf-video{position:fixed;inset:0;width:100vw;height:100vh;object-fit:cover;background:#000;z-index:9500;display:none;transition:opacity .45s}
  #wf-dim{position:fixed;inset:0;z-index:9400;display:none;overflow:hidden;color:#fff;background:radial-gradient(circle at 50% 36%,#b9a3d9 0%,#6b4a96 26%,#2a1646 55%,#0d0618 100%)}
  #wf-strip{position:absolute;top:0;left:0;right:0;height:78px;overflow:hidden;background:rgba(10,4,20,.65);border-bottom:2px solid rgba(255,255,255,.2);display:flex;align-items:center;z-index:2}
  #wf-track{display:flex;width:max-content;animation:wf-scroll var(--wf-d,20s) linear infinite}
  #wf-track.pause{animation-play-state:paused}
  .wf-grp{display:flex;gap:14px;padding-right:14px}
  .wf-sep{align-self:center;flex:none;width:4px;height:46px;border-radius:2px;background:rgba(255,255,255,.6)}
  .wf-card{display:flex;align-items:center;gap:8px;padding:6px 12px;background:rgba(255,255,255,.1);border:2px solid rgba(255,255,255,.2);border-radius:12px;font-size:12px;white-space:nowrap}
  .wf-card[data-t]{cursor:grab;touch-action:none}
  .wf-card.lift{opacity:.35}
  .wf-card img{width:40px;height:40px;object-fit:contain;-webkit-user-drag:none}
  .wf-empty{width:100%;text-align:center;font-size:11px;color:#cbbbe6;padding:0 10px}
  @keyframes wf-scroll{to{transform:translateX(-50%)}}
  #wf-title{position:absolute;left:0;right:0;bottom:calc(50vh + 26px);text-align:center;white-space:pre-wrap;font-family:'Press Start 2P',cursive;font-size:clamp(16px,3.6vw,44px);line-height:1.4;opacity:0;-webkit-text-stroke:3px #f4ecff;paint-order:stroke fill;text-shadow:0 4px 0 rgba(0,0,0,.35)}
  #wf-machine{position:absolute;left:50%;bottom:0;height:50vh;max-width:90vw;object-fit:contain;object-position:bottom;transform:translate(-50%,105%);pointer-events:none;transition:filter .15s}
  #wf-machine.drop{filter:drop-shadow(0 0 24px #e0c2ff) drop-shadow(0 0 6px #fff)}
  #wf-dim.go #wf-machine{animation:wf-rise 1.6s cubic-bezier(.2,.8,.25,1) forwards}
  #wf-dim.go #wf-title{animation:wf-fade .7s ease-out 1.1s forwards}
  @keyframes wf-rise{from{transform:translate(-50%,105%)}to{transform:translate(-50%,0)}}
  @keyframes wf-fade{from{opacity:0}to{opacity:1}}
  #wf-exit{position:absolute;left:20px;bottom:20px;border:0;border-radius:10px;padding:12px 18px;background:#c23616;color:#fff;font-size:10px;cursor:pointer;z-index:3}
  #wf-exit:hover{background:#ea2027}
  #wf-slots{position:fixed;z-index:3;pointer-events:none;display:none;gap:12px;padding:12px 14px;border-radius:14px;background:rgba(10,4,20,.74);border:2px solid rgba(255,255,255,.3);transform:translate(-50%,-50%);max-width:96vw;box-sizing:border-box}
  .wf-slot{display:flex;flex-direction:column;align-items:center;gap:8px}
  .wf-slot img{width:52px;height:52px;object-fit:contain}
  .wf-pill{display:flex;align-items:center;gap:6px;font-size:8px;white-space:nowrap}
  #wf-drag{position:fixed;z-index:9600;pointer-events:none;width:64px;height:64px;transform:translate(-50%,-50%)}
  #wf-drag img{width:100%;height:100%;object-fit:contain;display:block;filter:drop-shadow(0 4px 6px rgba(0,0,0,.5))}
  #wf-drag.struggle img{animation:wf-struggle .22s linear infinite}
  @keyframes wf-struggle{0%{transform:rotate(-12deg) translate(-2px,1px)}25%{transform:rotate(10deg) translate(3px,-2px)}50%{transform:rotate(-8deg) translate(-3px,-1px)}75%{transform:rotate(13deg) translate(2px,2px)}100%{transform:rotate(-12deg) translate(-2px,1px)}}
  @media (prefers-reduced-motion:reduce){#wf-track{animation-duration:calc(var(--wf-d,20s)*3)}}`;
  document.head.appendChild(css);

  /* ---------- éléments ---------- */
  const map = new Image(); map.id = "wf-map"; map.src = MACHINE_IMG; map.alt = ""; map.draggable = false;
  map.onerror = () => { map.style.visibility = "hidden"; };
  document.body.appendChild(map);
  // machine à 90°, collée au bord droit, petite : on calcule sa boîte (avant rotation) pour que le bord visible touche le bord de l'écran
  function placeMap() {
    if (!map.naturalWidth) return;
    const H = Math.round(Math.max(64, Math.min(120, window.innerHeight * 0.12)));
    const W = Math.round(H * map.naturalWidth / map.naturalHeight);
    const BOTTOM = 110; // distance au bas de l'écran
    map.style.width = W + "px"; map.style.height = H + "px";
    map.style.left = (window.innerWidth - W - 20) + "px"; map.style.top = (window.innerHeight - H - BOTTOM) + "px";
  }
  map.onload = placeMap; window.addEventListener("resize", placeMap); if (map.complete) placeMap();

  const prompt = document.createElement("div"); prompt.id = "wf-prompt";
  prompt.innerHTML = '<div class="wf-k">E</div><div>Enter the fuse machine</div>';
  document.body.appendChild(prompt);

  const vid = document.createElement("video"); vid.id = "wf-video"; vid.playsInline = true; vid.preload = "auto"; vid.src = VIDEO_SRC;
  document.body.appendChild(vid);

  const dim = document.createElement("div"); dim.id = "wf-dim";
  dim.innerHTML = `<div id="wf-strip"><div id="wf-track"></div></div><div id="wf-title"></div><img id="wf-machine" src="${MACHINE_IMG}" alt="" draggable="false"><div id="wf-slots"></div><button id="wf-exit">Close ✖</button>`;
  document.body.appendChild(dim);
  $("wf-machine").onerror = function () { this.style.display = "none"; };
  const slots = $("wf-slots"), track = $("wf-track");

  // titre : une lettre sur deux dans l'autre couleur (les espaces ne comptent pas)
  (function () {
    const t = $("wf-title"); let i = 0;
    for (const ch of TITLE) {
      const s = document.createElement("span"); s.textContent = ch;
      if (ch !== " ") s.style.color = LETTER_COLORS[i++ % 2];
      t.appendChild(s);
    }
  })();

  /* ---------- données : pommes dans la fuse (sauvegardées dans le compte : acc.fuse) ---------- */
  const fuseArr = () => { const a = acc(); if (!a) return []; if (!Array.isArray(a.fuse)) a.fuse = []; return a.fuse; };
  const stockOf = t => { const a = acc(); return a ? (a[APPLE_FIELDS[t]] || 0) : 0; };
  function persist() { if (window.autosellReset) window.autosellReset(); saveAllAccounts(); } // reset : l'Autosell ne doit pas revendre une pomme rendue
  function commitAdd(t) { const a = acc(), f = APPLE_FIELDS[t]; a[f] = (a[f] || 0) - 1; fuseArr().push(t); persist(); }

  /* ---------- inventaire défilant ---------- */
  function listItems() {
    const a = acc(), out = []; if (!a) return out;
    APPLE_ORDER.forEach(t => { const n = a[APPLE_FIELDS[t]] || 0; if (n > 0) out.push({ t, img: IMG_FRUITS[t], n, name: APPLE_NAMES[t] }); });
    Object.entries(a.potions || {}).forEach(([id, n]) => {
      const p = SHOP_PRODUCTS.find(p => p.id === id);
      if (p && n > 0) out.push({ img: IMG_POTIONS[p.type], n, name: `Luck x${p.multiplier} (${p.duration}s)` });
    });
    return out;
  }
  let lastSig = "";
  function renderStrip(force) {
    const list = listItems(), sig = JSON.stringify(list.map(i => [i.name, i.n]));
    if (!force && sig === lastSig) return; lastSig = sig;
    let phase = 0; // on garde la position du défilement quand la liste change
    if (track.firstChild && track.style.animation !== "none") {
      try { const m = new DOMMatrix(getComputedStyle(track).transform), half = track.scrollWidth / 2; if (half > 0) phase = Math.min(1, Math.max(0, -m.m41 / half)); } catch (e) {}
    }
    track.innerHTML = "";
    if (!list.length) {
      track.style.animation = "none"; track.style.width = "100%";
      const e = document.createElement("div"); e.className = "wf-empty"; e.textContent = "You have no apples"; track.appendChild(e); return;
    }
    track.style.animation = ""; track.style.width = "";
    const group = () => {
      const g = document.createElement("div"); g.className = "wf-grp";
      list.forEach(i => {
        const c = document.createElement("div"); c.className = "wf-card"; c.title = i.name; if (i.t) c.dataset.t = i.t;
        const im = new Image(); im.src = i.img; im.alt = i.name; im.draggable = false;
        const q = document.createElement("span"); q.textContent = "x" + fmtNum(i.n);
        c.append(im, q); g.appendChild(c);
      });
      const sep = document.createElement("div"); sep.className = "wf-sep"; g.appendChild(sep); // trait entre la fin et le recommencement
      return g;
    };
    const g0 = group(); track.appendChild(g0);
    requestAnimationFrame(() => {
      const w = g0.getBoundingClientRect().width || 1, reps = Math.max(1, Math.ceil(window.innerWidth / w)), dur = w * reps / 70; // ~70 px/s
      track.innerHTML = ""; for (let k = 0; k < reps * 2; k++) track.appendChild(group());
      track.style.setProperty("--wf-d", dur + "s"); track.style.animationDelay = (-phase * dur) + "s";
    });
  }

  /* ---------- séquence : popup -> E -> vidéo -> dimension ---------- */
  let vidOpen = false, dimOpen = false, dimReady = false, hover = false, promptOn = false, mx = -1, my = -1, fuseHover = false, readyT = 0;

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
    vidOpen = false; dimOpen = true; dimReady = false; slotSig = "";
    dim.classList.remove("go"); dim.style.display = "block"; void dim.offsetWidth; dim.classList.add("go");
    renderStrip(true);
    clearTimeout(readyT); readyT = setTimeout(() => { dimReady = true; }, 1700); // la machine a fini de monter
    vid.style.opacity = "0";
    setTimeout(() => { vid.pause(); vid.style.display = "none"; }, 480);
  }
  function closeAll() {
    cancelDrag();
    if (vidOpen) { vid.pause(); vid.style.display = "none"; vidOpen = false; }
    if (dimOpen) { dim.style.display = "none"; dim.classList.remove("go"); dimOpen = false; dimReady = false; fuseHover = false; slots.style.display = "none"; clearTimeout(readyT); }
  }
  $("wf-exit").onclick = closeAll;

  /* ---------- glisser-déposer des pommes ---------- */
  let drag = null;
  const say = m => { try { showAdvancedMsg(T(m), "top", { color: "white" }); } catch (e) {} };
  function machineRect() {
    const r = $("wf-machine").getBoundingClientRect();
    if (r.width > 0) return r;
    const W = window.innerWidth, H = window.innerHeight; // image absente : zone de secours au milieu bas
    return { left: W * .3, right: W * .7, top: H * .5, bottom: H, width: W * .4, height: H * .5 };
  }
  const inMachine = (x, y) => { const r = machineRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; };
  function unpause() { if (!drag) track.classList.remove("pause"); }

  track.addEventListener("pointerdown", e => {
    if (!dimOpen || !dimReady || drag || e.button > 0) return;
    const c = e.target.closest(".wf-card[data-t]"); if (!c) return;
    const t = c.dataset.t; if (stockOf(t) < 1) return;
    e.preventDefault();
    const el = document.createElement("div"); el.id = "wf-drag"; el.className = "struggle";
    const im = new Image(); im.src = IMG_FRUITS[t]; im.draggable = false; el.appendChild(im); document.body.appendChild(el);
    drag = { t, el, src: c }; c.classList.add("lift"); track.classList.add("pause");
    moveDrag(e);
  });
  function moveDrag(e) {
    if (!drag) return;
    drag.el.style.left = e.clientX + "px"; drag.el.style.top = e.clientY + "px";
    $("wf-machine").classList.toggle("drop", inMachine(e.clientX, e.clientY));
  }
  window.addEventListener("pointermove", e => { mx = e.clientX; my = e.clientY; if (drag) moveDrag(e); refresh(); });
  window.addEventListener("pointerup", e => { if (drag) endDrag(e); });
  window.addEventListener("pointercancel", () => cancelDrag());

  function doneDrag(d) { d.el.remove(); if (d.src) d.src.classList.remove("lift"); unpause(); }
  function endDrag(e) {
    const d = drag; drag = null; $("wf-machine").classList.remove("drop"); d.el.classList.remove("struggle");
    if (inMachine(e.clientX, e.clientY)) {
      if (fuseArr().length >= MAX) { say("The fuse is full"); return flyBack(d); }
      if (stockOf(d.t) < 1) return flyBack(d);
      commitAdd(d.t); // la pomme quitte l'inventaire et entre dans la fuse
      const r = machineRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      d.el.style.transition = "left .45s ease-in,top .45s ease-in,transform .45s ease-in,opacity .45s ease-in"; void d.el.offsetWidth;
      d.el.style.left = cx + "px"; d.el.style.top = cy + "px"; d.el.style.transform = "translate(-50%,-50%) scale(.05)"; d.el.style.opacity = ".2";
      setTimeout(() => doneDrag(d), 480);
    } else flyBack(d);
  }
  function flyBack(d) { // la pomme revient vers sa carte dans l'inventaire
    const t0 = performance.now();
    (function step() {
      let tx = window.innerWidth / 2, ty = 39;
      if (d.src && d.src.isConnected) { const r = d.src.getBoundingClientRect(); tx = r.left + r.width / 2; ty = r.top + r.height / 2; }
      const cx = parseFloat(d.el.style.left), cy = parseFloat(d.el.style.top), nx = cx + (tx - cx) * .22, ny = cy + (ty - cy) * .22;
      d.el.style.left = nx + "px"; d.el.style.top = ny + "px";
      if (Math.hypot(tx - nx, ty - ny) < 6 || performance.now() - t0 > 1200) return doneDrag(d);
      requestAnimationFrame(step);
    })();
  }
  function cancelDrag() {
    if (!drag) return; const d = drag; drag = null; $("wf-machine").classList.remove("drop"); doneDrag(d);
  }

  /* ---------- pommes dans la fuse : visibles quand le pointeur est dessus, touches A Z E R pour les ressortir ---------- */
  let slotSig = "";
  function buildSlots(arr) {
    slots.innerHTML = "";
    arr.forEach((t, i) => {
      const s = document.createElement("div"); s.className = "wf-slot";
      const im = new Image(); im.src = IMG_FRUITS[t]; im.alt = APPLE_NAMES[t]; im.draggable = false;
      const p = document.createElement("div"); p.className = "wf-pill";
      const k = document.createElement("div"); k.className = "wf-k"; k.textContent = KEYS[i];
      const tx = document.createElement("span"); tx.textContent = "to return it";
      p.append(k, tx); s.append(im, p); slots.appendChild(s);
    });
  }
  function refreshDim() {
    const arr = fuseArr(), r = machineRect();
    fuseHover = dimReady && !drag && mx >= r.left && mx <= r.right && my >= r.top && my <= r.bottom;
    const show = fuseHover && arr.length > 0;
    slots.style.display = show ? "flex" : "none";
    if (!show) return;
    const sig = arr.join(",");
    if (sig !== slotSig) { slotSig = sig; buildSlots(arr); }
    slots.style.left = (r.left + r.width / 2) + "px"; slots.style.top = (r.top + r.height / 2) + "px";
  }
  function returnApple(i) {
    const arr = fuseArr(); if (i >= arr.length) return;
    const el = slots.children[i], ir = el && el.querySelector("img") ? el.querySelector("img").getBoundingClientRect() : null, mr = machineRect();
    const fx = ir ? ir.left + ir.width / 2 : mr.left + mr.width / 2, fy = ir ? ir.top + ir.height / 2 : mr.top + mr.height / 2;
    const t = arr.splice(i, 1)[0], a = acc(), f = APPLE_FIELDS[t];
    a[f] = (a[f] || 0) + 1; persist(); slotSig = ""; refreshDim();
    const fl = document.createElement("div"); fl.id = "wf-drag"; fl.style.left = fx + "px"; fl.style.top = fy + "px"; fl.style.transform = "translate(-50%,-50%) scale(.4)";
    const im = new Image(); im.src = IMG_FRUITS[t]; im.draggable = false; fl.appendChild(im); document.body.appendChild(fl);
    fl.style.transition = "left .6s ease-out,top .6s ease-out,transform .6s ease-out,opacity .6s ease-in"; void fl.offsetWidth;
    fl.style.left = window.innerWidth / 2 + "px"; fl.style.top = "39px"; fl.style.transform = "translate(-50%,-50%) scale(1)"; fl.style.opacity = ".3";
    setTimeout(() => fl.remove(), 650);
  }

  window.addEventListener("keydown", e => {
    if ((vidOpen || dimOpen) && e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); closeAll(); return; }
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (dimOpen && fuseHover && !drag) {
      const i = KEYS.findIndex(k => k.toLowerCase() === e.key.toLowerCase());
      if (i >= 0 && i < fuseArr().length) { e.preventDefault(); returnApple(i); return; }
    }
    if (e.key.toLowerCase() !== "e") return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).nodeName)) return;
    if (promptOn) { e.preventDefault(); startVideo(); }
  }, true);

  /* ---------- survol de la machine sur la map ---------- */
  const blocked = () => ["inventory-screen", "shop-screen", "index-screen", "trade-screen", "trading-screen", "profile-page", "sell-modal", "custom-confirm-modal", "autosell-modal", "add-modal", "account-modal"]
    .some(id => { const e = $(id); return e && getComputedStyle(e).display !== "none"; });

  function hideTip() { promptOn = false; prompt.style.display = "none"; map.classList.remove("hot"); }
  function refresh() {
    if (dimOpen) { refreshDim(); return; }
    const on = active() && !vidOpen;
    map.style.display = active() ? "block" : "none";
    if (!on) { if (promptOn) hideTip(); if (!active()) closeAll(); return; }
    const r = map.getBoundingClientRect(), pad = 6;
    hover = mx >= r.left - pad && mx <= r.right + pad && my >= r.top - pad && my <= r.bottom + pad;
    const show = hover && !blocked();
    map.classList.toggle("hot", show);
    if (show) {
      prompt.style.display = "flex"; promptOn = true;
      const w = prompt.offsetWidth, h = prompt.offsetHeight; // bulle à gauche de la machine (collée au bord droit)
      prompt.style.left = Math.max(8, r.left - w - 12) + "px";
      prompt.style.top = Math.max(8, Math.min(window.innerHeight - h - 8, r.top + r.height / 2 - h / 2)) + "px";
    } else if (promptOn) hideTip();
  }
  setInterval(() => { refresh(); if (dimOpen) renderStrip(false); }, 200);
})();