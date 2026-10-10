// firebase-trade.js : comptes Firebase + sauvegarde cloud + Trade (boîte aux lettres)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, signInAnonymously, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, GithubAuthProvider, linkWithCredential, signInWithCredential } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, runTransaction, collection, query, where, onSnapshot,
  addDoc, updateDoc, serverTimestamp, getDocs, documentId, limit, deleteField, arrayRemove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
const LOGO = "https://raw.githubusercontent.com/FastCollectChallenge/play/main/Fast%20Collect%20Challenge%20Ingame%20logo.png";
const clean = s => (s || "").trim().toLowerCase();
const okName = s => /^[a-z0-9_]{3,16}$/.test(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const T = s => (window.T ? window.T(s) : s);
// Ce module ES ne peut pas lire les const du script classique index.html.
const APPLE_FIELDS = { red:'redApples', green:'greenApples', golden:'goldenApples', diamond:'diamondApples', candy:'candyApples', lava:'lavaApples', galaxy:'galaxyApples', dark:'darkApples', moony:'moonyApples', salhini:'salhiniApples', bloodmoon:'bloodmoonApples', cheezy:'cheezyApples', sand:'sandApples', amethyst:'amethystApples', ice:'iceApples', sapphire:'sapphireApples', rainbow:'rainbowApples', canneloni:'canneloniApples' };
const APPLE_NAMES = { red:'Red Apple', green:'Green Apple', golden:'Golden Apple', diamond:'Diamond Apple', candy:'Candy Apple', lava:'Lava Apple', galaxy:'Galaxy Apple', dark:'Dark Apple', moony:'Moony Apple', salhini:'Salhini Appelini', bloodmoon:'Bloodmoon Apple', cheezy:'Cheezy Apple', sand:'Sand Apple', amethyst:'Amethyst Apple', ice:'Ice Apple', sapphire:'Sapphire Apple', rainbow:'Rainbow Apple', canneloni:'Apple Canneloni' };
const SHOP_PRODUCTS = [{id:'pot_x2_30',multiplier:2,duration:30},{id:'pot_x2_60',multiplier:2,duration:60},{id:'pot_x4_30',multiplier:4,duration:30},{id:'pot_x4_60',multiplier:4,duration:60},{id:'pot_x6_25',multiplier:6,duration:25},{id:'pot_x6_45',multiplier:6,duration:45},{id:'pot_x8_20',multiplier:8,duration:20},{id:'pot_x8_40',multiplier:8,duration:40},{id:'pot_x8_60',multiplier:8,duration:60},{id:'pot_x10_15',multiplier:10,duration:15},{id:'pot_x10_30',multiplier:10,duration:30}];
const toast = m => showAdvancedMsg(T(m), "top", { color: "white" });
const toastG = m => showAdvancedMsg(T(m), "top", { color: "#2ecc71" });

let me = null, username = "", rev = 0, loaded = false, saving = false, dirty = false, saveTimer = null;
let unsubs = [], pendingName = null, inbox = [], outbox = [], draft = { give: {}, ask: {} };

// si <script src="i18n.js"> manque dans index.html, on le charge ici (boutons EN/FR + traduction)
if (!window.makeLangSwitch) await new Promise(r => { const sc = document.createElement("script"); sc.src = "i18n.js"; sc.onload = sc.onerror = r; document.head.appendChild(sc); });

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
  [/^Ready$/, "Prêt"], [/^Not ready$/, "Pas prêt"], [/^Invalid offer$/, "Offre invalide"],
  [/^Press Ready when your offer is final$/, "Appuie sur Prêt quand ton offre est finale"],
  [/^Waiting for (@\S+) to be ready\.\.\.$/, "En attente que $1 soit prêt..."],
  [/^Waiting for (@\S+) to confirm\.\.\.$/, "En attente de la confirmation de $1..."],
  [/^Both ready! Press Confirm$/, "Les deux sont prêts ! Appuie sur Confirmer"],
  [/^Completing in (\d+)s\.\.\.$/, "Fin de l'échange dans $1s..."],
  [/^Trade with (@\S+) completed!$/, "Échange avec $1 terminé !"],
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
const AV0 = "https://raw.githubusercontent.com/FastCollectChallenge/play/main/Fast%20Collect%20Challenge.png";
let myPhoto = "";
const pf = document.createElement("div"); pf.id = "profile-page";
pf.style.cssText = "position:fixed;inset:0;z-index:9100;background:#000;border:10px solid #f1c40f;box-sizing:border-box;display:none;align-items:center;color:#f1c40f";
pf.innerHTML = `<div style="width:48%;padding:0 3%;box-sizing:border-box;display:flex;flex-direction:row;align-items:center;gap:24px"><img src="${LOGO}" style="width:120px;height:120px;object-fit:contain;flex:none"><div style="font-size:40px;line-height:1.5;text-transform:uppercase;text-shadow:4px 4px 0 #333">Fast Collect Challenge</div></div>
<div class="rb" style="width:52%;display:flex;justify-content:center"><div style="width:380px;display:flex;flex-direction:column;gap:14px">
<div id="pf-title" style="font-size:22px;font-weight:700;color:#fff;text-align:center;line-height:1.3"></div>
<div style="display:flex;justify-content:center"><img id="pf-prev" style="width:110px;height:110px;border-radius:50%;object-fit:cover;border:3px solid #f1c40f;background:#222"></div>
<input id="pf-name" style="${inp}" placeholder="Username (3-16: a-z, 0-9, _)"><input id="pf-photo" style="${inp}" placeholder="Profile picture URL (https://...)">
<label id="pf-imp-row" style="display:none;color:#ddd;font-size:13px"><input type="checkbox" id="pf-imp" checked> <span>Import my local progress</span> <b id="pf-imp-name"></b></label>
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
function openProfilePage({ edit, noName, name, photo, loc, submit, cancel }) {
  $("pf-title").textContent = edit ? "Edit your profile picture" : noName ? "Choose your profile picture" : "Choose your username and profile picture";
  $("pf-ok").textContent = edit ? "Save" : "Continue";
  $("pf-name").value = name || ""; $("pf-name").disabled = !!edit; $("pf-name").style.display = noName ? "none" : ""; $("pf-photo").value = photo || ""; showPrev();
  $("pf-imp-row").style.display = loc ? "block" : "none"; if (loc) $("pf-imp-name").textContent = `(${loc.k})`;
  $("pf-close").style.display = edit ? "block" : "none"; $("pf-lang").style.display = edit ? "flex" : "none"; $("pf-out").textContent = edit && auth.currentUser && auth.currentUser.isAnonymous ? "Log in / Sign up" : "Log out"; pferr(""); pf.style.display = "flex";
  $("pf-ok").onclick = async () => {
    const n = noName ? name : clean($("pf-name").value), p = $("pf-photo").value.trim();
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
  b.innerHTML = '<img style="width:100%;height:100%;border-radius:50%;object-fit:cover;border:calc(3*var(--u)) solid #f1c40f;box-sizing:border-box;background:#222">';
  const im = b.firstChild; im.onerror = () => { im.onerror = null; im.src = AV0; }; im.src = url || AV0;
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
  if (user.isAnonymous) { // invité : pas de page, pseudo guestXXXX
    let init = fresh();
    if (loc && confirm(`Import your local progress from "${loc.k}"?`)) init = normalize(loc.d);
    for (let i = 0; i < 5; i++) {
      try { await claim(user, "guest" + Math.floor(1000 + Math.random() * 9000), "", init); return true; }
      catch (e) { if (e.message !== "taken") throw e; }
    }
    await signOut(auth); return false;
  }
  // Toute création de compte : page de profil (pseudo + mot de passe : photo seule, sans champ pseudo)
  return new Promise(res => openProfilePage({
    edit: false, noName: !!chosen, name: chosen || suggest(user), photo: user.photoURL || "", loc,
    submit: async (n, p, imp) => { await claim(user, n, p, imp && loc ? normalize(loc.d) : fresh()); res(true); },
    cancel: async () => { await signOut(auth); res(false); }
  }));
}

function applyRemote(v) {
  rev = v.rev; username = v.username; myPhoto = v.photo || ""; setAvatar(myPhoto); if (window.autosellReset) window.autosellReset();
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
  cancel: async () => { await saveNow(); manualLogout = true; await signOut(auth); }
});
document.addEventListener("visibilitychange", () => { if (document.hidden) saveNow(); });
window.addEventListener("pagehide", saveNow);

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
const beat = () => { if (me) updateDoc(doc(db, "users", me), { lastSeen: serverTimestamp() }).catch(() => {}); };
const recent = t => !t.createdAt || Date.now() - t.createdAt.toMillis() < 120000;

trBtn.onclick = () => {
  ["inventory-screen", "shop-screen", "index-screen"].forEach(i => $(i).style.display = "none");
  tr.style.display = "flex"; $("tr-user").value = ""; $("tr-results").innerHTML = HINT; $("tr-user").focus();
};
$("tr-close").onclick = () => { tr.style.display = "none"; };

/* recherche en direct */
let searchTimer = null, searchSeq = 0;
$("tr-user").oninput = () => { clearTimeout(searchTimer); searchTimer = setTimeout(doSearch, 300); };
async function doSearch() {
  const q = clean($("tr-user").value).replace(/^@/, ""), box = $("tr-results"), seq = ++searchSeq;
  if (!q) { box.innerHTML = HINT; return; }
  try {
    const snap = await getDocs(query(collection(db, "usernames"), where(documentId(), ">=", q), where(documentId(), "<=", q + "\uf8ff"), limit(5)));
    const ids = snap.docs.map(d => d.data().uid).filter(u => u !== me);
    const users = await Promise.all(ids.map(u => getDoc(doc(db, "users", u))));
    if (seq !== searchSeq) return;
    box.textContent = "";
    const found = users.filter(u => u.exists());
    if (!found.length) { box.innerHTML = '<div class="tr-hint">No player found</div>'; return; }
    found.forEach(u => box.appendChild(playerRow(u.id, u.data())));
  } catch (e) { box.textContent = e.code || e.message; }
}
function playerRow(uid, u) {
  const on = !!u.lastSeen && Date.now() - u.lastSeen.toMillis() < 100000;
  const r = document.createElement("div"); r.className = "tr-row";
  const img = new Image(); img.className = "tr-av"; img.onerror = () => { img.onerror = null; img.src = AV0; }; img.src = u.photo || AV0;
  const mid = document.createElement("div"); mid.className = "tr-mid";
  const nm = document.createElement("div"); nm.className = "tr-name"; nm.textContent = "@" + u.username;
  const st = document.createElement("div"); st.textContent = on ? "Online" : "Offline"; st.style.color = on ? "#2ecc71" : "#e74c3c";
  mid.append(nm, st);
  const b = document.createElement("button"); b.className = "tr-send"; b.textContent = "Send Trade"; b.disabled = !on;
  b.onclick = () => sendRequest(uid, u.username, b);
  r.append(img, mid, b); return r;
}
async function sendRequest(uid, uname, btn) {
  if (outbox.some(t => t.to === uid && recent(t))) return toast("Request already pending");
  btn.disabled = true;
  try {
    await addDoc(collection(db, "trades"), { from: me, fromName: username, to: uid, toName: uname, give: {}, ask: {}, offers: {}, status: "pending", createdAt: serverTimestamp() });
    btn.textContent = "Request sent"; toast("Trade request sent!");
  } catch (e) { btn.disabled = false; toast(e.message); }
}

/* demandes reçues : mini pop-up en bas à droite */
const shown = new Map(), dismissed = new Set();
function renderIncoming(list) {
  const ids = new Set();
  list.forEach(t => {
    if (!recent(t) || dismissed.has(t.id)) return;
    ids.add(t.id); if (!shown.has(t.id)) shown.set(t.id, makeToast(t));
  });
  shown.forEach((el, id) => { if (!ids.has(id)) { el.remove(); shown.delete(id); } });
}
function makeToast(t) {
  const c = document.createElement("div"); c.className = "tr-toast rb";
  const m = document.createElement("div"), b = document.createElement("b"), sp = document.createElement("span");
  b.textContent = "@" + t.fromName; sp.textContent = " sent you a trade request"; m.append(b, sp);
  const row = document.createElement("div"); row.className = "tr-btns";
  const ac = document.createElement("button"), de = document.createElement("button");
  ac.className = "tr-acc"; ac.textContent = "Accept"; de.className = "tr-dec"; de.textContent = "Decline";
  ac.onclick = () => respond(t, "accepted"); de.onclick = () => respond(t, "declined");
  row.append(ac, de); c.append(m, row); trToasts.appendChild(c);
  setTimeout(() => { dismissed.add(t.id); c.remove(); shown.delete(t.id); }, 30000);
  return c;
}
async function respond(t, status) {
  dismissed.add(t.id); const el = shown.get(t.id); if (el) el.remove(); shown.delete(t.id);
  try { await updateDoc(doc(db, "trades", t.id), { status }); toast(status === "accepted" ? "Trade request accepted" : "Trade request declined"); }
  catch (e) { toast(e.message); }
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

let cur = null, curUnsub = null, twTimer = null, sigLast = "", addType = null, addQty = 0, addMax = 0;
const owned = t => (accounts[currentAccountName] || {})[APPLE_FIELDS[t]] || 0;
const offerOf = (uid, t) => (cur && cur.offers && cur.offers[uid] && cur.offers[uid][t]) || 0;
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
  const other = cur.from === me ? cur.to : cur.from;
  const sig = JSON.stringify([cur.offers || {}, APPLE_ORDER.map(owned)]);
  if (sig === sigLast) return; sigLast = sig;
  const mine = $("tw-mine"), theirs = $("tw-theirs"); mine.innerHTML = ""; theirs.innerHTML = "";
  const hint = m => `<div class="tw-hint">${m}</div>`;
  APPLE_ORDER.forEach(t => { if (owned(t) > 0 || offerOf(me, t) > 0) mine.appendChild(twCard(t, offerOf(me, t), () => openAdd(t))); });
  if (!mine.children.length) mine.innerHTML = hint("You have no apples");
  APPLE_ORDER.forEach(t => { if (offerOf(other, t) > 0) theirs.appendChild(twCard(t, offerOf(other, t))); });
  if (!theirs.children.length) theirs.innerHTML = hint("Nothing yet");
}
function openTrading(t) {
  if (cur) return;
  cur = t; sigLast = "";
  const other = t.from === me ? t.toName : t.fromName;
  $("tw-title").textContent = "Trading with @" + other;
  $("tw-their-title").textContent = "@" + other + "'s offer";
  ["inventory-screen", "shop-screen", "index-screen"].forEach(i => $(i).style.display = "none");
  tr.style.display = "none"; tw.style.display = "flex"; renderTrading();
  curUnsub = onSnapshot(doc(db, "trades", t.id), s => {
    if (!s.exists()) return stopTrading();
    cur = { id: s.id, ...s.data() };
    if (cur.status === "completed") { applyTrade({ id: cur.id }); toastG(`Trade with @${other} completed!`); return stopTrading(); }
    if (cur.status !== "accepted") { if (cur.cancelledBy !== me) toastG("@" + other + " cancelled the trade"); return stopTrading(); }
    renderTrading();
  });
  twTimer = setInterval(renderTrading, 1500);
}
function stopTrading() {
  if (curUnsub) curUnsub(); curUnsub = null; clearInterval(twTimer); cur = null;
  tw.style.display = "none"; am2.style.display = "none";
}
$("trading-close").onclick = () => {
  const id = cur && cur.id; stopTrading();
  if (id) updateDoc(doc(db, "trades", id), { status: "cancelled" }).catch(() => {});
};
const setAdd = n => { addQty = Math.max(0, Math.min(addMax, n)); $("add-num").textContent = addQty; };
function openAdd(type) {
  addType = type; addMax = owned(type); $("add-name").textContent = APPLE_NAMES[type];
  setAdd(offerOf(me, type)); am2.style.display = "flex";
}
am2.addEventListener("click", e => {
  const b = e.target.closest("[data-d]"); if (!b) return; const d = b.dataset.d;
  setAdd(d === "none" ? 0 : d === "all" ? addMax : addQty + parseInt(d));
});
$("add-cancel").onclick = () => { am2.style.display = "none"; };
/* ---------- Trade : Ready / Confirm / 5 s ---------- */
const CD_MS = 5000, applying = new Set();
let cdStart = 0, cdDone = false;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const flag = (t, k, uid) => !!(t[k] && t[k][uid]);
const lacking = o => Object.keys(o).find(t => owned(t) < o[t]);
const offerOfDoc = (t, uid) => (t.offers && t.offers[uid]) || {};

function renderFooter() {
  if (!cur) return;
  const other = cur.from === me ? cur.to : cur.from, on = cur.from === me ? cur.toName : cur.fromName;
  const rMe = flag(cur, "ready", me), rOt = flag(cur, "ready", other), cMe = flag(cur, "confirm", me), cOt = flag(cur, "confirm", other);
  const st = $("tw-state"), main = $("tw-main"), cn = $("tw-cancel");
  cn.style.display = "none"; main.style.display = ""; main.style.background = "#27ae60";
  if (cMe && cOt) { main.style.display = "none"; cn.style.display = ""; }
  else if (cMe) { st.textContent = `Waiting for @${on} to confirm...`; main.textContent = "Cancel"; main.style.background = "#c23616"; main.dataset.a = "unconfirm"; }
  else if (rMe && rOt) { st.textContent = "Both ready! Press Confirm"; main.textContent = "Confirm"; main.dataset.a = "confirm"; }
  else if (rMe) { st.textContent = `Waiting for @${on} to be ready...`; main.textContent = "Not ready"; main.style.background = "#7f8c8d"; main.dataset.a = "unready"; }
  else { st.textContent = "Press Ready when your offer is final"; main.textContent = "Ready"; main.dataset.a = "ready"; }
}
const tradeUpd = patch => updateDoc(doc(db, "trades", cur.id), patch).catch(e => toast(e.message));
$("tw-main").onclick = () => {
  if (!cur) return; const a = $("tw-main").dataset.a, other = cur.from === me ? cur.to : cur.from, mine = offerOfDoc(cur, me);
  if (a === "ready") {
    if (!Object.keys(mine).length && !Object.keys(offerOfDoc(cur, other)).length) return toast("Empty offer");
    const l = lacking(mine); if (l) return toast("You don't have enough: " + APPLE_NAMES[l]);
    tradeUpd({ [`ready.${me}`]: true });
  } else if (a === "unready") tradeUpd({ [`ready.${me}`]: false, [`confirm.${me}`]: false });
  else if (a === "confirm") {
    const l = lacking(mine); if (l) return toast("You don't have enough: " + APPLE_NAMES[l]);
    tradeUpd({ [`confirm.${me}`]: true });
  } else if (a === "unconfirm") cancelConfirm();
};
$("tw-cancel").onclick = () => cancelConfirm();

async function cancelConfirm() {
  if (!cur) return; const id = cur.id; cdStart = 0;
  try {
    await runTransaction(db, async tx => {
      const r = doc(db, "trades", id), t = (await tx.get(r)).data();
      if (!t || t.status !== "accepted") return;
      tx.update(r, { [`confirm.${me}`]: false, ok: {} });
    });
  } catch (e) { toast(e.message); }
}

setInterval(() => {
  if (!cur || cur.status !== "accepted") { cdStart = 0; return; }
  const other = cur.from === me ? cur.to : cur.from;
  if (!(flag(cur, "confirm", me) && flag(cur, "confirm", other))) { cdStart = 0; return; }
  if (!cdStart) { cdStart = Date.now(); cdDone = false; }
  const left = Math.ceil((CD_MS - (Date.now() - cdStart)) / 1000);
  if (left > 0) { $("tw-state").textContent = `Completing in ${left}s...`; return; }
  if (!cdDone) { cdDone = true; markOk(cur.id); }
}, 250);

async function markOk(id) {
  let short = null, bad = false;
  try {
    await runTransaction(db, async tx => {
      short = null; bad = false;
      const r = doc(db, "trades", id), t = (await tx.get(r)).data();
      if (!t || t.status !== "accepted" || !flag(t, "confirm", t.from) || !flag(t, "confirm", t.to)) return;
      const other = t.from === me ? t.to : t.from;
      short = lacking(offerOfDoc(t, me));
      if (short) { tx.update(r, { status: "cancelled", cancelledBy: me }); return; }
      if (t.ok && t.ok[other]) {
        const od = normalize(((await tx.get(doc(db, "users", other))).data() || {}).data), go = offerOfDoc(t, other);
        if (Object.entries(go).some(([k, n]) => !APPLE_FIELDS[k] || !Number.isInteger(n) || n <= 0 || (od[APPLE_FIELDS[k]] || 0) < n)) { bad = true; tx.update(r, { status: "cancelled", cancelledBy: me }); return; }
        tx.update(r, { ok: { ...t.ok, [me]: true }, status: "completed", unapplied: [t.from, t.to] });
      } else tx.update(r, { ok: { ...(t.ok || {}), [me]: true } });
    });
    if (short) toast("You don't have enough: " + APPLE_NAMES[short]);
    if (bad) toast("Invalid offer");
  } catch (e) { toast(e.message); }
}

async function applyTrade(t) {
  if (applying.has(t.id)) return; applying.add(t.id);
  try {
    for (let i = 0; saving && i < 50; i++) await sleep(200);
    dirty = true; await saveNow();
    await runTransaction(db, async tx => {
      const tr = doc(db, "trades", t.id), ur = doc(db, "users", me);
      const td = (await tx.get(tr)).data(), v = (await tx.get(ur)).data();
      if (!td || !(td.unapplied || []).includes(me)) return;
      const other = td.from === me ? td.to : td.from, d = normalize(v.data);
      const give = offerOfDoc(td, me), get = offerOfDoc(td, other);
      const valid = o => Object.entries(o).every(([k, n]) => APPLE_FIELDS[k] && Number.isInteger(n) && n > 0);
      if (!valid(give) || !valid(get)) throw new Error("Invalid offer");
      for (const [k, n] of Object.entries(give)) if ((d[APPLE_FIELDS[k]] || 0) < n) throw new Error("You don't have enough items");
      for (const [k, n] of Object.entries(give)) d[APPLE_FIELDS[k]] -= n;
      for (const [k, n] of Object.entries(get)) { d[APPLE_FIELDS[k]] = (d[APPLE_FIELDS[k]] || 0) + n; d.discovered[k] = true; }
      tx.update(ur, { data: d, rev: v.rev + 1 });
      tx.update(tr, { unapplied: arrayRemove(me) });
    });
  } catch (e) { toast(e.message); }
  applying.delete(t.id);
}
$("add-ok").onclick = async () => {
  const id = cur && cur.id; am2.style.display = "none"; if (!id) return;
  try { await updateDoc(doc(db, "trades", id), { [`offers.${me}.${addType}`]: addQty > 0 ? addQty : deleteField(), ready: {}, confirm: {}, ok: {} }); }
  catch (e) { toast(e.message); }
};

/* ---------- invité automatique + Google One Tap ---------- */
const GCLIENT = "357477145806-jagr0f20lv71eef6tj61e37lhdv4bd4h.apps.googleusercontent.com";
let manualLogout = false, gisReady = false;
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
          if (pic && !myPhoto) { await updateDoc(doc(db, "users", u.uid), { photo: pic }); myPhoto = pic; setAvatar(pic); }
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
  unsubs.forEach(u => u()); unsubs = []; loaded = false; inbox = []; outbox = []; stopTrading();
  if (!user) {
    if (me) { me = null; try { leaveGame(); } catch (e) {} }
    if (!manualLogout) { signInAnonymously(auth).catch(e => { err(e); ov.style.display = "flex"; }); return; } // invité automatique
    ov.style.display = "flex"; return;
  }
  manualLogout = false;
  try { if (!(await ensureProfile(user))) return; } catch (e) { err(e); ov.style.display = "flex"; return; }
  me = user.uid; beat(); const hb = setInterval(beat, 45000); unsubs.push(() => clearInterval(hb));
    unsubs.push(onSnapshot(query(collection(db, "trades"), where("unapplied", "array-contains", me)), s => {
    s.docs.forEach(d => { const t = { id: d.id, ...d.data() }; if (t.status === "completed") applyTrade(t); });
  }));
  unsubs.push(onSnapshot(doc(db, "users", me), s => {
    if (!s.exists()) return; const v = s.data();
    if (!loaded || (!saving && v.rev > rev)) {
      try { applyRemote(v); loaded = true; ov.style.display = "none"; boot.style.display = "none"; promptOneTap(); } catch (e) { err(e); console.error(e); }
    }
  }, e => { err(e); console.error(e); }));
  unsubs.push(onSnapshot(query(collection(db, "trades"), where("to", "==", me), where("status", "==", "pending")), s => {
    inbox = s.docs.map(d => ({ id: d.id, ...d.data() })); renderIncoming(inbox);
  }));
  unsubs.push(onSnapshot(query(collection(db, "trades"), where("from", "==", me), where("status", "==", "pending")), s => {
    outbox = s.docs.map(d => ({ id: d.id, ...d.data() }));
  }));
  ["to", "from"].forEach(k => unsubs.push(onSnapshot(query(collection(db, "trades"), where(k, "==", me), where("status", "==", "accepted")), s => {
    s.docChanges().forEach(c => {
      if (c.type !== "added") return; const t = { id: c.doc.id, ...c.doc.data() };
      if (t.createdAt && Date.now() - t.createdAt.toMillis() < 1800000) openTrading(t);
    });
  })));
});


// interface du jeu (logos, popups sans pause, autosell...) : chargée automatiquement
if (!window.__gameUI) { window.__gameUI = true; const g = document.createElement("script"); g.src = "game-ui.js"; document.head.appendChild(g); }
