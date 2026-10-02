// firebase-trade.js : comptes Firebase + sauvegarde cloud + Trade (boîte aux lettres)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, signInAnonymously, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, GithubAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, runTransaction, collection, query, where, onSnapshot,
  addDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp({
  apiKey: "AIzaSyDVkJX-VibTIhMp_WoTqQ6LzNOy7G5OwmY",
  authDomain: "fast-collect-challenge.firebaseapp.com",
  projectId: "fast-collect-challenge",
  storageBucket: "fast-collect-challenge.firebasestorage.app",
  messagingSenderId: "357477145806",
  appId: "1:357477145806:web:61e4d434124a461343849f"
});
const auth = getAuth(app), db = getFirestore(app);
const $ = id => document.getElementById(id);
const FAKE = "@fastcollect.app";
const clean = s => (s || "").trim().toLowerCase();
const okName = s => /^[a-z0-9_]{3,16}$/.test(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const T = s => (window.T ? window.T(s) : s);
const toast = m => showAdvancedMsg(T(m), "top", { color: "white" });

let me = null, username = "", rev = 0, loaded = false, saving = false, dirty = false, saveTimer = null;
let unsubs = [], pendingName = null, inbox = [], outbox = [], draft = { give: {}, ask: {} };

/* ---------- données de jeu ---------- */
const fresh = () => { const d = { money: 0, potions: {}, discovered: {} }; Object.values(APPLE_FIELDS).forEach(f => d[f] = 0); return d; };
const normalize = d => { d = d || {}; return { ...fresh(), ...d, potions: { ...(d.potions || {}) }, discovered: { ...(d.discovered || {}) } }; };
const isKey = k => k === "money" || (k.startsWith("apple:") && !!APPLE_FIELDS[k.slice(6)]) || (k.startsWith("potion:") && SHOP_PRODUCTS.some(p => p.id === k.slice(7)));
const isOffer = o => o && typeof o === "object" && Object.entries(o).every(([k, n]) => isKey(k) && Number.isInteger(n) && n > 0 && n < 1e15);
const getQ = (d, k) => k === "money" ? d.money : k.startsWith("apple:") ? (d[APPLE_FIELDS[k.slice(6)]] || 0) : ((d.potions || {})[k.slice(7)] || 0);
function addQ(d, k, n) {
  if (k === "money") d.money += n;
  else if (k.startsWith("apple:")) { const t = k.slice(6), f = APPLE_FIELDS[t]; d[f] = (d[f] || 0) + n; if (n > 0) d.discovered[t] = true; }
  else { const id = k.slice(7); d.potions[id] = (d.potions[id] || 0) + n; }
}
function label(k) {
  if (k === "money") return "$";
  if (k.startsWith("apple:")) return T(APPLE_NAMES[k.slice(6)]);
  const p = SHOP_PRODUCTS.find(p => p.id === k.slice(7)); return p ? T(`Luck x${p.multiplier}`) + ` (${p.duration}s)` : k;
}
const describe = m => Object.entries(m || {}).map(([k, n]) => `${fmtNum(n)}× ${esc(label(k))}`).join(", ") || T("nothing");

/* ---------- écran de connexion ---------- */
const ov = document.createElement("div");
ov.style.cssText = "position:fixed;inset:0;z-index:9000;background:#000;border:10px solid #f1c40f;box-sizing:border-box;display:flex;align-items:center;color:#f1c40f";
const sBtn = (id, img, txt) => `<button id="${id}" style="display:flex;align-items:center;gap:14px;width:100%;padding:10px 20px;border:0;border-radius:50px;background:#fff;color:#222;font-size:15px;font-weight:500;cursor:pointer"><img src="${img}" style="width:28px;height:28px;border-radius:50%;object-fit:contain"><span>${txt}</span></button>`;
const inp = "width:100%;box-sizing:border-box;padding:13px 16px;border-radius:12px;border:2px solid #f1c40f;background:#111;color:#fff;font-size:15px";
ov.innerHTML = `<div style="width:48%;padding:0 4%;box-sizing:border-box;display:flex;flex-direction:column;align-items:flex-start"><div style="font-size:90px;line-height:1;padding:16px;border:4px dotted #f1c40f;border-radius:26px;margin-bottom:30px">🕹️</div><div style="font-size:44px;line-height:1.5;text-transform:uppercase;text-shadow:4px 4px 0 #333">Fast Collect Challenge</div></div>
<div class="rb" style="position:absolute;top:36px;right:170px;font-size:14px;color:#ddd"><span id="au-q">No account?</span> <a id="au-alt" href="#" style="color:#f1c40f;font-weight:700">Sign-up here</a></div>
<div class="rb" style="width:52%;display:flex;justify-content:center"><div style="width:360px;display:flex;flex-direction:column;gap:14px">
<input id="au-name" style="${inp}" placeholder="Username or email"><input id="au-pw" type="password" style="${inp}" placeholder="Password (6+ chars)">
<button id="au-main" style="padding:13px;border:0;border-radius:50px;background:#f1c40f;color:#000;font-size:15px;font-weight:700;cursor:pointer">Log in</button>
<div id="au-social" style="display:flex;flex-direction:column;gap:14px">${sBtn("au-google", "https://png.pngtree.com/png-vector/20230817/ourmid/pngtree-google-logo-vector-png-image_9183290.png", "Log-in with Google")}${sBtn("au-github", "https://cdn-icons-png.flaticon.com/512/25/25231.png", "Log-in with Github")}<a id="au-guest" href="#" style="color:#aaa;text-align:center;font-size:13px">Play as guest</a></div>
<div id="au-err" style="color:#ff6b6b;font-size:13px;min-height:16px;text-align:center"></div></div></div>`;
document.body.appendChild(ov);
if (window.makeLangSwitch) { const w = makeLangSwitch(); w.style.cssText = "top:20px;right:30px"; ov.appendChild(w); }
const err = e => $("au-err").textContent = (e && (e.code || e.message)) || String(e);
window.addEventListener("unhandledrejection", e => { console.error(e.reason); err(e.reason); });
window.addEventListener("error", e => err(e.message));
let mode = "login";
function setMode(m) {
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
        if ((await getDoc(doc(db, "usernames", n))).exists()) return err("Username already taken");
        pendingName = n; await createUserWithEmailAndPassword(auth, n + FAKE, pw);
      } else await signInWithEmailAndPassword(auth, n + FAKE, pw);
    }
  } catch (e) { pendingName = null; err(e); }
}
$("au-main").onclick = () => pseudoAuth(mode === "signup");
$("au-alt").onclick = e => { e.preventDefault(); setMode(mode === "signup" ? "login" : "signup"); };
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
const AV0 = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'><rect width='10' height='10' fill='%23f1c40f'/><text x='1.3' y='8' font-size='7.5'>👤</text></svg>";
let myPhoto = "";
const pf = document.createElement("div");
pf.style.cssText = "position:fixed;inset:0;z-index:9100;background:#000;border:10px solid #f1c40f;box-sizing:border-box;display:none;align-items:center;color:#f1c40f";
pf.innerHTML = `<div style="width:48%;padding:0 4%;box-sizing:border-box;display:flex;flex-direction:column;align-items:flex-start"><div style="font-size:90px;line-height:1;padding:16px;border:4px dotted #f1c40f;border-radius:26px;margin-bottom:30px">🕹️</div><div style="font-size:44px;line-height:1.5;text-transform:uppercase;text-shadow:4px 4px 0 #333">Fast Collect Challenge</div></div>
<div class="rb" style="width:52%;display:flex;justify-content:center"><div style="width:380px;display:flex;flex-direction:column;gap:14px">
<div id="pf-title" style="font-size:22px;font-weight:700;color:#fff;text-align:center;line-height:1.3"></div>
<div style="display:flex;justify-content:center"><img id="pf-prev" style="width:110px;height:110px;border-radius:50%;object-fit:cover;border:3px solid #f1c40f;background:#222"></div>
<input id="pf-name" style="${inp}" placeholder="Username (3-16: a-z, 0-9, _)"><input id="pf-photo" style="${inp}" placeholder="Profile picture URL (https://...)">
<label id="pf-imp-row" style="display:none;color:#ddd;font-size:13px"><input type="checkbox" id="pf-imp" checked> <span>Import my local progress</span> <b id="pf-imp-name"></b></label>
<button id="pf-ok" style="padding:13px;border:0;border-radius:50px;background:#f1c40f;color:#000;font-size:15px;font-weight:700;cursor:pointer"></button>
<a id="pf-close" href="#" style="color:#ddd;text-align:center;font-size:13px">Close</a><a id="pf-out" href="#" style="color:#aaa;text-align:center;font-size:13px">Log out</a>
<div id="pf-err" style="color:#ff6b6b;font-size:13px;min-height:16px;text-align:center"></div></div></div>`;
document.body.appendChild(pf);
if (window.makeLangSwitch) { const w = makeLangSwitch(); w.style.cssText = "top:20px;right:30px"; pf.appendChild(w); }
const pferr = m => $("pf-err").textContent = m ? (m.code || m.message || String(m)) : "";
function showPrev() {
  const im = $("pf-prev"), u = $("pf-photo").value.trim();
  im.onerror = () => { im.onerror = null; im.src = AV0; };
  im.src = /^https:\/\/\S+$/i.test(u) ? u : AV0;
}
$("pf-photo").oninput = showPrev;
function openProfilePage({ edit, name, photo, loc, submit, cancel }) {
  $("pf-title").textContent = edit ? "Edit your profile picture" : "Choose your username and profile picture";
  $("pf-ok").textContent = edit ? "Save" : "Continue";
  $("pf-name").value = name || ""; $("pf-name").disabled = !!edit; $("pf-photo").value = photo || ""; showPrev();
  $("pf-imp-row").style.display = loc ? "block" : "none"; if (loc) $("pf-imp-name").textContent = `(${loc.k})`;
  $("pf-close").style.display = edit ? "block" : "none"; pferr(""); pf.style.display = "flex";
  $("pf-ok").onclick = async () => {
    const n = clean($("pf-name").value), p = $("pf-photo").value.trim();
    if (!okName(n)) return pferr("Invalid username");
    if (p && !/^https:\/\/\S+$/i.test(p)) return pferr("Invalid picture URL (must start with https://)");
    try { await submit(n, p, $("pf-imp").checked); pf.style.display = "none"; }
    catch (e) { pferr(e.message === "taken" ? "Username already taken" : e); }
  };
  $("pf-close").onclick = e => { e.preventDefault(); pf.style.display = "none"; };
  $("pf-out").onclick = async e => { e.preventDefault(); await cancel(); pf.style.display = "none"; };
}
function setAvatar(url) {
  const b = $("account-settings-btn"); if (!b) return;
  const fb = '<div style="width:100%;height:100%;border-radius:50%;background:#f1c40f;color:#000;display:flex;align-items:center;justify-content:center;font-size:calc(26*var(--u))">👤</div>';
  b.innerHTML = url ? '<img style="width:100%;height:100%;border-radius:50%;object-fit:cover;border:calc(3*var(--u)) solid #f1c40f;box-sizing:border-box;background:#222">' : fb;
  if (url) { const im = b.firstChild; im.onerror = () => { b.innerHTML = fb; }; im.src = url; }
}

const readLocal = () => {
  try { const a = JSON.parse(localStorage.getItem("fastCollect_accounts") || "null"), k = localStorage.getItem("fastCollect_activeAccount"); return a && a[k] ? { k, d: a[k] } : null; }
  catch (e) { return null; }
};
const claim = (user, name, photo, init) => runTransaction(db, async t => {
  const u = doc(db, "usernames", name);
  if ((await t.get(u)).exists()) throw new Error("taken");
  t.set(u, { uid: user.uid });
  t.set(doc(db, "users", user.uid), { username: name, photo, rev: 1, data: init });
});
const suggest = u => clean((u.displayName || u.email || "").split("@")[0]).replace(/[^a-z0-9_]/g, "_").slice(0, 16);

async function ensureProfile(user) {
  if ((await getDoc(doc(db, "users", user.uid))).exists()) return true;
  const loc = readLocal(), chosen = pendingName; pendingName = null;
  if (user.isAnonymous || chosen) { // invité ou pseudo+mot de passe : pas de page de choix
    let init = fresh();
    if (loc && confirm(`Import your local progress from "${loc.k}"?`)) init = normalize(loc.d);
    for (let i = 0; i < 5; i++) {
      const name = chosen || "guest" + Math.floor(1000 + Math.random() * 9000);
      try { await claim(user, name, "", init); return true; }
      catch (e) { if (e.message !== "taken") throw e; if (chosen) { err("Username already taken"); break; } }
    }
    await signOut(auth); return false;
  }
  // Google / GitHub / e-mail : page « Choose your username and profile picture »
  return new Promise(res => openProfilePage({
    edit: false, name: suggest(user), photo: user.photoURL || "", loc,
    submit: async (n, p, imp) => { await claim(user, n, p, imp && loc ? normalize(loc.d) : fresh()); res(true); },
    cancel: async () => { await signOut(auth); res(false); }
  }));
}

function applyRemote(v) {
  rev = v.rev; username = v.username; myPhoto = v.photo || ""; setAvatar(myPhoto);
  accounts = { [username]: normalize(v.data) }; currentAccountName = username;
  updateAdventureHUD();
}

/* ---------- sauvegarde cloud (remplace saveAllAccounts) ---------- */
async function saveNow() {
  if (!me) return;
  if (saving) { dirty = true; clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 1500); return; }
  if (!dirty) return;
  saving = true; dirty = false;
  const ref = doc(db, "users", me);
  try {
    let conflict = null;
    await runTransaction(db, async t => {
      conflict = null;
      const v = (await t.get(ref)).data();
      if (v.rev !== rev) { conflict = v; return; }
      t.update(ref, { data: accounts[currentAccountName], rev: rev + 1 });
    });
    if (conflict) applyRemote(conflict); else rev++;
  } catch (e) { dirty = true; console.error("save failed", e); }
  saving = false;
}
window.saveAllAccounts = function () { updateAdventureHUD(); if (!me) return; dirty = true; clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 2000); };
const _leave = window.leaveGame;
window.leaveGame = function () { _leave(); saveNow(); };
window.openAccountModal = () => me && openProfilePage({
  edit: true, name: username, photo: myPhoto,
  submit: async (n, p) => { await updateDoc(doc(db, "users", me), { photo: p }); myPhoto = p; setAvatar(p); },
  cancel: async () => { await saveNow(); await signOut(auth); }
});
document.addEventListener("visibilitychange", () => { if (document.hidden) saveNow(); });
window.addEventListener("pagehide", saveNow);

/* ---------- Trade : UI ---------- */
const trBtn = document.createElement("button");
trBtn.className = "side-btn no-img"; trBtn.style.position = "relative";
trBtn.innerHTML = '<span class="side-btn-label" style="font-size:8px">Trade</span><span id="tr-badge" style="display:none;position:absolute;top:-6px;right:-6px;min-width:20px;height:20px;line-height:20px;border-radius:10px;background:#e84118;color:#fff;font-size:9px;text-align:center"></span>';
$("side-buttons").appendChild(trBtn);
const tr = document.createElement("div");
tr.style.cssText = "position:fixed;top:5vh;left:5vw;width:90vw;height:90vh;background:rgba(0,0,0,.75);z-index:1000;border-radius:25px;border:3px solid rgba(255,255,255,.2);backdrop-filter:blur(8px);display:none;flex-direction:column;padding:30px;box-sizing:border-box;color:#fff;overflow-y:auto;font-size:10px;line-height:1.8";
tr.innerHTML = `<div class="screen-header"><h2 class="inv-title-text" style="color:#D9BFF2">TRADE</h2><button class="close-screen-btn" id="tr-close">Close ✖</button></div>
  <div style="display:flex;gap:30px;flex-wrap:wrap">
    <div style="flex:1;min-width:300px"><div style="color:#7ed6df;margin-bottom:8px">New offer</div>
      <input id="tr-to" class="sell-input" style="width:100%;box-sizing:border-box" placeholder="Player username">
      <div style="margin:12px 0 4px">You give:</div><div id="tr-give-pick"></div><div id="tr-give-list"></div>
      <div style="margin:12px 0 4px">You ask:</div><div id="tr-ask-pick"></div><div id="tr-ask-list"></div>
      <div style="margin-top:14px"><button class="acc-btn" id="tr-send">Send offer</button> <span id="tr-msg" style="color:#ff6b6b"></span></div></div>
    <div style="flex:1;min-width:300px"><div style="color:#7ed6df;margin-bottom:8px">Received</div><div id="tr-in"></div>
      <div style="color:#7ed6df;margin:18px 0 8px">Sent</div><div id="tr-out"></div></div></div>`;
document.body.appendChild(tr);

const opts = () => ["money", ...APPLE_ORDER.map(t => "apple:" + t), ...SHOP_PRODUCTS.map(p => "potion:" + p.id)]
  .map(k => `<option value="${k}">${esc(label(k))}</option>`).join("");
["give", "ask"].forEach(side => {
  $(`tr-${side}-pick`).innerHTML = `<select class="sell-input" style="width:55%;font-size:9px">${opts()}</select> <input class="sell-input" style="width:25%" placeholder="Qty"> <button class="acc-btn">Add</button>`;
  const [sel, qty, add] = $(`tr-${side}-pick`).children;
  add.onclick = () => {
    const n = parseInt(qty.value); if (!(n > 0)) return;
    draft[side][sel.value] = (draft[side][sel.value] || 0) + n; qty.value = ""; renderDraft();
  };
});
function renderDraft() {
  ["give", "ask"].forEach(side => {
    const box = $(`tr-${side}-list`); box.innerHTML = "";
    Object.entries(draft[side]).forEach(([k, n]) => {
      const b = document.createElement("button"); b.className = "acc-btn"; b.textContent = `${fmtNum(n)}× ${label(k)} ✖`;
      b.onclick = () => { delete draft[side][k]; renderDraft(); }; box.appendChild(b);
    });
  });
}
function renderTrades() {
  const card = (t, inc) => `<div style="background:rgba(255,255,255,.1);border-radius:12px;padding:12px;margin-bottom:10px">
    <b>${esc(inc ? t.fromName : t.toName)}</b> ${T(inc ? "offers" : "gets")}: ${describe(t.give)}<br>${T("in return")}: ${describe(t.ask)}<br>
    ${inc ? `<button class="acc-btn" data-a="accept" data-id="${t.id}">Accept</button><button class="acc-btn danger" data-a="decline" data-id="${t.id}">Decline</button>`
          : `<button class="acc-btn danger" data-a="cancel" data-id="${t.id}">Cancel</button>`}</div>`;
  $("tr-in").innerHTML = inbox.map(t => card(t, true)).join("") || "-";
  $("tr-out").innerHTML = outbox.map(t => card(t, false)).join("") || "-";
  $("tr-badge").style.display = inbox.length ? "block" : "none"; $("tr-badge").textContent = inbox.length;
}
tr.addEventListener("click", e => {
  const b = e.target.closest("[data-a]"); if (!b) return;
  const t = [...inbox, ...outbox].find(x => x.id === b.dataset.id); if (!t) return;
  if (b.dataset.a === "accept") acceptTrade(t);
  else updateDoc(doc(db, "trades", t.id), { status: b.dataset.a === "decline" ? "declined" : "cancelled" }).catch(x => toast(x.message));
});
trBtn.onclick = () => {
  ["inventory-screen", "shop-screen", "index-screen"].forEach(i => $(i).style.display = "none");
  gameActive = false; tr.style.display = "flex"; renderDraft(); renderTrades();
};
$("tr-close").onclick = () => { tr.style.display = "none"; if (!gameActive) { gameActive = true; update(); } };

/* ---------- Trade : logique ---------- */
async function sendOffer() {
  const msg = $("tr-msg"); msg.textContent = "";
  const n = clean($("tr-to").value), { give, ask } = draft;
  if (!n) { msg.textContent = "Enter a username"; return; }
  if (!Object.keys(give).length && !Object.keys(ask).length) { msg.textContent = "Empty offer"; return; }
  const mine = accounts[currentAccountName];
  for (const [k, q] of Object.entries(give)) if (getQ(mine, k) < q) { msg.textContent = "You don't have enough: " + label(k); return; }
  try {
    const u = await getDoc(doc(db, "usernames", n));
    if (!u.exists()) { msg.textContent = "Player not found"; return; }
    if (u.data().uid === me) { msg.textContent = "That's you!"; return; }
    await addDoc(collection(db, "trades"), { from: me, fromName: username, to: u.data().uid, toName: n, give, ask, status: "pending", createdAt: serverTimestamp() });
    draft = { give: {}, ask: {} }; renderDraft(); toast("Offer sent!");
  } catch (e) { msg.textContent = e.message; }
}
$("tr-send").onclick = sendOffer;

async function acceptTrade(t) {
  try {
    await saveNow(); // envoie d'abord ma progression locale
    await runTransaction(db, async x => {
      const tRef = doc(db, "trades", t.id), fRef = doc(db, "users", t.from), oRef = doc(db, "users", t.to);
      const [ts, fs, os] = await Promise.all([x.get(tRef), x.get(fRef), x.get(oRef)]);
      const T = ts.data(), F = fs.data(), O = os.data();
      if (T.status !== "pending") throw new Error("This offer is no longer available");
      if (!isOffer(T.give) || !isOffer(T.ask)) throw new Error("Invalid offer");
      const fd = normalize(F.data), od = normalize(O.data);
      for (const [k, n] of Object.entries(T.give)) { if (getQ(fd, k) < n) throw new Error(F.username + " no longer has the offered items"); addQ(fd, k, -n); addQ(od, k, n); }
      for (const [k, n] of Object.entries(T.ask)) { if (getQ(od, k) < n) throw new Error("You don't have the requested items"); addQ(od, k, -n); addQ(fd, k, n); }
      x.update(fRef, { data: fd, rev: F.rev + 1, lastTradeId: t.id });
      x.update(oRef, { data: od, rev: O.rev + 1, lastTradeId: t.id });
      x.update(tRef, { status: "accepted" });
    });
    toast("Trade completed!");
  } catch (e) { toast(e.message); }
}

/* ---------- session ---------- */
onAuthStateChanged(auth, async user => {
  unsubs.forEach(u => u()); unsubs = []; loaded = false; inbox = []; outbox = [];
  if (!user) {
    if (me) { me = null; try { leaveGame(); } catch (e) {} }
    ov.style.display = "flex"; return;
  }
  try { if (!(await ensureProfile(user))) return; } catch (e) { err(e); ov.style.display = "flex"; return; }
  me = user.uid;
  unsubs.push(onSnapshot(doc(db, "users", me), s => {
    if (!s.exists()) return; const v = s.data();
    if (!loaded || (!saving && v.rev > rev)) {
      try { applyRemote(v); loaded = true; ov.style.display = "none"; } catch (e) { err(e); console.error(e); }
    }
  }, e => { err(e); console.error(e); }));
  let first = true;
  unsubs.push(onSnapshot(query(collection(db, "trades"), where("to", "==", me), where("status", "==", "pending")), s => {
    inbox = s.docs.map(d => ({ id: d.id, ...d.data() }));
    if (!first && s.docChanges().some(c => c.type === "added")) toast("New trade offer!");
    first = false; renderTrades();
  }));
  unsubs.push(onSnapshot(query(collection(db, "trades"), where("from", "==", me), where("status", "==", "pending")), s => {
    outbox = s.docs.map(d => ({ id: d.id, ...d.data() })); renderTrades();
  }));
});

window.addEventListener("langchange", () => {
  tr.querySelectorAll("select").forEach(el => { const v = el.value; el.innerHTML = opts(); el.value = v; });
  renderDraft(); renderTrades();
});
