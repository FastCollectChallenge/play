// game-ui.js : logos, popups sans pause, Échap / clic extérieur, Select apples to sell, Autosell, +$
(function () {
  const $ = id => document.getElementById(id);
  const TITLE_LOGO = "https://raw.githubusercontent.com/FastCollectChallenge/play/main/Fast%20Collect%20Challenge%20Title%20logo.png";
  const LOGO = "https://raw.githubusercontent.com/FastCollectChallenge/play/main/Fast%20Collect%20Challenge%20Ingame%20logo.png";
  const PRICE = { red: 1, green: 3, golden: 7, diamond: 15, candy: 50, lava: 200, galaxy: 500, dark: 1000, moony: 50000, salhini: 676767, bloodmoon: 6666666 };
  const css = document.createElement("style");
  css.textContent = `.nun,.nun *{font-family:'Nunito',sans-serif!important;font-weight:700!important}
  .logo-placeholder{border:none!important;background:none!important;padding:0!important}
  #inv-btn .side-btn-label{font-size:6px!important}
  #shop-btn .side-btn-label,#index-btn .side-btn-label,#trade-btn .side-btn-label{font-size:10px!important}
  .fr #shop-btn .side-btn-label,.fr #trade-btn .side-btn-label{font-size:8px!important}
  @keyframes popin{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:none}}
  @keyframes fadein{from{opacity:0}to{opacity:1}}
  #inventory-screen,#shop-screen,#index-screen,#trade-screen,.sell-box,.confirm-box,#autosell-modal>div{animation:popin .22s ease-out}
  #sell-modal,#custom-confirm-modal,#autosell-modal,#profile-page{animation:fadein .2s ease-out}
  #sell-modal .sell-box{width:460px!important}
  .qty-col{display:flex;flex-direction:column;gap:6px}
  .qty-btn{border:0;border-radius:8px;padding:8px 0;font-size:10px;color:#fff;cursor:pointer}
  .qty-btn:hover{filter:brightness(1.2)}.qty-neg{background:#c23616}.qty-pos{background:#487eb0}
  #trade-btn{position:absolute!important;top:0;left:84px}
  #trade-btn .side-btn-label{color:#677f85}
  #trade-btn img{filter:url(#fc-tint)}
  #inv-bar{position:absolute;left:30px;right:30px;bottom:18px;display:flex;justify-content:space-between;align-items:center;pointer-events:none}
  #inv-bar button{pointer-events:auto}
  .bar-btn,.bar-half{border:0;font-size:16px;font-weight:400;color:#fff;cursor:pointer}
  .bar-btn{border-radius:14px;padding:12px 20px}.bar-half{padding:12px 22px}
  .bar-blue{background:#487eb0}.bar-green{background:#27ae60}.bar-yellow{background:#f1c40f;color:#000}.bar-red{background:#c23616}
  #bar-right{display:flex;gap:12px;align-items:center}
  #selall-btn,#split{display:none}
  #bar-right.sel #sel-btn{display:none}#bar-right.sel #selall-btn{display:block}#bar-right.sel #split{display:flex}
  #split{border-radius:14px;overflow:hidden}
  .bar-half:disabled{opacity:.35;cursor:not-allowed}
  #inventory-grid{padding-bottom:80px!important}
  #inventory-grid.selmode .sell-btn{display:none}
  #inventory-grid.selmode .inv-item-card.sel{border-color:#4ADE80;background:rgba(74,222,128,.25)}
  .auto-card{background:rgba(255,255,255,.08);border:3px solid rgba(255,255,255,.15);border-radius:16px;padding:10px;text-align:center;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;font-weight:400;font-size:14px}
  .auto-card img{width:56px;height:56px;object-fit:contain}.auto-card b{color:#7f8fa6}
  .auto-card.on{border-color:#27ae60;background:rgba(39,174,96,.25)}.auto-card.on b{color:#4ADE80}
  .money-pop{position:absolute;left:0;bottom:100%;color:#4ADE80;font-size:18px;line-height:1;-webkit-text-stroke:1px #fff;paint-order:stroke fill;text-shadow:0 0 4px rgba(0,0,0,.35);animation:mpop 1.3s ease-out forwards;pointer-events:none;white-space:nowrap}
  @keyframes mpop{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-28px)}}`;
  document.head.appendChild(css);

  /* ---------- logos ---------- */
  const lg = document.querySelector(".logo-placeholder");
  if (lg) lg.innerHTML = `<img src="${LOGO}" style="width:calc(72*var(--u));height:calc(72*var(--u));object-fit:contain;display:block">`;
  const li = document.querySelector(".leave-icon");
  if (li) li.innerHTML = `<img src="${TITLE_LOGO}" style="width:40px;height:40px;object-fit:contain;display:block">`;
  const ic = document.createElement("link"); ic.rel = "icon"; ic.href = TITLE_LOGO; document.head.appendChild(ic);

  /* ---------- popups sans pause ---------- */
  const open = id => { const e = $(id); return !!e && getComputedStyle(e).display !== "none"; };
  const SCR = ["inventory-screen", "shop-screen", "index-screen", "trade-screen"];
  function showOnly(id) { SCR.forEach(i => { const e = $(i); if (e) e.style.display = i === id ? "flex" : "none"; }); if (id !== "inventory-screen") exitSel(); }
  window.toggleInventory = s => { if (s) { updateAdventureHUD(); showOnly("inventory-screen"); } else { $("inventory-screen").style.display = "none"; exitSel(); } };
  window.toggleShop = s => { if (s) { renderShopGrid(); showOnly("shop-screen"); } else $("shop-screen").style.display = "none"; };
  window.toggleIndex = s => { if (s) { renderIndexGrid(); showOnly("index-screen"); } else $("index-screen").style.display = "none"; };

  /* ---------- barre bas de l'inventaire ---------- */
  const acc = () => accounts[currentAccountName];
  const bar = document.createElement("div"); bar.id = "inv-bar"; bar.className = "nun";
  bar.innerHTML = `<button id="auto-btn" class="bar-btn bar-green">Autosell</button>
    <div id="bar-right"><button id="sel-btn" class="bar-btn bar-blue">Select apples to sell</button><button id="selall-btn" class="bar-btn bar-yellow">Select all</button>
    <div id="split"><button id="bar-sell" class="bar-half bar-green">Sell</button><button id="bar-cancel" class="bar-half bar-red">Cancel</button></div></div>`;
  $("inventory-screen").appendChild(bar);

  let selMode = false; const selSet = new Set();
  function enterSel() { selMode = true; selSet.clear(); $("bar-right").classList.add("sel"); decorate(); }
  function exitSel() { selMode = false; selSet.clear(); $("bar-right").classList.remove("sel"); decorate(); }
  function decorate() {
    const a = acc(), apples = typeof currentInventoryTab !== "undefined" && currentInventoryTab === "apples";
    bar.style.display = apples ? "flex" : "none";
    $("inventory-grid").classList.toggle("selmode", selMode && apples);
    if (a) [...selSet].forEach(t => { if (!(a[APPLE_FIELDS[t]] > 0)) selSet.delete(t); });
    if (apples) document.querySelectorAll("#inventory-grid .inv-item-card").forEach(c => {
      const b = c.querySelector(".sell-btn"), m = b && /openSellModal\('(\w+)'\)/.exec(b.getAttribute("onclick") || "");
      if (!m) return; const t = m[1];
      if (selMode) c.onclick = () => { selSet.has(t) ? selSet.delete(t) : selSet.add(t); decorate(); };
      c.classList.toggle("sel", selMode && selSet.has(t));
    });
    $("bar-sell").disabled = !selSet.size;
  }
  $("sel-btn").onclick = enterSel;
  $("bar-cancel").onclick = exitSel;
  $("selall-btn").onclick = () => { const a = acc(); APPLE_ORDER.forEach(t => { if (a[APPLE_FIELDS[t]] > 0) selSet.add(t); }); decorate(); };
  $("bar-sell").onclick = () => {
    const a = acc(); if (!a || !selSet.size) return;
    let gain = 0; selSet.forEach(t => { const f = APPLE_FIELDS[t]; gain += (a[f] || 0) * PRICE[t]; a[f] = 0; });
    a.money += gain; exitSel(); saveAllAccounts();
  };

  /* ---------- Autosell ---------- */
  const am = document.createElement("div"); am.id = "autosell-modal"; am.className = "nun";
  am.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:2100;display:none;align-items:center;justify-content:center;backdrop-filter:blur(3px)";
  am.innerHTML = `<div style="background:#2f3640;border:3px solid #27ae60;border-radius:20px;padding:24px;width:min(760px,92vw);max-height:80vh;overflow:auto;color:#fff">
    <div style="font-size:22px;font-weight:400;margin-bottom:6px">Autosell</div>
    <div style="color:#dcdde1;margin-bottom:16px">Apples selected are sold automatically when collected</div>
    <div id="auto-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px"></div>
    <div style="text-align:right;margin-top:16px"><button id="auto-close" class="bar-btn bar-red">Close</button></div></div>`;
  document.body.appendChild(am);
  function renderAuto() {
    const g = $("auto-grid"), a = acc(); g.innerHTML = ""; if (!a) return;
    APPLE_ORDER.forEach(t => {
      const on = !!(a.autosell && a.autosell[t]), c = document.createElement("div");
      c.className = "auto-card" + (on ? " on" : "");
      c.innerHTML = `<img src="${IMG_FRUITS[t]}"><div>${APPLE_NAMES[t]}</div><b>${on ? "ON" : "OFF"}</b>`;
      c.onclick = () => { const b = acc(); b.autosell = { ...(b.autosell || {}), [t]: !on }; saveAllAccounts(); renderAuto(); };
      g.appendChild(c);
    });
  }
  const closeAuto = () => { am.style.display = "none"; };
  $("auto-btn").onclick = () => { renderAuto(); am.style.display = "flex"; };
  $("auto-close").onclick = closeAuto;

  let lastC = null, lastMoney = null;
  const counts = a => { const c = {}; APPLE_ORDER.forEach(t => c[t] = a[APPLE_FIELDS[t]] || 0); return c; };
  function autoTick() { // vend uniquement ce qui vient d'être collecté
    const a = acc(); if (!a) return;
    const cur = counts(a);
    if (lastC) APPLE_ORDER.forEach(t => {
      const d = cur[t] - lastC[t];
      if (d > 0 && a.autosell && a.autosell[t]) { a[APPLE_FIELDS[t]] -= d; a.money += d * PRICE[t]; cur[t] -= d; }
    });
    lastC = cur;
  }
  window.autosellReset = () => { lastC = null; lastMoney = null; };
  const _sv = window.saveAllAccounts;
  window.saveAllAccounts = function () { autoTick(); return _sv.apply(this, arguments); };

  /* ---------- +$ au-dessus de l'argent ---------- */
  function moneyGain() {
    const a = acc(); if (!a) return;
    if (lastMoney !== null && a.money > lastMoney) {
      const d = document.createElement("div"); d.className = "money-pop"; d.textContent = "+$" + fmtNum(a.money - lastMoney);
      $("money-hud").appendChild(d); setTimeout(() => d.remove(), 1400);
    }
    lastMoney = a.money;
  }
  const _uah = window.updateAdventureHUD;
  window.updateAdventureHUD = function () {
    const g = $("inventory-grid"), st = g.scrollTop;
    const r = _uah.apply(this, arguments);
    g.scrollTop = st; decorate(); moneyGain();
    if (!lastC && acc()) lastC = counts(acc());
    return r;
  };

  /* ---------- Échap / clic en dehors ---------- */
  function closeTop() {
    if (open("custom-confirm-modal")) { $("custom-confirm-no-btn").click(); return true; }
    if (open("add-modal")) { $("add-cancel").click(); return true; }
    if (open("sell-modal")) { closeSellModal(); return true; }
    if (open("autosell-modal")) { closeAuto(); return true; }
    const pf = $("profile-page");
    if (pf && pf.style.display === "flex" && $("pf-close").style.display === "block") { $("pf-close").click(); return true; }
    if (open("trading-screen")) { $("trading-close").click(); return true; }
    if (open("trade-screen")) { $("tr-close").click(); return true; }
    if (open("inventory-screen")) { toggleInventory(false); return true; }
    if (open("shop-screen")) { toggleShop(false); return true; }
    if (open("index-screen")) { toggleIndex(false); return true; }
    return false;
  }
  document.addEventListener("keydown", e => { if (e.key === "Escape" && closeTop()) e.preventDefault(); });
  document.addEventListener("mousedown", e => {
    const t = e.target;
    if (t.id === "custom-confirm-modal") return $("custom-confirm-no-btn").click();
    if (t.id === "sell-modal") return closeSellModal();
    if (t.id === "autosell-modal") return closeAuto();
    if (t.id === "add-modal") return $("add-cancel").click();
    if (open("custom-confirm-modal") || open("sell-modal") || open("autosell-modal") || open("add-modal")) return;
    if (t.closest("#side-buttons,#account-settings-btn")) return;
    const s = SCR.find(open);
    if (s && !$(s).contains(t)) closeTop();
  });
  /* ---------- icône Trade en #677f85 (filtre SVG) ---------- */
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "0"); svg.setAttribute("height", "0"); svg.style.position = "absolute";
  svg.innerHTML = '<filter id="fc-tint" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 0.404  0 0 0 0 0.498  0 0 0 0 0.522  0 0 0 1 0"/></filter>';
  document.body.appendChild(svg);

  /* ---------- logo Discord ---------- */
  const di = document.querySelector(".discord-btn-left img");
  if (di) { di.src = "https://www.pngkey.com/png/full/20-200938_white-discord-logo-png-png-free-discord-logo.png"; di.style.borderRadius = "0"; di.style.objectFit = "contain"; }

  /* ---------- vente : -1 -3 -5 -10 None | nombre | +1 +3 +5 +10 All ---------- */
  const sb = document.querySelector("#sell-modal .sell-box"), qIn = $("sell-quantity");
  qIn.style.display = "none";
  const hint = sb.querySelector(".sell-hint"); if (hint) hint.style.display = "none";
  const qui = document.createElement("div");
  qui.style.cssText = "display:grid;grid-template-columns:1fr 1.2fr 1fr;gap:12px;align-items:center;margin:14px 0";
  const col = (vals, cls, last) => `<div class="qty-col">${vals.map(v => `<button class="qty-btn ${cls}" data-d="${v}">${v}</button>`).join("")}<button class="qty-btn ${cls}" data-d="${last.toLowerCase()}">${last}</button></div>`;
  qui.innerHTML = col(["-1", "-3", "-5", "-10"], "qty-neg", "None") + '<div id="qty-num" style="font-size:26px;text-align:center;color:#fff">0</div>' + col(["+1", "+3", "+5", "+10"], "qty-pos", "All");
  sb.insertBefore(qui, sb.querySelector(".sell-actions"));
  let qty = 0;
  const stock = () => { const a = acc(); return a && activeSellType ? (a[APPLE_FIELDS[activeSellType]] || 0) : 0; };
  const setQty = n => { qty = Math.max(0, Math.min(stock(), n)); $("qty-num").textContent = qty; qIn.value = String(qty); };
  qui.addEventListener("click", e => {
    const b = e.target.closest("[data-d]"); if (!b) return; const d = b.dataset.d;
    setQty(d === "none" ? 0 : d === "all" ? stock() : qty + parseInt(d));
  });
  const _os = window.openSellModal;
  window.openSellModal = function () { _os.apply(this, arguments); setQty(0); };

  /* ---------- titres sans émoji ---------- */
  const ti = document.querySelector("#index-screen .inv-title-text"); if (ti) ti.textContent = "INDEX";
  const ts = document.querySelector("#shop-screen .inv-title-text"); if (ts) ts.textContent = "SHOP";

  decorate();
})();
