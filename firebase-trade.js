// firebase-trade.js : connexion (Firebase Auth uniquement) + API Cloudflare (économie, échanges)
// Le serveur est maître de tout : ce fichier n'envoie que des intentions (ramassé, vendre, acheter...) et affiche ce que le serveur renvoie.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, onIdTokenChanged, signOut, signInAnonymously, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, GithubAuthProvider, linkWithCredential, signInWithCredential } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const API = window.__FC_API || "https://fast-collect-challenge-api.fastcollect.workers.dev";
const app = initializeApp({
  apiKey: "AIzaSyDVkJX-VibTIhMp_WoTqQ6LzNOy7G5OwmY",
  authDomain: "fast-collect-challenge.firebaseapp.com",
  projectId: "fast-collect-challenge",
  storageBucket: "fast-collect-challenge.firebasestorage.app",
  messagingSenderId: "357477145806",
  appId: "1:357477145806:web:61e4d434124a461343849f"
});
const auth = getAuth(app);
const $ = id => document.getElementById(id);
const FAKE = "@fastcollect.app";
const LOGO = "https://raw.githubusercontent.com/FastCollectChallenge/play/main/Fast%20Collect%20Challenge%20Ingame%20logo.png";
const clean = s => (s || "").trim().toLowerCase();
const okName = s => /^[a-z0-9_]{3,16}$/.test(s);
const T = s => (window.T ? window.T(s) : s);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const toast = m => showAdvancedMsg(T(m), "top", { color: "white" });
const toastG = m => showAdvancedMsg(T(m), "top", { color: "#2ecc71" });
const errMsg = e => { const m = String((e && e.message) || e); return /failed to fetch|networkerror|load failed/i.test(m) ? "Network error" : m.charAt(0).toUpperCase() + m.slice(1); };
// APPLE_FIELDS, APPLE_NAMES, APPLE_ORDER, IMG_FRUITS, NEW_APPLES, SHOP_PRODUCTS... viennent d'index.html (portée globale)
const BASE_PRICE = { red: 1, green: 3, golden: 7, diamond: 15, candy: 50, lava: 200, galaxy: 500, dark: 1000, moony: 50000, bloodmoon: 6666666, salhini: 100000000 };
const priceOf = t => (NEW_APPLES[t] ? NEW_APPLES[t].price : BASE_PRICE[t]) || 0;

let me = null, username = "", myPhoto = "", pendingName = null, manualLogout = false;
const srv = { offset: 0 }; // décalage horloge serveur - horloge locale
const srvNow = () => Date.now() + srv.offset;
const acc = () => accounts[currentAccountName];

// si <script src="i18n.js"> manque dans index.html, on le charge ici (boutons EN/FR + traduction)
if (!window.makeLangSwitch) await new Promise(r => { const sc = document.createElement("script"); sc.src = "i18n.js"; sc.onload = sc.onerror = r; document.head.appendChild(sc); });

/* ---------- API ---------- */
let cachedToken = "";
onIdTokenChanged(auth, async u => { cachedToken = u ? await u.getIdToken() : ""; });
async function api(path, method = "GET", body, opts = {}) {
  const u = auth.currentUser; if (!u) throw new Error("not signed in");
  const token = await u.getIdToken();
  const r = await fetch(API + path, { method, keepalive: !!opts.keepalive,
    headers: { Authorization: "Bearer " + token, ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let j = {}; try { j = await r.json(); } catch (e) {}
  if (!r.ok) { if (j.error === "banned") showBan(j.banned_until, j.now); const e = new Error(j.error || "HTTP " + r.status); e.status = r.status; throw e; }
  return j;
}

/* ---------- données de jeu (copie locale = ce que le serveur a renvoyé) ---------- */
const fresh = () => { const d = { money: 0, potions: {}, discovered: {}, autosell: {}, fuse: [] }; Object.values(APPLE_FIELDS).forEach(f => d[f] = 0); return d; };
const normalize = d => { d = d || {}; return { ...fresh(), ...d, potions: { ...(d.potions || {}) }, discovered: { ...(d.discovered || {}) }, autosell: { ...(d.autosell || {}) }, fuse: Array.isArray(d.fuse) ? d.fuse.slice() : [] }; };
function credit(a, t) { // même règle que le serveur (affichage immédiat, le serveur confirmera)
  a.discovered[t] = true;
  if (a.autosell && a.autosell[t]) a.money += priceOf(t); else a[APPLE_FIELDS[t]] = (a[APPLE_FIELDS[t]] || 0) + 1;
}

/* ---------- Adventure : apparitions fournies par le serveur ---------- */
const adv = { on: false, run: 0, seq: -1, start: 0, lead: 0, spawns: [], bits: [], handled: [], unsent: [], rolling: false, syncing: false, timer: null, lastTry: 0, fails: 0, warned: false };
const entryTime = j => adv.start + Math.max(0, j - adv.lead) * 1000;
const sizeOf = t => (t === "red" || t === "green") ? 25 : t === "bloodmoon" ? 36 : 32;
const maskStr = () => adv.bits.map(b => b ? "1" : "0").join("");

// toutes les réponses qui renvoient l'inventaire passent par une file : la plus récente gagne toujours
let qTail = Promise.resolve(), qN = 0;
function applyData(d) {
  if (!d || !me) return;
  const a = accounts[currentAccountName] = normalize(d);
  adv.unsent.forEach(t => credit(a, t)); // pommes ramassées pas encore confirmées par le serveur
  updateAdventureHUD();
  snap();
}
function serial(fn, refreshOnError) {
  qN++;
  const job = qTail.then(async () => {
    let r;
    try { r = await fn(); }
    catch (e) { qN--; if (refreshOnError && !qN) refreshMe().catch(() => {}); throw e; }
    qN--; if (!qN && r && r.data) applyData(r.data);
    return r;
  });
  qTail = job.catch(() => {});
  return job;
}
const refreshMe = () => serial(async () => { const v = await api("/me"); srv.offset = v.now - Date.now(); return v; });
function act(path, body, optimistic) { // action d'économie : affichage immédiat, le serveur tranche
  if (optimistic) { try { optimistic(); } catch (e) { console.error(e); } updateAdventureHUD(); }
  snap();
  const p = serial(async () => { await advFlushRaw(); return api(path, "POST", body); }, true);
  p.catch(e => toast(errMsg(e)));
  return p;
}

function announce(t) {
  if (t === "bloodmoon") showAdvancedMsg("A Bloodmoon apple spawned in your server!", "bottom", { color: "#8b0000" });
  else if (t === "salhini") showAdvancedMsg("A Salhini Appelini spawned in your server!", "bottom", { color: "#F5D7C3" });
  else if (t === "moony") showAdvancedMsg("A Moony Apple spawned in your server!", "bottom", { stops: ["#BFC1C2", "#F8F8F8", "#9EA0A2", "#ECECEC"] });
  else if (NEW_APPLES[t]) newAppleMsg(t);
}
function spawnEntry(j, live) {
  const type = adv.spawns[j], size = sizeOf(type), m = size === 25 ? 60 : 35;
  apples.push({ x: Math.random() * (canvas.width - m), y: Math.random() * (canvas.height - m), size, type, idx: j, advSeq: adv.seq });
  recordSpawn(type); if (live) announce(type);
}
function advTick() {
  if (!adv.on || !gameActive || currentGameMode !== "adventure") return;
  const now = srvNow();
  for (let j = 0; j < adv.spawns.length; j++) {
    if (adv.handled[j]) continue;
    if (entryTime(j) > now) { if (j >= adv.lead) break; continue; }
    adv.handled[j] = true;
    if (adv.bits[j]) continue; // déjà ramassée (rechargement de page)
    spawnEntry(j, now - entryTime(j) < 2500);
  }
  // toutes les pommes du paquet sont apparues -> paquet suivant (les pommes restantes sont reportées par le serveur)
  const lastAt = adv.start + (adv.spawns.length - 1 - adv.lead) * 1000 + 300;
  if (adv.spawns.length && !adv.syncing && now >= lastAt && Date.now() - adv.lastTry > Math.min(10000, 1500 * (adv.fails + 1))) {
    adv.syncing = true;
    advCall("/sync", {}, true).catch(() => {}).finally(() => { adv.syncing = false; });
  }
}
function applyPack(p) {
  srv.offset = p.now - Date.now();
  const len = p.spawns.length, claimed = String(p.claimed || "").padEnd(len, "0");
  if (p.seq !== adv.seq) {
    const prev = adv.seq;
    adv.seq = p.seq; adv.start = p.packStart; adv.lead = p.lead || 0; adv.spawns = p.spawns.slice();
    adv.bits = Array.from({ length: len }, (_, i) => claimed[i] === "1");
    adv.handled = new Array(len).fill(false);
    // les pommes encore à l'écran deviennent les pommes reportées du nouveau paquet
    const old = apples.filter(a => a.advSeq === prev && a.idx != null).sort((x, y) => x.idx - y.idx);
    old.forEach((a, k) => {
      if (prev >= 0 && k < adv.lead && !adv.bits[k]) { a.advSeq = adv.seq; a.idx = k; a.type = adv.spawns[k]; a.size = sizeOf(a.type); adv.handled[k] = true; }
      else { const i = apples.indexOf(a); if (i >= 0) apples.splice(i, 1); }
    });
  } else { // même paquet : les apparitions à venir ont pu changer (potion de chance)
    adv.spawns = p.spawns.slice();
    for (let i = 0; i < len; i++) if (claimed[i] === "1") adv.bits[i] = true;
  }
}
function showLuck(l) {
  if (!l || !(l.mult > 1)) return;
  const rem = Math.round((l.until - srvNow()) / 1000); if (rem <= 0) return;
  if (activeTimers.luck) { if (Math.abs(activeTimers.luck.remaining - rem) <= 2) return; clearInterval(activeTimers.luck.interval); const c = $("event-luck"); if (c) c.remove(); delete activeTimers.luck; }
  const prod = SHOP_PRODUCTS.find(p => p.multiplier === l.mult);
  startHudTimer("luck", LUCK_IMAGES[l.mult] || (prod && IMG_POTIONS[prod.type]) || "", rem, "🍀", () => {});
}
// une requête qui envoie les pommes ramassées (masque) et reçoit le paquet à jour
async function advCallRaw(path, extra, next) {
  const sent = adv.unsent; adv.unsent = []; adv.lastTry = Date.now(); if (next) adv.rolling = true;
  try {
    const p = await api(path, "POST", { ...extra, seq: adv.seq, mask: adv.seq < 0 ? null : maskStr(), next: !!next });
    adv.fails = 0; adv.warned = false;
    applyPack(p); showLuck(p.luck); if (p.trades) handleTrades(p.trades);
    return p;
  } catch (e) { adv.unsent = sent.concat(adv.unsent); adv.fails++; throw e; }
  finally { adv.rolling = false; }
}
const advCall = (path, extra, next) => serial(() => advCallRaw(path, extra, next));
const advFlushRaw = async () => { if (adv.on && adv.unsent.length) await advCallRaw("/sync", {}, false); };
const advFlush = () => (adv.on && adv.unsent.length) ? serial(() => advCallRaw("/sync", {}, false)).catch(() => {}) : Promise.resolve();

/* ---------- avertissements anti-triche ---------- */
const warnCss = document.createElement("style");
warnCss.textContent = `#warn-ov{position:fixed;inset:0;z-index:9800;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);display:none;align-items:center;justify-content:center}
#warn-box{max-width:min(560px,90vw);padding:32px 36px;border-radius:20px;background:rgba(17,22,35,.96);border:1px solid rgba(255,255,255,.12);box-shadow:0 30px 80px rgba(0,0,0,.6);text-align:center;color:#fff;font-weight:800;letter-spacing:-0.02em;animation:trpop .22s ease-out}
#warn-box .wt{font-size:26px;margin-bottom:14px}
#warn-box .wb{font-size:16px;line-height:1.7}
#warn-box .wn{display:inline-flex;align-items:center;gap:6px;vertical-align:middle;background:linear-gradient(90deg,#fff,#a5b4fc 50%,#67e8f9);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;font-weight:800;letter-spacing:-0.03em}
#warn-box .wn img{width:28px;height:28px;object-fit:contain;-webkit-text-fill-color:initial}
#warn-box .wx{margin-top:14px;font-size:16px;color:#f43f5e}`;
document.head.appendChild(warnCss);
const warnOv = document.createElement("div"); warnOv.id = "warn-ov";
warnOv.innerHTML = `<div id="warn-box"></div>`;
document.body.appendChild(warnOv);
warnOv.addEventListener("mousedown", e => { if (e.target === warnOv && !banUntil) warnOv.style.display = "none"; }); // clic en dehors = ferme (impossible pendant un ban)
const WLOGO = "https://raw.githubusercontent.com/FastCollectChallenge/play/main/Fast%20Collect%20Challenge%20NBG%20logo.png";
const WNAME = `<span class="wn"><img src="${WLOGO}" alt="">Fast Collect Challenge</span>`;
let lastWarn = 0;
let banUntil = 0, banTimer = null, srvOff = 0;
function fmtLeft(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return String(Math.floor(s / 3600)).padStart(2, "0") + ":" + String(Math.floor(s % 3600 / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
}
function showBan(until, now) {
  banUntil = until; srvOff = now ? now - Date.now() : srvOff;
  advStop(false);
  $("warn-box").innerHTML = `<div class="wt">You got temporarily banned from ${WNAME}</div><div class="wx" id="ban-left"></div>`;
  warnOv.style.display = "flex";
  clearInterval(banTimer);
  const tick = () => {
    const left = banUntil - (Date.now() + srvOff);
    if (left <= 0) { clearInterval(banTimer); banUntil = 0; location.reload(); return; }
    $("ban-left").textContent = fmtLeft(left);
  };
  tick(); banTimer = setInterval(tick, 1000);
}

async function warnCheater() {
  if (!me || Date.now() - lastWarn < 10000) return; // une seule alerte à la fois
  lastWarn = Date.now();
  if (banUntil) return;
  let r; try { r = await api("/warn", "POST", {}); } catch (e) { return; }
  if (r.banned_until) return showBan(r.banned_until, r.now);
  const n = r.warnings;
  const box = $("warn-box");
  if (n === 1) box.innerHTML = `<div class="wt">You got your first warning.</div><div class="wb">${WNAME} does not approve of cheaters, just thought you ought to know.</div>`;
  else box.innerHTML = `<div class="wt">You just got your last chance.</div><div class="wb">We already told you that ${WNAME} does not approve of cheaters, but you don't seem to understand.</div><div class="wx">Next time it's going to be a ban</div>`;
  warnOv.style.display = "flex";
}

/* ---------- détection : inventaire ou argent modifiés à la main ---------- */
let trusted = null;
function snap() { // valeurs officielles = ce que le serveur a donné + ce que le jeu a fait lui-même
  const a = acc(); if (!a) { trusted = null; return; }
  const ap = {}; Object.values(APPLE_FIELDS).forEach(f => ap[f] = a[f] || 0);
  trusted = { money: a.money, ap, potions: { ...a.potions } };
}
setInterval(() => {
  const a = acc(); if (!me || !a || !trusted) return;
  let bad = a.money !== trusted.money;
  for (const f in trusted.ap) if ((a[f] || 0) !== trusted.ap[f]) bad = true;
  new Set([...Object.keys(a.potions || {}), ...Object.keys(trusted.potions)]).forEach(id => { if ((a.potions[id] || 0) !== (trusted.potions[id] || 0)) bad = true; });
  if (!bad) return;
  warnCheater();
  a.money = trusted.money; Object.assign(a, trusted.ap); a.potions = { ...trusted.potions }; // on remet les vraies valeurs
  updateAdventureHUD();
}, 1000);

window.advHold = () => adv.rolling; // pendant le changement de paquet, on ne ramasse pas (index.html)
window.advCollect = a => {
  if (a.idx == null) { warnCheater(); return; } // pomme sans token = pomme fabriquée
  if (!adv.on || a.advSeq !== adv.seq || adv.bits[a.idx]) return;
  adv.bits[a.idx] = true; adv.unsent.push(a.type);
  const d = acc(); if (d) credit(d, a.type);
  snap();
  updateAdventureHUD();
};
window.advStart = async function () {
  advStop(false);
  adv.on = true; adv.seq = -1; adv.spawns = []; adv.bits = []; adv.handled = []; adv.unsent = []; adv.fails = 0;
  const my = ++adv.run;
  for (;;) {
    try { await advCall("/sync", {}, false); break; }
    catch (e) {
      if (!adv.on || my !== adv.run) return;
      if (!adv.warned) { adv.warned = true; toast("Server unavailable, retrying..."); }
      await sleep(3000); if (!adv.on || my !== adv.run) return;
    }
  }
  if (my !== adv.run) return;
  clearInterval(adv.timer); adv.timer = setInterval(advTick, 250); advTick();
};
function advStop(sendFinal) {
  const was = adv.on && adv.seq >= 0 && adv.unsent.length;
  adv.on = false; adv.run++; clearInterval(adv.timer); adv.timer = null;
  if (sendFinal && was) api("/sync", "POST", { seq: adv.seq, mask: maskStr() }, { keepalive: true }).catch(() => {});
}
function beacon() { // fermeture de l'onglet : le serveur accepte la collecte partielle
  if (!adv.on || adv.seq < 0 || !adv.unsent.length || !cachedToken) return;
  try { navigator.sendBeacon(API + "/sync", new Blob([JSON.stringify({ token: cachedToken, seq: adv.seq, mask: maskStr() })], { type: "text/plain" })); } catch (e) {}
}
document.addEventListener("visibilitychange", () => { if (document.hidden) beacon(); });
window.addEventListener("pagehide", beacon);

/* ---------- actions d'économie (le serveur décide, l'écran suit) ---------- */
window.saveAllAccounts = function () { updateAdventureHUD(); };
const _leave = window.leaveGame;
window.leaveGame = function () { _leave(); advStop(true); };

window.buyPotion = function (product) {
  const a = acc(); if (!a) return;
  if (a.money < product.price) { alert("You don't have enough money to buy this potion!"); return; }
  showCustomConfirm("Are you sure you want to buy this potion?", ok => {
    if (!ok) return;
    act("/buy", { id: product.id }, () => { a.money -= product.price; a.potions[product.id] = (a.potions[product.id] || 0) + 1; }).then(() => renderShopGrid()).catch(() => renderShopGrid());
  });
};
window.sellPotion = function (id) {
  const a = acc(), prod = SHOP_PRODUCTS.find(p => p.id === id); if (!a || !prod || !(a.potions[id] > 0)) return;
  showCustomConfirm("Are you sure you want to sell this potion (You will only keep 80% of the price)?", ok => {
    if (!ok) return;
    act("/sell-potion", { id }, () => { a.potions[id]--; a.money += Math.floor(prod.price * 0.8); });
  });
};
window.usePotion = function (id) {
  const a = acc(), prod = SHOP_PRODUCTS.find(p => p.id === id); if (!a || !prod || !(a.potions[id] > 0) || !adv.on) return;
  showCustomConfirm("Are you sure you want to use this potion?", async ok => {
    if (!ok) return;
    try {
      await advCall("/use-potion", { id }, false);
      showAdvancedMsg(`You activated Potion ${prod.multiplier}x luck!`, "bottom", getLuckStyle(prod.multiplier));
      toggleInventory(false);
    } catch (e) { toast(errMsg(e)); }
  });
};
window.confirmTransaction = function () {
  if (!activeSellType) return; const a = acc(); if (!a) return;
  const t = activeSellType, v = $("sell-quantity").value.trim(), f = APPLE_FIELDS[t], stock = a[f] || 0;
  let n;
  if (v.toLowerCase() === "max") n = stock;
  else { n = parseInt(v, 10); if (isNaN(n) || n <= 0) { alert("Please enter a valid amount or type 'Max'."); return; } n = Math.min(n, stock); }
  if (!(n > 0)) { alert("You don't have any apples of this kind to sell!"); closeSellModal(); return; }
  closeSellModal();
  act("/sell", { type: t, qty: n }, () => { a[f] -= n; a.money += n * priceOf(t); });
};
window.FC = { act, priceOf, srvNow, credit, refreshMe };

/* ---------- écran de connexion ---------- */
const ov = document.createElement("div");
ov.style.cssText = "position:fixed;inset:0;z-index:9000;background:#000;border:10px solid #f1c40f;box-sizing:border-box;display:none;align-items:center;color:#f1c40f";
const sBtn = (id, img, txt) => `<button id="${id}" style="display:flex;align-items:center;gap:14px;width:100%;padding:10px 20px;border:0;border-radius:50px;background:#fff;color:#222;font-size:15px;font-weight:500;cursor:pointer"><img src="${img}" style="width:28px;height:28px;border-radius:50%;object-fit:contain"><span>${txt}</span></button>`;
const inp = "width:100%;box-sizing:border-box;padding:13px 16px;border-radius:12px;border:2px solid #f1c40f;background:#111;color:#fff;font-size:15px";
ov.innerHTML = `<div style="width:48%;padding:0 3%;box-sizing:border-box;display:flex;flex-direction:row;align-items:center;gap:24px"><img src="${LOGO}" style="width:120px;height:120px;object-fit:contain;flex:none"><div style="font-size:40px;line-height:1.5;text-transform:uppercase;text-shadow:4px 4px 0 #333">Fast Collect Challenge</div></div>
<div class="rb" style="position:absolute;top:36px;right:170px;font-size:14px;color:#ddd"><span id="au-q">No account?</span> <a id="au-alt" href="#" style="color:#f1c40f;font-weight:700">Sign-up here</a></div>
<div class="rb" style="width:52%;display:flex;justify-content:center"><div style="width:360px;display:flex;flex-direction:column;gap:14px">
<input id="au-name" style="${inp}" placeholder="Username or email"><input id="au-pw" type="password" style="${inp}" placeholder="Password (6+ chars)">
<button id="au-main" style="padding:13px;border:0;border-radius:50px;background:#f1c40f;color:#000;font-size:15px;font-weight:700;cursor:pointer">Log in</button>
<div id="au-social" style="display:flex;flex-direction:column;gap:14px">${sBtn("au-google", "https://png.pngtree.com/png-vector/20230817/ourmid/pngtree-google-logo-vector-png-image_9183290.png", "Log-in with Google")}${sBtn("au-github", "https://cdn-icons-png.flaticon.com/512/25/25231.png", "Log-in with Github")}<a id="au-guest" href="#" style="color:#aaa;text-align:center;font-size:13px">Play as guest</a></div>
<div id="au-err" style="color:#ff6b6b;font-size:13px;min-height:16px;text-align:center"></div></div></div>`;
const boot = document.createElement("div"); // écran de chargement pendant la connexion automatique
boot.style.cssText = "position:fixed;inset:0;z-index:8999;background:#000;border:10px solid #f1c40f;box-sizing:border-box;display:flex;align-items:center;justify-content:center";
boot.innerHTML = `<img src="${LOGO}" style="width:140px;height:140px;object-fit:contain">`;
document.body.appendChild(boot);
document.body.appendChild(ov);
if (window.makeLangSwitch) { const w = makeLangSwitch(); w.style.cssText = "top:14px;left:16px"; ov.appendChild(w); }
const err = e => $("au-err").textContent = (e && (e.code || e.message)) || String(e);
window.addEventListener("unhandledrejection", e => { console.error(e.reason); err(e.reason); });
window.addEventListener("error", e => err(e.message));
let mode = "login";
function setAuthMode(m) {
  mode = m; const su = m === "signup";
  $("au-main").textContent = su ? "Sign up" : "Log in";
  $("au-social").style.display = su ? "none" : "flex";
  $("au-q").textContent = su ? "Already have an account?" : "No account?";
  $("au-alt").textContent = su ? "Log-in here" : "Sign-up here"; err("");
}

async function pseudoAuth(signup) {
  const raw = $("au-name").value.trim(), pw = $("au-pw").value; err("");
  try {
    if (raw.includes("@")) {
      await (signup ? createUserWithEmailAndPassword(auth, raw, pw) : signInWithEmailAndPassword(auth, raw, pw));
    } else {
      const n = clean(raw); if (!okName(n)) return err("Username: 3-16 chars, a-z 0-9 _");
      if (signup) {
        const f = await fetch(API + "/username-free?u=" + encodeURIComponent(n)).then(r => r.json()).catch(() => null);
        if (f && f.free === false) return err("Username already taken");
        pendingName = n; await createUserWithEmailAndPassword(auth, n + FAKE, pw);
      } else await signInWithEmailAndPassword(auth, n + FAKE, pw);
    }
  } catch (e) { pendingName = null; err(e); }
}
$("au-main").onclick = () => pseudoAuth(mode === "signup");
$("au-alt").onclick = e => { e.preventDefault(); setAuthMode(mode === "signup" ? "login" : "signup"); };
let popupBusy = false;
const social = Provider => {
  if (popupBusy) return;
  popupBusy = true; err("");
  signInWithPopup(auth, new Provider())
    .catch(e => err(e.code === "auth/popup-blocked" ? "Popup blocked: allow popups for this site and try again" : e))
    .finally(() => { popupBusy = false; });
};
$("au-google").onclick = () => social(GoogleAuthProvider);
$("au-github").onclick = () => social(GithubAuthProvider);
$("au-guest").onclick = e => { e.preventDefault(); signInAnonymously(auth).catch(err); };

/* ---------- profil ---------- */
const AV0 = "https://raw.githubusercontent.com/FastCollectChallenge/play/main/Fast%20Collect%20Challenge.png";
const pf = document.createElement("div"); pf.id = "profile-page";
pf.style.cssText = "position:fixed;inset:0;z-index:9100;background:#000;border:10px solid #f1c40f;box-sizing:border-box;display:none;align-items:center;color:#f1c40f";
pf.innerHTML = `<div style="width:48%;padding:0 3%;box-sizing:border-box;display:flex;flex-direction:row;align-items:center;gap:24px"><img src="${LOGO}" style="width:120px;height:120px;object-fit:contain;flex:none"><div style="font-size:40px;line-height:1.5;text-transform:uppercase;text-shadow:4px 4px 0 #333">Fast Collect Challenge</div></div>
<div class="rb" style="width:52%;display:flex;justify-content:center"><div style="width:380px;display:flex;flex-direction:column;gap:14px">
<div id="pf-title" style="font-size:22px;font-weight:700;color:#fff;text-align:center;line-height:1.3"></div>
<div style="display:flex;justify-content:center"><img id="pf-prev" style="width:110px;height:110px;border-radius:50%;object-fit:cover;border:3px solid #f1c40f;background:#222"></div>
<input id="pf-name" style="${inp}" placeholder="Username (3-16: a-z, 0-9, _)"><input id="pf-photo" style="${inp}" placeholder="Profile picture URL (https://...)">
<div id="pf-lang" style="display:none;align-items:center;justify-content:center;gap:12px;color:#ddd;font-size:14px"><span>Language</span></div>
<button id="pf-ok" style="padding:13px;border:0;border-radius:50px;background:#f1c40f;color:#000;font-size:15px;font-weight:700;cursor:pointer"></button>
<a id="pf-close" href="#" style="color:#ddd;text-align:center;font-size:13px">Close</a><a id="pf-out" href="#" style="color:#aaa;text-align:center;font-size:13px">Log out</a>
<div id="pf-err" style="color:#ff6b6b;font-size:13px;min-height:16px;text-align:center"></div></div></div>`;
document.body.appendChild(pf);
if (window.makeLangSwitch) { const w = makeLangSwitch(); w.style.position = "static"; $("pf-lang").appendChild(w); }
const pferr = m => $("pf-err").textContent = m ? (m.code || m.message || String(m)) : "";
function showPrev() {
  const im = $("pf-prev"), u = $("pf-photo").value.trim();
  im.onerror = () => { im.onerror = null; im.src = AV0; };
  im.src = /^https:\/\/\S+$/i.test(u) ? u : AV0;
}
$("pf-photo").oninput = showPrev;
function openProfilePage({ edit, noName, name, photo, submit, cancel }) {
  let hideName = !!noName;
  $("pf-title").textContent = edit ? "Edit your profile picture" : noName ? "Choose your profile picture" : "Choose your username and profile picture";
  $("pf-ok").textContent = edit ? "Save" : "Continue";
  $("pf-name").value = name || ""; $("pf-name").disabled = !!edit; $("pf-name").style.display = noName ? "none" : ""; $("pf-photo").value = photo || ""; showPrev();
  $("pf-close").style.display = edit ? "block" : "none"; $("pf-lang").style.display = edit ? "flex" : "none"; $("pf-out").textContent = edit && auth.currentUser && auth.currentUser.isAnonymous ? "Log in / Sign up" : "Log out"; pferr(""); pf.style.display = "flex";
  $("pf-ok").onclick = async () => {
    const n = hideName ? name : clean($("pf-name").value), p = $("pf-photo").value.trim();
    if (!okName(n)) return pferr("Invalid username");
    if (p && !/^https:\/\/\S+$/i.test(p)) return pferr("Invalid picture URL (must start with https://)");
    try { await submit(n, p); pf.style.display = "none"; }
    catch (e) {
      if (e.message === "taken" && hideName) { hideName = false; $("pf-name").style.display = ""; $("pf-name").value = n; } // pseudo pris entre-temps : on laisse choisir un autre
      pferr(e.message === "taken" ? "Username already taken" : e);
    }
  };
  $("pf-close").onclick = e => { e.preventDefault(); pf.style.display = "none"; };
  $("pf-out").onclick = async e => { e.preventDefault(); await cancel(); pf.style.display = "none"; };
}
function setAvatar(url) {
  const b = $("account-settings-btn"); if (!b) return;
  b.innerHTML = '<img style="width:100%;height:100%;border-radius:50%;object-fit:cover;border:calc(3*var(--u)) solid #f1c40f;box-sizing:border-box;background:#222">';
  const im = b.firstChild; im.onerror = () => { im.onerror = null; im.src = AV0; }; im.src = url || AV0;
}
const suggest = u => clean((u.displayName || u.email || "").split("@")[0]).replace(/[^a-z0-9_]/g, "_").slice(0, 16);
const claim = async (name, photo) => { try { await api("/me", "POST", { username: name, photo }); } catch (e) { if (e.message !== "exists") throw e; } };

async function ensureProfile(user) { // renvoie le compte du serveur, ou null si la connexion est annulée
  try { return await api("/me"); } catch (e) { if (e.status !== 404) throw e; }
  const chosen = pendingName; pendingName = null;
  if (user.isAnonymous) { // invité : pas de page, pseudo guestXXXX
    for (let i = 0; i < 5; i++) {
      try { await claim("guest" + Math.floor(1000 + Math.random() * 9000), ""); return await api("/me"); }
      catch (e) { if (e.message !== "taken") throw e; }
    }
    await signOut(auth); return null;
  }
  return new Promise(res => openProfilePage({
    edit: false, noName: !!chosen, name: chosen || suggest(user), photo: user.photoURL || "",
    submit: async (n, p) => { await claim(n, p); res(await api("/me")); },
    cancel: async () => { await signOut(auth); res(null); }
  }));
}

function applyRemote(v) {
  username = v.username; myPhoto = v.photo || ""; setAvatar(myPhoto);
  accounts = { [username]: normalize(v.data) }; currentAccountName = username;
  window.__fcUser = username; try { window.setMode(window.__fcMode || "menu"); } catch (e) {}
  updateAdventureHUD();
  snap();
}
window.openAccountModal = () => me && openProfilePage({
  edit: true, name: username, photo: myPhoto,
  submit: async (n, p) => { await api("/me/photo", "PATCH", { photo: p }); myPhoto = p; setAvatar(p); },
  cancel: async () => { await advFlush(); manualLogout = true; await signOut(auth); }
});

/* ---------- Trade : UI ---------- */
const trBtn = document.createElement("button");
trBtn.id = "trade-btn"; trBtn.className = "side-btn"; trBtn.style.background = "rgb(255, 255, 255)";
trBtn.innerHTML = `<img src="https://cdn-icons-png.flaticon.com/512/3439/3439283.png" alt="Trade" onerror="this.style.display='none';this.parentNode.classList.add('no-img')"><span class="side-btn-label">Trade</span><span id="tr-badge" style="display:none;position:absolute;top:-6px;right:-6px;min-width:20px;height:20px;line-height:20px;border-radius:10px;background:#e84118;color:#fff;font-size:9px;text-align:center"></span>`;
$("side-buttons").appendChild(trBtn);
const trStyle = document.createElement("style");
trStyle.textContent = `@keyframes trpop{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:none}}
.tr-hint{color:#aaa;text-align:center;padding:36px 0;font-size:14px}
.tr-row{display:flex;align-items:center;gap:12px;padding:6px 0;margin-bottom:6px}
.tr-av{width:36px;height:36px;border-radius:4px;object-fit:cover;background:#222;flex:none}
.tr-mid{flex:1;min-width:0;font-size:14px}.tr-name{color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tr-send{border:0;border-radius:2px;padding:9px 14px;background:#27ae60;color:#fff;cursor:pointer;font-size:14px;flex:none}
.tr-send:disabled{background:#7f8c8d;cursor:not-allowed}
#tr-toasts{position:fixed;right:20px;bottom:140px;z-index:1500;display:flex;flex-direction:column;gap:10px;pointer-events:none}
.tr-toast{pointer-events:auto;width:300px;box-sizing:border-box;background:rgba(20,20,25,.92);border:2px solid #487eb0;border-radius:14px;padding:12px;color:#fff;font-size:14px;animation:trpop .22s ease-out}
.tr-btns{display:flex;gap:8px;margin-top:10px}
.tr-btns button{flex:1;background:transparent;color:#fff;border-radius:10px;padding:8px 0;font-size:13px;cursor:pointer}
.tr-acc{border:2px solid #2ecc71}.tr-dec{border:2px solid #e74c3c}`;
document.head.appendChild(trStyle);
const trToasts = document.createElement("div"); trToasts.id = "tr-toasts"; document.body.appendChild(trToasts);

const tr = document.createElement("div"); tr.id = "trade-screen"; tr.className = "rb";
tr.style.cssText = "position:fixed;inset:0;margin:auto;width:400px;max-width:92vw;height:360px;max-height:80vh;background:#000;z-index:1000;border-radius:8px;border:1px solid #333;display:none;flex-direction:column;padding:14px;box-sizing:border-box;color:#fff";
tr.innerHTML = `<button id="tr-close" style="display:none"></button>
<div style="position:relative;margin-bottom:14px"><span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:16px;pointer-events:none">🔍</span><input id="tr-user" autocomplete="off" placeholder="Search for a user" style="width:100%;box-sizing:border-box;height:42px;padding:0 12px 0 40px;background:#000;border:1px solid #fff;border-radius:3px;color:#fff;font-size:15px;outline:none"></div>
<div id="tr-results" style="flex:1;overflow-y:auto"></div>`;
document.body.appendChild(tr);

const HINT = '<div class="tr-hint">Type a username to search</div>';
trBtn.onclick = () => {
  ["inventory-screen", "shop-screen", "index-screen"].forEach(i => $(i).style.display = "none");
  tr.style.display = "flex"; $("tr-user").value = ""; $("tr-results").innerHTML = HINT; $("tr-user").focus();
  pollTrades();
};
$("tr-close").onclick = () => { tr.style.display = "none"; };

/* recherche en direct */
let searchTimer = null, searchSeq = 0;
$("tr-user").oninput = () => { clearTimeout(searchTimer); searchTimer = setTimeout(doSearch, 300); };
async function doSearch() {
  const q = clean($("tr-user").value).replace(/^@/, ""), box = $("tr-results"), seq = ++searchSeq;
  if (!q) { box.innerHTML = HINT; return; }
  try {
    const r = await api("/users?q=" + encodeURIComponent(q));
    if (seq !== searchSeq) return;
    box.textContent = "";
    if (!r.users.length) { box.innerHTML = '<div class="tr-hint">No player found</div>'; return; }
    r.users.forEach(u => box.appendChild(playerRow(u)));
  } catch (e) { box.textContent = errMsg(e); }
}
function playerRow(u) {
  const on = !!u.online;
  const r = document.createElement("div"); r.className = "tr-row";
  const img = new Image(); img.className = "tr-av"; img.onerror = () => { img.onerror = null; img.src = AV0; }; img.src = u.photo || AV0;
  const mid = document.createElement("div"); mid.className = "tr-mid";
  const nm = document.createElement("div"); nm.className = "tr-name"; nm.textContent = "@" + u.username;
  const st = document.createElement("div"); st.textContent = on ? "Online" : "Offline"; st.style.color = on ? "#2ecc71" : "#e74c3c";
  mid.append(nm, st);
  const b = document.createElement("button"); b.className = "tr-send"; b.textContent = "Send Trade"; b.disabled = !on;
  b.onclick = () => sendRequest(u.username, b);
  r.append(img, mid, b); return r;
}
async function sendRequest(uname, btn) {
  if (trades.some(t => t.role === "from" && t.status === "pending" && t.other === uname)) return toast("Request already pending");
  btn.disabled = true;
  try { await api("/trades", "POST", { to: uname }); btn.textContent = "Request sent"; toast("Trade request sent!"); pollTrades(); }
  catch (e) { btn.disabled = false; toast(errMsg(e)); }
}

/* ---------- Trade : demandes et état (reçus avec la synchro ; sondage rapide seulement quand c'est utile) ---------- */
let trades = [], cur = null, fastTimer = null, polling = false;
const shown = new Map(), dismissed = new Set();
function setFast(on) {
  if (on && !fastTimer) fastTimer = setInterval(pollTrades, 2000);
  if (!on && fastTimer) { clearInterval(fastTimer); fastTimer = null; }
}
async function pollTrades() {
  if (polling || !me) return; polling = true;
  try { const r = await api("/trades"); if (r.now) srv.offset = r.now - Date.now(); handleTrades(r.trades); } catch (e) { console.warn(e); }
  polling = false;
}
function handleTrades(list) {
  trades = list || [];
  renderIncoming(trades.filter(t => t.role === "to" && t.status === "pending"));
  if (cur) {
    const t = trades.find(x => x.id === cur.id);
    if (!t) stopTrading();
    else if (t.status === "accepted") { cur = t; renderTrading(); }
    else tradeEnded(t);
  } else {
    const t = trades.find(x => x.status === "accepted");
    if (t) openTrading(t);
  }
  setFast(!!cur || trades.some(x => x.role === "from" && x.status === "pending"));
}
function tradeEnded(t) {
  if (t.status === "completed") { toastG(`Trade with @${cur.other} completed!`); refreshMe().catch(() => {}); }
  else if (t.status === "cancelled" && !t.cancelledByMe) toastG("@" + cur.other + " cancelled the trade");
  stopTrading();
}

/* demandes reçues : mini pop-up en bas à droite */
function renderIncoming(list) {
  const ids = new Set();
  list.forEach(t => { if (dismissed.has(t.id)) return; ids.add(t.id); if (!shown.has(t.id)) shown.set(t.id, makeToast(t)); });
  shown.forEach((el, id) => { if (!ids.has(id)) { el.remove(); shown.delete(id); } });
}
function makeToast(t) {
  const c = document.createElement("div"); c.className = "tr-toast rb";
  const m = document.createElement("div"), b = document.createElement("b"), sp = document.createElement("span");
  b.textContent = "@" + t.other; sp.textContent = " sent you a trade request"; m.append(b, sp);
  const row = document.createElement("div"); row.className = "tr-btns";
  const ac = document.createElement("button"), de = document.createElement("button");
  ac.className = "tr-acc"; ac.textContent = "Accept"; de.className = "tr-dec"; de.textContent = "Decline";
  ac.onclick = () => respond(t, true); de.onclick = () => respond(t, false);
  row.append(ac, de); c.append(m, row); trToasts.appendChild(c);
  setTimeout(() => { dismissed.add(t.id); c.remove(); shown.delete(t.id); }, 30000);
  return c;
}
async function respond(t, accept) {
  dismissed.add(t.id); const el = shown.get(t.id); if (el) el.remove(); shown.delete(t.id);
  try { await api(`/trades/${t.id}/respond`, "POST", { accept }); toast(accept ? "Trade request accepted" : "Trade request declined"); if (accept) pollTrades(); }
  catch (e) { toast(errMsg(e)); }
}

/* ---------- Trade : fenêtre d'échange ---------- */
const twStyle = document.createElement("style");
twStyle.textContent = `.tw-grid{flex:1;overflow-y:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:12px;align-content:start}
.tw-card{background:rgba(255,255,255,.1);border:2px solid rgba(255,255,255,.15);border-radius:16px;padding:8px;display:flex;flex-direction:column;align-items:center;gap:6px;min-height:112px}
.tw-card.click{cursor:pointer}.tw-card.click:hover{background:rgba(255,255,255,.18);border-color:rgba(255,255,255,.4)}
.tw-card.on{border-color:#4ADE80;background:rgba(74,222,128,.2)}
.tw-card .nm{font-size:12px;text-align:center}.tw-card img{width:44px;height:44px;object-fit:contain}
.tw-card .q{align-self:flex-end;font-size:14px;margin-top:auto}
.tw-hint{grid-column:1/-1;color:#9aa3ad;text-align:center;padding:30px 0;font-size:14px}
#trading-screen{animation:trpop .22s ease-out}`;
document.head.appendChild(twStyle);
const tw = document.createElement("div"); tw.id = "trading-screen"; tw.className = "rb";
tw.style.cssText = "position:fixed;inset:0;margin:auto;width:min(820px,94vw);height:min(540px,86vh);background:rgba(0,0,0,.6);z-index:1000;border-radius:25px;border:3px solid rgba(255,255,255,.2);backdrop-filter:blur(8px);display:none;flex-direction:column;padding:22px;box-sizing:border-box;color:#fff";
tw.innerHTML = `<div class="screen-header" style="margin-bottom:14px;padding-bottom:12px"><h2 class="inv-title-text" id="tw-title" style="color:#fff;font-size:14px"></h2><button class="close-screen-btn" id="trading-close">Close ✖</button></div>
<div style="flex:1;display:flex;min-height:0">
<div style="flex:1;display:flex;flex-direction:column;min-width:0;padding-right:14px"><div style="font-size:16px;margin-bottom:10px;text-align:center">Your offer</div><div id="tw-mine" class="tw-grid"></div></div>
<div style="width:2px;background:rgba(255,255,255,.2)"></div>
<div style="flex:1;display:flex;flex-direction:column;min-width:0;padding-left:14px"><div id="tw-their-title" style="font-size:16px;margin-bottom:10px;text-align:center"></div><div id="tw-theirs" class="tw-grid"></div></div></div>`;
document.body.appendChild(tw);
const twFoot = document.createElement("div");
twFoot.style.cssText = "display:flex;align-items:center;justify-content:center;gap:12px;margin-top:14px";
twFoot.innerHTML = `<div id="tw-state" style="font-size:14px;color:#ddd;text-align:center"></div><button id="tw-main" class="tr-send" style="padding:12px 22px;font-size:15px"></button><button id="tw-cancel" class="tr-send" style="padding:12px 22px;font-size:15px;background:#c23616;display:none">Cancel</button>`;
tw.appendChild(twFoot);

const am2 = document.createElement("div"); am2.id = "add-modal"; am2.className = "rb";
am2.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:2100;display:none;align-items:center;justify-content:center;backdrop-filter:blur(2px)";
const qcol = (vals, cls, last) => `<div class="qty-col">${vals.map(v => `<button class="qty-btn ${cls}" data-d="${v}">${v}</button>`).join("")}<button class="qty-btn ${cls}" data-d="${last.toLowerCase()}">${last}</button></div>`;
am2.innerHTML = `<div class="sell-box"><h3>Quantity to add</h3><div id="add-name" style="font-size:15px"></div>
<div style="display:grid;grid-template-columns:1fr 1.2fr 1fr;gap:12px;align-items:center;margin:14px 0">${qcol(["-1", "-3", "-5", "-10"], "qty-neg", "None")}<div id="add-num" style="font-size:26px;text-align:center;color:#fff">0</div>${qcol(["+1", "+3", "+5", "+10"], "qty-pos", "All")}</div>
<div class="sell-actions"><button class="acc-btn" id="add-ok">Confirm</button><button class="acc-btn danger" id="add-cancel">Cancel</button></div></div>`;
document.body.appendChild(am2);

let sigLast = "", addType = null, addQty = 0, addMax = 0, cd = { id: null, done: false };
const CD_MS = 5000;
const owned = t => (acc() || {})[APPLE_FIELDS[t]] || 0;
const lacking = o => Object.keys(o).find(t => owned(t) < o[t]);
function twCard(type, qty, click) {
  const c = document.createElement("div"); c.className = "tw-card" + (click ? " click" : "") + (click && qty > 0 ? " on" : "");
  const n = document.createElement("div"); n.className = "nm"; n.textContent = APPLE_NAMES[type];
  const im = new Image(); im.src = IMG_FRUITS[type];
  const q = document.createElement("div"); q.className = "q"; q.textContent = "x" + fmtNum(qty);
  c.append(n, im, q); if (click) c.onclick = click; return c;
}
function renderTrading() {
  renderFooter();
  if (!cur) return;
  const sig = JSON.stringify([cur.mine, cur.theirs, APPLE_ORDER.map(owned)]);
  if (sig === sigLast) return; sigLast = sig;
  const mine = $("tw-mine"), theirs = $("tw-theirs"); mine.innerHTML = ""; theirs.innerHTML = "";
  const hint = m => `<div class="tw-hint">${m}</div>`;
  APPLE_ORDER.forEach(t => { if (owned(t) > 0 || (cur.mine[t] || 0) > 0) mine.appendChild(twCard(t, cur.mine[t] || 0, () => openAdd(t))); });
  if (!mine.children.length) mine.innerHTML = hint("You have no apples");
  APPLE_ORDER.forEach(t => { if ((cur.theirs[t] || 0) > 0) theirs.appendChild(twCard(t, cur.theirs[t])); });
  if (!theirs.children.length) theirs.innerHTML = hint("Nothing yet");
}
function openTrading(t) {
  if (cur) return;
  cur = t; sigLast = ""; cd = { id: t.id, done: false };
  $("tw-title").textContent = "Trading with @" + t.other;
  $("tw-their-title").textContent = "@" + t.other + "'s offer";
  ["inventory-screen", "shop-screen", "index-screen"].forEach(i => $(i).style.display = "none");
  tr.style.display = "none"; tw.style.display = "flex"; renderTrading(); setFast(true);
}
function stopTrading() {
  cur = null; tw.style.display = "none"; am2.style.display = "none";
  setFast(trades.some(x => x.role === "from" && x.status === "pending"));
}
$("trading-close").onclick = () => { const id = cur && cur.id; stopTrading(); if (id) api(`/trades/${id}/cancel`, "POST", {}).catch(() => {}); };
const setAdd = n => { addQty = Math.max(0, Math.min(addMax, n)); $("add-num").textContent = addQty; };
function openAdd(type) {
  addType = type; addMax = owned(type); $("add-name").textContent = APPLE_NAMES[type];
  setAdd((cur && cur.mine[type]) || 0); am2.style.display = "flex";
}
am2.addEventListener("click", e => {
  const b = e.target.closest("[data-d]"); if (!b) return; const d = b.dataset.d;
  setAdd(d === "none" ? 0 : d === "all" ? addMax : addQty + parseInt(d));
});
$("add-cancel").onclick = () => { am2.style.display = "none"; };

async function tradeCall(act, body) {
  if (!cur) return; const id = cur.id;
  try { await advFlush(); await api(`/trades/${id}/${act}`, "POST", body); } catch (e) { toast(errMsg(e)); }
  pollTrades();
}
$("add-ok").onclick = () => { am2.style.display = "none"; if (cur) tradeCall("offer", { type: addType, qty: addQty }); };

function renderFooter() {
  if (!cur) return;
  const on = cur.other, rMe = cur.readyMe, rOt = cur.readyOther, cMe = cur.confirmMe, cOt = cur.confirmOther;
  const st = $("tw-state"), main = $("tw-main"), cn = $("tw-cancel");
  cn.style.display = "none"; main.style.display = ""; main.style.background = "#27ae60";
  if (cMe && cOt) { main.style.display = "none"; cn.style.display = ""; }
  else if (cMe) { st.textContent = `Waiting for @${on} to confirm...`; main.textContent = "Cancel"; main.style.background = "#c23616"; main.dataset.a = "unconfirm"; }
  else if (rMe && rOt) { st.textContent = "Both ready! Press Confirm"; main.textContent = "Confirm"; main.dataset.a = "confirm"; }
  else if (rMe) { st.textContent = `Waiting for @${on} to be ready...`; main.textContent = "Not ready"; main.style.background = "#7f8c8d"; main.dataset.a = "unready"; }
  else { st.textContent = "Press Ready when your offer is final"; main.textContent = "Ready"; main.dataset.a = "ready"; }
}
$("tw-main").onclick = () => {
  if (!cur) return; const a = $("tw-main").dataset.a, mine = cur.mine;
  if (a === "ready") {
    if (!Object.keys(mine).length && !Object.keys(cur.theirs).length) return toast("Empty offer");
    const l = lacking(mine); if (l) return toast("You don't have enough: " + APPLE_NAMES[l]);
    tradeCall("ready", { value: true });
  } else if (a === "unready") tradeCall("ready", { value: false });
  else if (a === "confirm") {
    const l = lacking(mine); if (l) return toast("You don't have enough: " + APPLE_NAMES[l]);
    tradeCall("confirm", { value: true });
  } else if (a === "unconfirm") tradeCall("confirm", { value: false });
};
$("tw-cancel").onclick = () => tradeCall("confirm", { value: false });

// 5 s après la double confirmation, l'un des deux joueurs demande au serveur de conclure (le serveur échange tout en une fois)
setInterval(() => {
  if (!cur || !(cur.confirmMe && cur.confirmOther) || !cur.bothAt) return;
  const left = Math.ceil((CD_MS - (srvNow() - cur.bothAt)) / 1000);
  if (left > 0) { $("tw-state").textContent = `Completing in ${left}s...`; return; }
  if (!cd.done) { cd.done = true; finishTrade(cur.id); }
}, 250);
async function finishTrade(id) {
  for (let i = 0; i < 6; i++) {
    try {
      await advFlush(); await api(`/trades/${id}/complete`, "POST", {}); await refreshMe();
      if (cur && cur.id === id) { toastG(`Trade with @${cur.other} completed!`); stopTrading(); }
      return;
    } catch (e) {
      if (e.status === 425 || e.status === 409) { await sleep(700); continue; }
      toast(errMsg(e)); break;
    }
  }
  pollTrades();
}

/* ---------- invité automatique + Google One Tap ---------- */
const GCLIENT = "357477145806-jagr0f20lv71eef6tj61e37lhdv4bd4h.apps.googleusercontent.com";
let gisReady = false;
function promptOneTap() {
  if (!auth.currentUser || !auth.currentUser.isAnonymous) return; // seulement pour les invités
  const go = () => {
    try {
      if (!gisReady) { gisReady = true; google.accounts.id.initialize({ client_id: GCLIENT, cancel_on_tap_outside: false, callback: onGoogleCredential }); }
      google.accounts.id.prompt();
    } catch (e) { console.warn("One Tap:", e); }
  };
  if (window.google && google.accounts) return go();
  if ($("gsi-script")) return;
  const sc = document.createElement("script"); sc.id = "gsi-script"; sc.src = "https://accounts.google.com/gsi/client"; sc.async = true; sc.onload = go;
  document.head.appendChild(sc);
}
async function onGoogleCredential(resp) {
  try {
    const cred = GoogleAuthProvider.credential(resp.credential), u = auth.currentUser;
    if (u && u.isAnonymous) {
      try {
        await linkWithCredential(u, cred); // l'invité garde son compte et sa progression
        try {
          const pic = JSON.parse(atob(resp.credential.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).picture;
          if (pic && !myPhoto) { await api("/me/photo", "PATCH", { photo: pic }); myPhoto = pic; setAvatar(pic); }
        } catch (e) {}
        toast("Google account linked!");
      } catch (e) {
        if (e.code === "auth/credential-already-in-use" || e.code === "auth/email-already-in-use") await signInWithCredential(auth, GoogleAuthProvider.credentialFromError(e) || cred); // compte Google déjà existant : on s'y connecte
        else throw e;
      }
    } else await signInWithCredential(auth, cred);
  } catch (e) { toast(e.message || e.code); }
}

/* ---------- session ---------- */
onAuthStateChanged(auth, async user => {
  advStop(false); stopTrading(); setFast(false); trades = []; shown.forEach(el => el.remove()); shown.clear();
  if (!user) {
    window.__fcUser = ""; try { window.setMode(window.__fcMode || "menu"); } catch (e) {}
    if (me) { me = null; try { leaveGame(); } catch (e) {} }
    ov.style.display = "flex"; return;
  }
  manualLogout = false;
  let v;
  try { v = await ensureProfile(user); if (!v) return; } catch (e) { err(e); ov.style.display = "flex"; return; }
  if (v.banned_until) { srv.offset = v.now - Date.now(); showBan(v.banned_until, v.now); return; }
  me = user.uid; srv.offset = v.now - Date.now();
  try { applyRemote(v); ov.style.display = "none"; boot.style.display = "none"; promptOneTap(); } catch (e) { err(e); console.error(e); }
});

// interface du jeu (logos, popups sans pause, autosell...) : chargée automatiquement
if (!window.__gameUI) { window.__gameUI = true; const g = document.createElement("script"); g.src = "game-ui.js"; document.head.appendChild(g); }