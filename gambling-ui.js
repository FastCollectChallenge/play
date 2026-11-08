// gambling-ui.js : Gambling (pile ou face, slots, roue). Même style que l'inventaire. Le SERVEUR tire le résultat (POST /gamble).
(function () {
  const $ = id => document.getElementById(id);
  const fr = () => document.documentElement.classList.contains("fr");
  const L = {
    title: ["GAMBLING", "CASINO"], coin: ["Coin flip", "Pile ou face"], slots: ["Slots", "Machine à sous"], wheel: ["Wheel", "Roue"],
    bet: ["Bet", "Mise"], play: ["Play", "Jouer"], spin: ["Spin", "Tourner"], heads: ["Heads", "Face"], tails: ["Tails", "Pile"],
    win: ["You won", "Tu as gagné"], lose: ["You lost", "Tu as perdu"], back: ["Bet refunded", "Mise remboursée"], close: ["Close", "Fermer"],
    nomoney: ["Not enough money", "Pas assez d'argent"], fee: ["Fee (5%)", "Frais (5 %)"], nofee: ["Not enough money for the fee", "Pas assez d'argent pour les frais"], badbet: ["Invalid bet", "Mise invalide"],
    coinInfo: ["Pick a side: x2 or nothing", "Choisis un côté : x2 ou rien"],
    slotsInfo: ["3 identical apples win. A barrier on any reel = lost", "3 pommes identiques gagnent. Une barrière sur un rouleau = perdu"],
    wheelInfo: ["Give something, pick what you want: the chance depends on the values", "Donne quelque chose, choisis ce que tu veux : la chance dépend des valeurs"],
    apples: ["Apples", "Pommes"], cash: ["Money", "Argent"], give: ["You give", "Tu donnes"], want: ["You want", "Tu veux"],
    chance: ["chance", "de chance"], amount: ["Amount", "Montant"], pick: ["Pick an apple", "Choisis une pomme"],
    needMore: ["You must want something worth more than what you give", "Tu dois demander plus que ce que tu donnes"],
    noApple: ["You don't have this apple", "Tu n'as pas cette pomme"], got: ["You got", "Tu as obtenu"], nothing: ["You lost your offer", "Tu as perdu ton offre"]
  };
  const t = k => L[k][fr() ? 1 : 0];
  const num = n => (typeof fmtNum === "function" ? fmtNum(n) : String(n));
  const acc = () => accounts[currentAccountName];
  const price = k => (window.FC && window.FC.priceOf ? window.FC.priceOf(k) : 0);
  const aname = k => (window.T ? window.T(APPLE_NAMES[k] || k) : APPLE_NAMES[k] || k);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  const toast = m => showAdvancedMsg(m, "top", { color: "white" });

  const SLOT = { red: 1, green: 3, golden: 5, diamond: 7, candy: 10, lava: 25, galaxy: 50, dark: 100 };
  const BY_MULT = Object.fromEntries(Object.entries(SLOT).map(([k, m]) => [m, k]));
  const FEE = 0.05, fee = v => Math.ceil(v * FEE); // frais de 5 % de la valeur misée, payés en argent (même règle côté serveur)
  const BARRIER = "icons/barrier.png", HEADS = "icons/heads.png", TAILS = "icons/tails.png";
  const wheelApples = () => APPLE_ORDER.filter(k => APPLE_FIELDS[k] && IMG_FRUITS[k] && price(k) > 0);
  const WHEEL_BLOCKED = new Set(["salhini", "skull", "poisoned", "frostfire", "elixir", "corrupted", "ghost", "pumpkini", "sun"]); // pomme admin + pommes witch fuse : interdites dans la roue
  const wheelPool = () => wheelApples().filter(k => !WHEEL_BLOCKED.has(k));
  const chanceOf = (give, want) => (give > 0 && want > give ? Math.max(1, Math.min(99, Math.round(give / want * 100))) : 0); // même formule côté serveur

  /* ---------- styles ---------- */
  const css = document.createElement("style");
  css.textContent = `
  #gamble-screen{position:fixed;top:0!important;bottom:0!important;left:0!important;right:0!important;margin:auto!important;width:min(90vw,1100px)!important;height:min(90vh,780px)!important;max-width:1100px!important;max-height:780px!important;z-index:1000;display:none;flex-direction:column;padding:clamp(16px,3vh,30px);box-sizing:border-box;color:#fff;
    background:rgba(10,13,20,.80);border:1px solid rgba(255,255,255,.10);border-radius:24px;backdrop-filter:blur(24px) saturate(140%);box-shadow:0 30px 80px rgba(0,0,0,.6);animation:popin .22s ease-out}
  #gamble-screen .tabs-container{width:100%}
  #gamble-screen .tab-btn{flex:1;font-size:14px;padding:12px 0}
  #g-panel{flex:1;min-height:0;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:space-between;gap:clamp(8px,1.6vh,16px);padding:clamp(12px,2.4vh,24px);box-sizing:border-box;overflow:auto;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.2) transparent;
    background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.10);border-radius:20px}
  #g-info{color:#8b95a8;font-size:13px;font-weight:500;text-align:center}
  #g-stage{flex:1;width:100%;display:flex;align-items:center;justify-content:center;min-height:0}
  #g-result{min-height:28px;font-size:20px;font-weight:700;text-align:center}
  .g-bar{display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap}
  .g-bar input{width:190px;padding:10px;border-radius:12px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#e8ecf4;font-size:15px;text-align:center;font-family:inherit;outline:none;transition:border-color .2s,box-shadow .2s}
  .g-bar input:focus{border-color:#7c5cff;box-shadow:0 0 0 3px rgba(124,92,255,.25)}
  .g-mini{border:1px solid rgba(255,255,255,.10);border-radius:999px;padding:8px 16px;color:#8b95a8;background:rgba(255,255,255,.06);cursor:pointer;font-size:12px;font-weight:600;transition:background .2s,color .2s}
  .g-mini:hover{background:rgba(255,255,255,.10);color:#e8ecf4}.g-mini.on{background:#7c5cff;color:#fff;border-color:transparent;box-shadow:0 6px 20px rgba(124,92,255,.4)}
  .g-play{border:0;border-radius:999px;padding:13px 56px;font-size:16px;font-weight:700;color:#fff;background:linear-gradient(135deg,#7c5cff,#22d3ee);cursor:pointer;box-shadow:0 8px 24px rgba(124,92,255,.35);transition:transform .2s,box-shadow .2s}
  .g-play:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 12px 30px rgba(124,92,255,.5)}
  .g-play:disabled{opacity:.4;cursor:not-allowed}
  .g-coinwrap{perspective:900px}
  .g-coin{width:clamp(110px,22vh,190px)!important;height:clamp(110px,22vh,190px)!important;position:relative;transform-style:preserve-3d;transition:transform 1.5s cubic-bezier(.2,.7,.2,1)}
  .g-coin img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;backface-visibility:hidden}
  .g-coin img.b{transform:rotateY(180deg)}
  .g-side{display:flex;gap:10px;margin-top:clamp(8px,1.6vh,14px);justify-content:center}
  .g-reels{display:flex;gap:clamp(10px,2vh,18px)}
  .g-reel{width:clamp(90px,17vh,150px)!important;height:clamp(90px,17vh,150px)!important;border-radius:22px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);display:flex;align-items:center;justify-content:center;box-shadow:inset 0 0 30px rgba(0,0,0,.4)}
  .g-reel img{width:64%;height:64%;object-fit:contain}
  .g-pay{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;width:100%}
  .g-pay div{display:flex;align-items:center;gap:8px;padding:5px 12px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);font-size:13px;font-weight:600;color:#a5b4fc}
  .g-pay img{width:26px;height:26px;object-fit:contain}
  .g-wrow{display:flex;width:100%;gap:20px;align-items:stretch;justify-content:space-between;min-height:0;height:100%}
  .g-wcol{flex:1;min-width:0;display:flex;flex-direction:column;gap:10px;padding:16px;border-radius:18px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.10)}
  .g-wcol h4{margin:0;font-size:14px;font-weight:700;text-align:center;color:#a5b4fc}
  .g-agrid{flex:1;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:8px;align-content:start}
  .g-acard{display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 4px;border-radius:14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);cursor:pointer;font-size:11px;font-weight:600;text-align:center;transition:background .2s,border-color .2s}
  .g-acard:hover{background:rgba(255,255,255,.10)}
  .g-acard img{width:44px;height:44px;object-fit:contain}.g-acard.on{border-color:#7c5cff;background:rgba(124,92,255,.22)}.g-acard.dis{opacity:.35}
  .g-wmid{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;width:300px;flex:none}
  .g-wheelwrap{position:relative;width:240px;height:240px}
  .g-wheel{width:100%;height:100%;border-radius:50%;border:4px solid rgba(255,255,255,.85);transition:transform 3.4s cubic-bezier(.12,.7,.1,1);box-shadow:0 10px 40px rgba(0,0,0,.5)}
  .g-ptr{position:absolute;left:50%;top:-16px;transform:translateX(-50%);border-left:13px solid transparent;border-right:13px solid transparent;border-top:26px solid #fff;z-index:2}
  .g-stake{display:flex;flex-direction:column;align-items:center;gap:10px;width:100%}.g-pct{font-size:24px;font-weight:800}.g-hint{margin:auto;color:#8b95a8;text-align:center;font-size:13px}
  #g-stage{flex:1 0 auto}
  @media (max-height:720px){
    #gamble-screen{height:min(94vh,780px)!important;padding:14px!important}
    #gamble-screen .screen-header{margin-bottom:8px;padding-bottom:8px}
    #gamble-screen .tabs-container{margin-bottom:10px}
    #gamble-screen .tab-btn{padding:8px 0;font-size:13px}
    #g-panel{padding:12px;gap:8px}
    #g-info{display:none}
    #g-result{min-height:20px;font-size:16px}
    .g-coin{width:clamp(80px,24vh,160px)!important;height:clamp(80px,24vh,160px)!important}
    .g-reel{width:clamp(70px,20vh,120px)!important;height:clamp(70px,20vh,120px)!important}
    .g-reels{gap:10px}.g-pay{gap:6px}.g-pay div{padding:3px 8px;font-size:12px}.g-pay img{width:20px;height:20px}
    .g-stake{gap:8px}.g-mini{padding:6px 12px}.g-play{padding:10px 44px;font-size:15px}.g-bar input{padding:8px}
    .g-wheelwrap{width:170px;height:170px}.g-wmid{width:220px;gap:8px}.g-pct{font-size:20px}
  }
  @media (max-height:720px) and (min-width:800px){
    #g-panel.gcs{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr auto auto;align-items:center;justify-items:center;column-gap:24px}
    #g-panel.gcs #g-stage{grid-column:1;grid-row:1;flex:none}
    #g-panel.gcs .g-pay{grid-column:1;grid-row:2}
    #g-panel.gcs #g-result{grid-column:1;grid-row:3}
    #g-panel.gcs #g-stake{grid-column:2;grid-row:1 / span 3;align-self:center}
  }`;
  document.head.appendChild(css);

  /* ---------- structure (même en-tête que l'inventaire) ---------- */
  const scr = document.createElement("div"); scr.id = "gamble-screen"; scr.className = "nun";
  scr.innerHTML = `<div class="screen-header"><div class="money-badge">$ <span id="g-money">0</span></div><h2 class="inv-title-text" id="g-title"></h2><button class="close-screen-btn" id="g-close"></button></div>
    <div class="tabs-container" id="g-tabs"></div><div id="g-panel"></div>`;
  document.body.appendChild(scr);

  let game = "coin", side = "heads", busy = false, wheelRot = 0;
  let W = { kind: "apple", give: null, qty: 1, want: null, giveAmt: "", wantAmt: "" };
  const GAMES = ["coin", "slots", "wheel"];
  const money = () => { const a = acc(); $("g-money").textContent = num(a ? a.money : 0); };

  function head() {
    $("g-title").textContent = t("title"); $("g-close").textContent = t("close");
    $("g-tabs").innerHTML = "";
    GAMES.forEach(g => { const b = document.createElement("button"); b.className = "tab-btn" + (g === game ? " active" : ""); b.textContent = t(g); b.onclick = () => { if (!busy) { game = g; render(); } }; $("g-tabs").appendChild(b); });
    money();
  }
  /* ---------- mise (pile ou face / slots) : argent OU pommes ---------- */
  let B = { kind: "money", apple: null, qty: 1, bet: "1" };
  const stakeValue = () => (B.kind === "apple" ? (B.apple ? B.qty * price(B.apple) : 0) : Math.floor(Number(B.bet)) || 0);
  function stakeHTML() {
    const owned = wheelApples().filter(k => own(k) > 0);
    if (B.apple && !own(B.apple)) B.apple = null;
    if (B.apple) B.qty = Math.max(1, Math.min(own(B.apple), Math.floor(B.qty) || 1));
    const mode = `<div class="g-bar"><button class="g-mini ${B.kind === "money" ? "on" : ""}" data-sk="money">${t("cash")}</button><button class="g-mini ${B.kind === "apple" ? "on" : ""}" data-sk="apple">${t("apples")}</button></div>`;
    const body = B.kind === "money"
      ? `<div class="g-bar"><span>${t("bet")}</span><input id="g-bet" type="number" min="1" step="1" value="${B.bet}"><button class="g-mini" data-b="min">Min</button><button class="g-mini" data-b="half">½</button><button class="g-mini" data-b="x2">x2</button><button class="g-mini" data-b="max">Max</button></div>`
      : (!owned.length ? `<div class="g-hint">${wt("noOwn")}</div>`
        : `<div class="g-agrid" id="g-sa" style="flex:none;width:100%;max-height:clamp(70px,12vh,118px)">${owned.map(k => `<div class="g-acard ${B.apple === k ? "on" : ""}" data-k="${k}"><img src="${IMG_FRUITS[k]}"><div>${aname(k)}</div><b>x${own(k)}</b></div>`).join("")}</div>
           <div class="g-bar"><span>${wt("qty")}</span><button class="g-mini" data-q="-1">-1</button><input id="g-sqty" type="number" min="1" value="${B.qty}" style="width:90px"><button class="g-mini" data-q="1">+1</button><button class="g-mini" data-q="max">Max</button></div>`);
    return `${mode}${body}<div id="g-feetxt" style="font-size:14px;color:#8b95a8"></div><button class="g-play" id="g-play">${t("play")}</button>`;
  }
  function updateFee() { const el = $("g-feetxt"), v = stakeValue(); if (el) el.textContent = v > 0 ? `${t("fee")} : $${num(fee(v))}` : ""; }
  function stakeInit() {
    const c = $("g-stake"); if (!c) return; c.innerHTML = stakeHTML();
    c.querySelectorAll("[data-sk]").forEach(b => b.onclick = () => { if (!busy) { B.kind = b.dataset.sk; stakeInit(); } });
    const bi = $("g-bet"); if (bi) bi.oninput = () => { B.bet = bi.value; updateFee(); };
    c.querySelectorAll("[data-b]").forEach(b => b.onclick = () => {
      const a = acc(), m = a ? a.money : 0, cur = Number(B.bet) || 1, k = b.dataset.b;
      B.bet = String(Math.max(1, Math.floor(k === "min" ? 1 : k === "half" ? cur / 2 : k === "x2" ? cur * 2 : m / (1 + FEE)))); bi.value = B.bet; updateFee(); // Max = la plus grosse mise qui laisse payer les frais
    });
    c.querySelectorAll(".g-acard").forEach(el => el.onclick = () => { if (!busy) { B.apple = el.dataset.k; B.qty = 1; stakeInit(); } });
    const qi = $("g-sqty"); if (qi) qi.oninput = () => { B.qty = Math.max(1, Math.min(own(B.apple) || 1, Math.floor(Number(qi.value)) || 1)); updateFee(); };
    c.querySelectorAll("[data-q]").forEach(b => b.onclick = () => {
      if (busy || !B.apple) return; const d = b.dataset.q;
      B.qty = Math.max(1, Math.min(own(B.apple), d === "max" ? own(B.apple) : B.qty + parseInt(d))); qi.value = B.qty; updateFee();
    });
    $("g-play").onclick = playBet; updateFee();
  }

  function render() {
    head(); const p = $("g-panel"); p.classList.toggle("gcs", game !== "wheel");
    if (game === "coin") {
      p.innerHTML = `<div id="g-info">${t("coinInfo")}</div><div id="g-stage"><div><div class="g-coinwrap"><div class="g-coin" id="g-coinel"><img src="${HEADS}"><img class="b" src="${TAILS}"></div></div>
        <div class="g-side"><button class="g-mini ${side === "heads" ? "on" : ""}" data-s="heads">${t("heads")}</button><button class="g-mini ${side === "tails" ? "on" : ""}" data-s="tails">${t("tails")}</button></div></div></div>
        <div id="g-result"></div><div id="g-stake" class="g-stake"></div>`;
      p.querySelectorAll("[data-s]").forEach(b => b.onclick = () => { if (!busy) { side = b.dataset.s; render(); } });
      stakeInit();
    } else if (game === "slots") {
      p.innerHTML = `<div id="g-info">${t("slotsInfo")}</div><div id="g-stage"><div class="g-reels">${[0, 1, 2].map(i => `<div class="g-reel"><img id="g-r${i}" src="${IMG_FRUITS.red}"></div>`).join("")}</div></div>
        <div class="g-pay">${Object.entries(SLOT).map(([k, m]) => `<div><img src="${IMG_FRUITS[k]}">x${m}</div>`).join("")}</div><div id="g-result"></div><div id="g-stake" class="g-stake"></div>`;
      stakeInit();
    } else renderWheel();
  }

  /* ---------- pile ou face / slots ---------- */
  async function playBet() {
    if (busy) return; const a = acc(); if (!a) return;
    const v = stakeValue(), f = fee(v), choice = game === "coin" ? side : undefined; let body;
    if (B.kind === "money") {
      const bet = Math.floor(Number(B.bet));
      if (!(bet >= 1)) return toast(t("badbet"));
      if (bet + f > a.money) return toast(bet > a.money ? t("nomoney") : t("nofee"));
      body = { game, stake: "money", bet, choice };
    } else {
      if (!B.apple) return toast(wt("pickGive")); if (own(B.apple) < B.qty) return toast(t("noApple"));
      if (f > a.money) return toast(t("nofee"));
      body = { game, stake: "apple", apple: B.apple, qty: Math.floor(Number(B.qty)), choice };
    }
    const kind = B.kind, apple = B.apple, stake = kind === "money" ? body.bet : body.qty;
    lock(true);
    try {
      const r = await window.FC.act("/gamble", body), mult = Number(r && r.mult) || 0;
      if (game === "coin") await animCoin(r, mult > 0); else await animSlots(mult);
      showGain(stake, mult, kind, apple);
    } catch (e) { /* act() affiche déjà l'erreur */ }
    lock(false); stakeInit();
  }
  function showGain(stake, mult, kind, apple) {
    const gain = Math.floor(stake * mult) - stake, el = $("g-result"); if (!el) return;
    const fmt = n => (kind === "money" ? "$" + num(n) : num(n) + " " + aname(apple));
    if (gain > 0) { el.style.color = "#34d399"; el.textContent = `${t("win")} +${fmt(gain)} (x${mult})`; }
    else if (mult > 0) { el.style.color = "#fff"; el.textContent = `${t("back")} (x${mult})`; }
    else { el.style.color = "#f43f5e"; el.textContent = `${t("lose")} -${fmt(stake)}`; }
  }
  function lock(v) { busy = v; const b = $("g-play"); if (b) b.disabled = v; if (!v) money(); }
  async function animCoin(r, win) {
    const el = $("g-coinel"); if (!el) return;
    const shown = r.side || (win ? side : side === "heads" ? "tails" : "heads"), turns = 1800 + (shown === "tails" ? 180 : 0);
    el.style.transition = "none"; el.style.transform = "rotateY(0deg)"; void el.offsetWidth;
    el.style.transition = ""; el.style.transform = `rotateY(${turns}deg)`; await sleep(1600);
  }
  async function animSlots(mult) {
    const imgs = [0, 1, 2].map(i => $("g-r" + i)), keys = Object.keys(SLOT);
    const src = k => (k === "barrier" ? BARRIER : IMG_FRUITS[k]);
    let final;
    if (BY_MULT[mult]) final = [BY_MULT[mult], BY_MULT[mult], BY_MULT[mult]];
    else { // perdu : 1, 2 ou 3 barrières
      const nb = 1 + Math.floor(Math.random() * 3), idx = [0, 1, 2].sort(() => Math.random() - .5).slice(0, nb);
      final = [0, 1, 2].map(i => idx.includes(i) ? "barrier" : rnd(keys));
    }
    const timers = imgs.map(im => setInterval(() => { if (im) im.src = src(rnd(keys.concat("barrier"))); }, 70));
    for (let i = 0; i < 3; i++) { await sleep(700 + i * 450); clearInterval(timers[i]); if (imgs[i]) imgs[i].src = src(final[i]); }
  }

  /* ---------- roue ---------- */
  const WT = {
    pickGive: ["Pick what you give", "Choisis ce que tu donnes"], noOwn: ["You have no apples", "Tu n'as aucune pomme"], noWant: ["Nothing available at 1%+ chance", "Rien n'est disponible à 1 % de chance ou plus"],
    qty: ["Quantity", "Quantité"], maxWant: ["Max you can ask", "Maximum demandable"], amount: ["Amount", "Montant"]
  };
  const wt = k => WT[k][fr() ? 1 : 0];
  const chanceV = (g, w) => { if (!(g > 0 && w > g)) return 0; const p = Math.round(g / w * 100); return p >= 1 ? Math.min(99, p) : 0; }; // même formule côté serveur
  const own = k => (acc() || {})[APPLE_FIELDS[k]] || 0;
  const giveVal = () => (W.kind === "apple" ? (W.give ? W.qty * price(W.give) : 0) : Math.floor(Number(W.giveAmt)) || 0);
  function wheelState() {
    const g = giveVal(), w = W.kind === "apple" ? (W.want ? price(W.want) : 0) : Math.floor(Number(W.wantAmt)) || 0;
    return { g, w, pct: chanceV(g, w), a: acc() };
  }
  const wantList = () => { const g = giveVal(); return g > 0 ? wheelPool().filter(k => chanceV(g, price(k)) >= 1) : []; }; // seulement les pommes à 1 % ou plus
  function wantHTML() {
    if (W.kind === "money") { const g = giveVal(); return `<h4>${t("want")}</h4><div class="g-bar" style="margin:auto;flex-direction:column"><input data-m="want" type="number" min="1" step="1" placeholder="${wt("amount")}" value="${W.wantAmt}">${g ? `<small style="color:#8b95a8">${wt("maxWant")} : $${num(g * 200)}</small>` : ""}</div>`; }
    const list = wantList(); if (W.want && !list.includes(W.want)) W.want = null;
    return `<h4>${t("want")}</h4>` + (!giveVal() ? `<div class="g-hint">${wt("pickGive")}</div>` : !list.length ? `<div class="g-hint">${wt("noWant")}</div>`
      : `<div class="g-agrid" data-c="want">${list.map(k => `<div class="g-acard ${W.want === k ? "on" : ""}" data-k="${k}"><img src="${IMG_FRUITS[k]}"><div>${aname(k)}</div><b>${chanceV(giveVal(), price(k))}%</b></div>`).join("")}</div>`);
  }
  function bindWant() {
    const c = $("g-wantcol"); c.innerHTML = wantHTML();
    c.querySelectorAll(".g-acard").forEach(el => el.onclick = () => { if (!busy) { W.want = el.dataset.k; bindWant(); drawWheel(); } });
    const wi = c.querySelector("[data-m]"); if (wi) wi.oninput = () => { W.wantAmt = wi.value; drawWheel(); };
  }
  function renderWheel() {
    const p = $("g-panel"), owned = wheelPool().filter(k => own(k) > 0);
    if (W.give && (!own(W.give) || WHEEL_BLOCKED.has(W.give))) W.give = null;
    if (W.give) W.qty = Math.max(1, Math.min(own(W.give), Math.floor(W.qty) || 1));
    const giveHTML = W.kind === "apple"
      ? `<h4>${t("give")}</h4>` + (!owned.length ? `<div class="g-hint">${wt("noOwn")}</div>` :
        `<div class="g-agrid">${owned.map(k => `<div class="g-acard ${W.give === k ? "on" : ""}" data-k="${k}"><img src="${IMG_FRUITS[k]}"><div>${aname(k)}</div><b>x${own(k)}</b></div>`).join("")}</div>
         <div class="g-bar"><span>${wt("qty")}</span><button class="g-mini" data-q="-1">-1</button><input id="g-qty" type="number" min="1" value="${W.qty}" style="width:90px"><button class="g-mini" data-q="1">+1</button><button class="g-mini" data-q="max">Max</button></div>`)
      : `<h4>${t("give")}</h4><div class="g-bar" style="margin:auto"><input data-m="give" type="number" min="1" step="1" placeholder="${wt("amount")}" value="${W.giveAmt}"><button class="g-mini" data-q="max">Max</button></div>`;
    p.innerHTML = `<div id="g-info">${t("wheelInfo")}</div>
      <div class="g-bar"><button class="g-mini ${W.kind === "apple" ? "on" : ""}" data-kind="apple">${t("apples")}</button><button class="g-mini ${W.kind === "money" ? "on" : ""}" data-kind="money">${t("cash")}</button></div>
      <div class="g-wrow"><div class="g-wcol" id="g-givecol">${giveHTML}</div><div class="g-wmid"><div class="g-wheelwrap"><div class="g-ptr"></div><div class="g-wheel" id="g-wheelel"></div></div>
        <div class="g-pct" id="g-pct"></div><div id="g-fee" style="font-size:14px;color:#8b95a8"></div><div id="g-result"></div><button class="g-play" id="g-play">${t("spin")}</button></div><div class="g-wcol" id="g-wantcol"></div></div>`;
    p.querySelectorAll("[data-kind]").forEach(b => b.onclick = () => { if (!busy) { W.kind = b.dataset.kind; W.want = null; renderWheel(); } });
    const gc = $("g-givecol");
    gc.querySelectorAll(".g-acard").forEach(c => c.onclick = () => { if (!busy) { W.give = c.dataset.k; W.qty = 1; renderWheel(); } });
    const upd = () => { bindWant(); drawWheel(); };
    const qi = $("g-qty"), mi = gc.querySelector("[data-m]");
    if (qi) qi.oninput = () => { W.qty = Math.max(1, Math.min(own(W.give) || 1, Math.floor(Number(qi.value)) || 1)); upd(); };
    if (mi) mi.oninput = () => { W.giveAmt = mi.value; upd(); };
    gc.querySelectorAll("[data-q]").forEach(b => b.onclick = () => {
      if (busy) return; const d = b.dataset.q;
      if (W.kind === "money") { W.giveAmt = String(Math.floor(((acc() || {}).money || 0) / (1 + FEE))); mi.value = W.giveAmt; return upd(); }
      if (!W.give) return; W.qty = Math.max(1, Math.min(own(W.give), d === "max" ? own(W.give) : W.qty + parseInt(d))); qi.value = W.qty; upd();
    });
    $("g-play").onclick = playWheel; bindWant(); drawWheel();
  }
  function drawWheel() {
    const { pct } = wheelState(), w = $("g-wheelel"); if (!w) return;
    w.style.background = pct ? `conic-gradient(#34d399 0deg ${pct * 3.6}deg,#f43f5e ${pct * 3.6}deg 360deg)` : "conic-gradient(#f43f5e 0deg 360deg)";
    $("g-pct").textContent = pct ? `${pct}% ${t("chance")}` : "";
    const g = giveVal(); $("g-fee").textContent = g > 0 ? `${t("fee")} : $${num(fee(g))}` : "";
  }
  async function playWheel() {
    if (busy) return; const { g, w, pct, a } = wheelState();
    if (W.kind === "apple") { if (!W.give) return toast(wt("pickGive")); if (!W.want) return toast(t("pick")); if (own(W.give) < W.qty) return toast(t("noApple")); if (fee(g) > a.money) return toast(t("nofee")); }
    else { if (g < 1) return toast(t("badbet")); if (g + fee(g) > a.money) return toast(g > a.money ? t("nomoney") : t("nofee")); }
    if (!pct) return toast(t("needMore"));
    lock(true); let txt = "", col = "";
    try {
      const body = W.kind === "apple" ? { game: "wheel", kind: "apple", give: W.give, qty: W.qty, want: W.want, pct } : { game: "wheel", kind: "money", give: g, want: w, pct };
      const r = await window.FC.act("/gamble", body), win = !!(r && r.win), el = $("g-wheelel"), wd = pct * 3.6;
      const ang = win ? 3 + Math.random() * Math.max(0.1, wd - 6) : wd + 3 + Math.random() * Math.max(0.1, 360 - wd - 6);
      wheelRot = Math.ceil(wheelRot / 360) * 360 + 360 * 6 + (360 - ang); el.style.transform = `rotate(${wheelRot}deg)`; await sleep(3500);
      if (win) { col = "#34d399"; txt = `${t("got")} ${W.kind === "apple" ? aname(W.want) : "$" + num(w)}`; } else { col = "#f43f5e"; txt = t("nothing"); }
    } catch (e) { /* erreur déjà affichée */ }
    lock(false); renderWheel(); const rs = $("g-result"); if (rs) { rs.textContent = txt; rs.style.color = col; } // met à jour les quantités
  }

  /* ---------- ouverture / fermeture ---------- */
  const OTHERS = ["inventory-screen", "shop-screen", "index-screen", "trade-screen"];
  const isOpen = () => scr.style.display === "flex";
  window.toggleGamble = s => {
    if (s) { OTHERS.forEach(i => { const e = $(i); if (e) e.style.display = "none"; }); render(); scr.style.display = "flex"; }
    else if (!busy) scr.style.display = "none";
  };
  $("g-close").onclick = () => window.toggleGamble(false);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && isOpen() && !busy) { window.toggleGamble(false); e.stopPropagation(); } }, true);
  document.addEventListener("mousedown", e => { if (isOpen() && !busy && !scr.contains(e.target) && !e.target.closest("#side-buttons")) window.toggleGamble(false); });
  window.addEventListener("langchange", () => { if (isOpen() && !busy) render(); });
  const _uah = window.updateAdventureHUD;
  window.updateAdventureHUD = function () { const r = _uah.apply(this, arguments); if (isOpen()) money(); return r; };

  /* ---------- bouton dans la barre latérale (sous Trade) ---------- */
  const sideBar = $("side-buttons");
  if (sideBar) {
    const st = document.createElement("style");
    st.textContent = `#gamble-btn{position:absolute!important;top:84px;left:84px;background:rgb(255,255,255)}
    #gamble-btn .side-btn-label{color:#677f85;font-size:10px!important}.fr #gamble-btn .side-btn-label{font-size:8px!important}
    #gamble-btn img{filter:url(#fc-tint)!important;opacity:1}`;
    document.head.appendChild(st);
    const b = document.createElement("button"); b.id = "gamble-btn"; b.className = "side-btn"; b.onclick = () => window.toggleGamble(true);
    b.innerHTML = '<img src="icons/Gamble Dark Mode.png" alt="Gamble" onerror="this.style.display=\'none\';this.parentNode.classList.add(\'no-img\')"><span class="side-btn-label">Gamble</span>'; sideBar.appendChild(b);
    new MutationObserver(() => { if (sideBar.style.display === "none") scr.style.display = "none"; }).observe(sideBar, { attributes: true, attributeFilter: ["style"] });
    const setLbl = () => { b.querySelector(".side-btn-label").textContent = fr() ? "Casino" : "Gamble"; };
    window.addEventListener("langchange", setLbl); setLbl();
  }
})();