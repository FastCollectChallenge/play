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
const toast = m => showAdvancedMsg(m, "top", { color: "white" });

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
  if (k.startsWith("apple:")) return APPLE_NAMES[k.slice(6)];
  const p = SHOP_PRODUCTS.find(p => p.id === k.slice(7)); return p ? `Luck x${p.multiplier} (${p.duration}s)` : k;
}
const describe = m => Object.entries(m || {}).map(([k, n]) => `${fmtNum(n)}× ${esc(label(k))}`).join(", ") || "nothing";

/* ---------- écran de connexion ---------- */
const ov = document.createElement("div");
ov.style.cssText = "position:fixed;inset:0;z-index:9000;background:#000;border:10px solid #f1c40f;box-sizing:border-box;display:flex;align-items:center;justify-content:center;color:#f1c40f;text-align:center";
ov.innerHTML = `<div style="width:380px;display:flex;flex-direction:column;gap:12px;font-size:10px">
  <div style="font-size:18px;line-height:1.6">Fast Collect Challenge</div>
  <input id="au-name" class="sell-input" style="width:100%;box-sizing:border-box" placeholder="Username or email">
  <input id="au-pw" type="password" class="sell-input" style="width:100%;box-sizing:border-box" placeholder="Password (6+ chars)">
  <div><button class="acc-btn" id="au-login">Log in</button><button class="acc-btn" id="au-signup">Sign up</button></div>
  <div><button class="acc-btn" id="au-google">Google</button><button class="acc-btn" id="au-github">GitHub</button><button class="acc-btn" id="au-guest">Guest</button></div>
  <div id="au-err" style="color:#ff6b6b;font-size:8px;line-height:1.6;min-height:14px"></div></div>`;
document.body.appendChild(ov);
const err = e => $("au-err").textContent = (e && (e.code || e.message)) || String(e);

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
$("au-login").onclick = () => pseudoAuth(false);
$("au-signup").onclick = () => pseudoAuth(true);
$("au-google").onclick = () => signInWithPopup(auth, new GoogleAuthProvider()).catch(err);
$("au-github").onclick = () => signInWithPopup(auth, new GithubAuthProvider()).catch(err);
$("au-guest").onclick = () => signInAnonymously(auth).catch(err);

/* ---------- profil ---------- */
async function ensureProfile(user) {
  if ((await getDoc(doc(db, "users", user.uid))).exists()) return true;
  let init = fresh();
  try {
    const a = JSON.parse(localStorage.getItem("fastCollect_accounts") || "null"), k = localStorage.getItem("fastCollect_activeAccount");
    if (a && a[k] && confirm(`Import your local progress from "${k}"?`)) init = normalize(a[k]);
  } catch (e) {}
  const ask = () => user.isAnonymous ? "guest" + Math.floor(1000 + Math.random() * 9000) : clean(prompt("Choose a username (3-16: a-z, 0-9, _):"));
  let name = pendingName || ask(); pendingName = null;
  for (let i = 0; i < 5; i++) {
    if (!name) { await signOut(auth); return false; }
    if (!okName(name)) { alert("Invalid username"); name = ask(); continue; }
    try {
      await runTransaction(db, async t => {
        const u = doc(db, "usernames", name);
        if ((await t.get(u)).exists()) throw new Error("taken");
        t.set(u, { uid: user.uid });
        t.set(doc(db, "users", user.uid), { username: name, rev: 1, data: init });
      });
      return true;
    } catch (e) { if (e.message !== "taken") { err(e); await signOut(auth); return false; } if (!user.isAnonymous) alert("Username already taken"); name = ask(); }
  }
  await signOut(auth); return false;
}

function applyRemote(v) {
  rev = v.rev; username = v.username;
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
window.openAccountModal = () => showCustomConfirm(`Logged in as ${username}. Log out?`, async ok => { if (ok) { await saveNow(); await signOut(auth); } });
document.addEventListener("visibilitychange", () => { if (document.hidden) saveNow(); });
window.addEventListener("pagehide", saveNow);

/* ---------- Trade : UI ---------- */
const trBtn = document.createElement("button");
trBtn.className = "side-btn no-img"; trBtn.innerHTML = '<span class="side-btn-label">Trade</span>';
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
    <b>${esc(inc ? t.fromName : t.toName)}</b> ${inc ? "offers" : "gets"}: ${describe(t.give)}<br>${inc ? "for your" : "for their"}: ${describe(t.ask)}<br>
    ${inc ? `<button class="acc-btn" data-a="accept" data-id="${t.id}">Accept</button><button class="acc-btn danger" data-a="decline" data-id="${t.id}">Decline</button>`
          : `<button class="acc-btn danger" data-a="cancel" data-id="${t.id}">Cancel</button>`}</div>`;
  $("tr-in").innerHTML = inbox.map(t => card(t, true)).join("") || "-";
  $("tr-out").innerHTML = outbox.map(t => card(t, false)).join("") || "-";
  trBtn.firstChild.textContent = inbox.length ? "Trade!" : "Trade";
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
  if (!(await ensureProfile(user))) return;
  me = user.uid;
  unsubs.push(onSnapshot(doc(db, "users", me), s => {
    if (!s.exists()) return; const v = s.data();
    if (!loaded || (!saving && v.rev > rev)) { applyRemote(v); loaded = true; ov.style.display = "none"; }
  }));
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
