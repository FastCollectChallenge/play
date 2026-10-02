// i18n.js : boutons EN/FR + traduction française de tout le jeu (script classique, après le script du jeu)
(function () {
  let lang = localStorage.getItem("fc_lang") || "en";
  const $ = id => document.getElementById(id);
  const L = document.createElement("link"); L.rel = "stylesheet";
  L.href = "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap"; document.head.appendChild(L);
  const S = document.createElement("style");
  S.textContent = `.rb,.rb *{font-family:'Roboto',sans-serif!important}
  .lang-sw{display:flex;position:absolute;z-index:20;--ls:55px}
  .lang-btn{width:var(--ls);height:var(--ls);padding:0;border:2px solid #f1c40f;background:#000;cursor:pointer;overflow:hidden;position:relative;display:block}
  .lang-btn:first-child{border-radius:14px 0 0 14px;border-right-width:1px}.lang-btn:last-child{border-radius:0 14px 14px 0;border-left-width:1px}
  .lang-btn img{width:100%;height:100%;object-fit:fill;display:block}
  .lang-btn span{display:none;position:absolute;inset:0;align-items:center;justify-content:center;background:#f1c40f;color:#000;font-size:calc(var(--ls)*.36);font-weight:700}
  .lang-btn:hover img{visibility:hidden}.lang-btn:hover span,.lang-btn.bad span{display:flex}
  .lang-btn.on{box-shadow:inset 0 0 0 3px #f1c40f}`;
  document.head.appendChild(S);

  /* ---------- boutons drapeaux ---------- */
  const FLAGS = {
    en: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/83/Flag_of_the_United_Kingdom_%283-5%29.svg/langfr-250px-Flag_of_the_United_Kingdom_%283-5%29.svg.png?utm_source=fr.wikipedia.org&utm_campaign=parser&utm_content=thumbnail",
    fr: "https://static.vecteezy.com/ti/vecteur-libre/p1/5948451-drapeau-francais-icone-vecteur-le-drapeau-de-la-france-gratuit-vectoriel.jpg"
  };
  window.makeLangSwitch = function () {
    const d = document.createElement("div"); d.className = "lang-sw";
    ["en", "fr"].forEach(c => {
      const b = document.createElement("button"); b.className = "lang-btn" + (c === lang ? " on" : ""); b.dataset.l = c;
      b.innerHTML = `<img src="${FLAGS[c]}" alt="${c}"><span class="rb">${c.toUpperCase()}</span>`;
      b.firstChild.onerror = () => b.classList.add("bad");
      b.onclick = () => setLang(c); d.appendChild(b);
    });
    return d;
  };
  const sw = makeLangSwitch();
  sw.style.cssText = "top:calc(45*var(--u));right:calc(115*var(--u));--ls:calc(55*var(--u))";
  $("home-screen").appendChild(sw);

  /* ---------- dictionnaire ---------- */
  const EX = {
    "Latest spawn": "Dernière apparition", "Latest good spawn": "Dernière bonne apparition", "Best spawn": "Meilleure apparition",
    "INVENTORY": "INVENTAIRE", "Close ✖": "Fermer ✖", "Apples": "Pommes", "Luck Potions": "Potions de chance", "🏪 SHOP": "🏪 BOUTIQUE",
    "Yes": "Oui", "No": "Non", "Confirm": "Confirmer", "Cancel": "Annuler", "Sell Apples": "Vendre des pommes",
    'Type "Max" to sell all': 'Écris "Max" pour tout vendre',
    "Inventory": "Inventaire", "Shop": "Boutique", "Leave?": "Quitter ?", "Trade": "Échange", "TRADE": "ÉCHANGE",
    "Red Apple": "Pomme rouge", "Green Apple": "Pomme verte", "Golden Apple": "Pomme dorée", "Diamond Apple": "Pomme diamant",
    "Candy Apple": "Pomme d'amour", "Lava Apple": "Pomme de lave", "Galaxy Apple": "Pomme galactique", "Dark Apple": "Pomme noire",
    "Moony Apple": "Pomme lunaire", "Bloodmoon Apple": "Pomme Bloodmoon",
    "Are you sure you want to buy this potion?": "Veux-tu vraiment acheter cette potion ?",
    "Are you sure you want to sell this potion (You will only keep 80% of the price)?": "Veux-tu vraiment vendre cette potion (tu ne récupéreras que 80 % du prix) ?",
    "Are you sure you want to use this potion?": "Veux-tu vraiment utiliser cette potion ?",
    "You don't have enough money to buy this potion!": "Tu n'as pas assez d'argent pour acheter cette potion !",
    "Please enter a valid amount or type 'Max'.": "Entre une quantité valide ou écris « Max ».",
    "You don't have any apples of this kind to sell!": "Tu n'as aucune pomme de ce type à vendre !",
    "Game Over! Restart?": "Partie terminée ! Rejouer ?",
    "Quantity": "Quantité", "Qty": "Qté", "Player username": "Pseudo du joueur",
    "New offer": "Nouvelle offre", "You give:": "Tu donnes :", "You ask:": "Tu demandes :", "Send offer": "Envoyer l'offre",
    "Received": "Reçues", "Sent": "Envoyées", "Add": "Ajouter", "Accept": "Accepter", "Decline": "Refuser",
    "offers": "propose", "gets": "reçoit", "in return": "en échange de", "nothing": "rien",
    "Offer sent!": "Offre envoyée !", "New trade offer!": "Nouvelle offre d'échange !", "Trade completed!": "Échange terminé !",
    "Enter a username": "Entre un pseudo", "Empty offer": "Offre vide", "Player not found": "Joueur introuvable", "That's you!": "C'est toi !",
    "Log in": "Se connecter", "Sign up": "S'inscrire", "Play as guest": "Jouer en invité",
    "Log-in with Google": "Se connecter avec Google", "Log-in with Github": "Se connecter avec Github",
    "No account?": "Pas de compte ?", "Sign-up here": "Inscris-toi ici", "Already have an account?": "Déjà un compte ?", "Log-in here": "Connecte-toi ici",
    "Username or email": "Nom d'utilisateur ou e-mail", "Password (6+ chars)": "Mot de passe (6 caractères min.)",
    "Invalid username": "Pseudo invalide", "Username already taken": "Pseudo déjà pris",
    "Choose a username (3-16: a-z, 0-9, _):": "Choisis un pseudo (3-16 : a-z, 0-9, _) :",
    "Choose your username and profile picture": "Choisis ton pseudo et ta photo de profil", "Edit your profile picture": "Modifier ta photo de profil",
    "Username (3-16: a-z, 0-9, _)": "Pseudo (3-16 : a-z, 0-9, _)", "Profile picture URL (https://...)": "URL de la photo de profil (https://...)",
    "Continue": "Continuer", "Save": "Enregistrer", "Log out": "Se déconnecter", "Close": "Fermer", "Import my local progress": "Importer ma progression locale",
    "Invalid picture URL (must start with https://)": "URL de photo invalide (doit commencer par https://)"
  };
  const SN = { "Red Apples": "des pommes rouges", "Green Apples": "des pommes vertes", "Golden Apples": "des pommes dorées", "Diamond Apples": "des pommes diamant",
    "Candy Apples": "des pommes d'amour", "Lava Apples": "des pommes de lave", "Galaxy Apples": "des pommes galactiques", "Dark Apples": "des pommes noires",
    "Salhini Appelini": "des Salhini Appelini", "Bloodmoon Apple": "des pommes Bloodmoon", "Moony Apple": "des pommes lunaires" };
  const RX = [
    [/^Score: (.*)$/, "Score : $1"], [/^Timer: (.*)$/, "Temps : $1"], [/^Luck x(\d+)$/, "Chance x$1"],
    [/^⚠️SERVERS RESET IN (\d+)s$/, "⚠️RÉINITIALISATION DES SERVEURS DANS $1s"],
    [/^Sell (.+) \((\+.+)\)$/, (m, n, p) => `Vendre ${SN[n] || n} (${p})`],
    [/^You don't have enough: (.+)$/, "Tu n'as pas assez de : $1"],
    [/^Import your local progress from "(.*)"\?$/, "Importer ta progression locale depuis « $1 » ?"]
  ];
  const tt = core => { if (EX[core]) return EX[core]; for (const [r, s] of RX) if (r.test(core)) return core.replace(r, s); return null; };
  window.T = s => lang === "fr" ? (tt(s) ?? s) : s;

  /* messages du haut/bas (HTML) */
  const AP = { Green: ["pomme verte", "pommes vertes"], Golden: ["pomme dorée", "pommes dorées"], Diamond: ["pomme diamant", "pommes diamant"], Candy: ["pomme d'amour", "pommes d'amour"] };
  const HX = [
    [/You activated Potion (\d+)x luck!/, "Tu as activé la potion de chance x$1 !"],
    [/activated (\d+)x luck for ([^!<]+)!/, "a activé la chance x$1 pendant $2 !"],
    [/activated (\d+)x luck!/, "a activé la chance x$1 !"],
    [/activated (<span[^>]*>)Green time(<\/span>)!/, "a activé le $1Temps vert$2 !"],
    [/activated (<span[^>]*>)Double Points(<\/span>)!/, "a activé les $1Points doublés$2 !"],
    [/spawned a (Lava|Galaxy|Dark) Apple in your server!/, (m, t) => `a fait apparaître une pomme ${{ Lava: "de lave", Galaxy: "galactique", Dark: "noire" }[t]} sur ton serveur !`],
    [/A Salhini Appelini spawned in your server!/, "Un Salhini Appelini est apparu sur ton serveur !"],
    [/A Bloodmoon apple spawned in your server!/, "Une pomme Bloodmoon est apparue sur ton serveur !"],
    [/A Moony Apple spawned in your server!/, "Une pomme lunaire est apparue sur ton serveur !"],
    [/spawned (\d+) (Green|Golden|Diamond|Candy) Apples?!/, (m, n, t) => `a fait apparaître ${n} ${AP[t][n > 1 ? 1 : 0]} !`],
    [/set ball speed to x([\d.]+)/, "a réglé la vitesse de la balle sur x$1"],
    [/Ball Speed set to x3 due to imminent server reseting/, "Vitesse de la balle réglée sur x3 : réinitialisation imminente du serveur"]
  ];
  const _sm = window.showAdvancedMsg;
  window.showAdvancedMsg = (h, p, s) => _sm(lang === "fr" ? HX.reduce((a, [r, x]) => a.replace(r, x), h) : h, p, s);
  ["alert", "confirm", "prompt"].forEach(k => { const o = window[k].bind(window); window[k] = (m, ...a) => o(lang === "fr" ? (tt(String(m)) ?? m) : m, ...a); });

  /* ---------- traduction du DOM ---------- */
  const orig = new WeakMap(), SKIP = /^(SCRIPT|STYLE|TEXTAREA)$/;
  function trNode(n) {
    if (lang !== "fr" || !n.parentNode || SKIP.test(n.parentNode.nodeName)) return;
    const v = n.nodeValue, m = v.match(/^(\s*)([\s\S]*?)(\s*)$/), r = m[2] && tt(m[2]);
    if (r && r !== m[2]) { orig.set(n, v); n.nodeValue = m[1] + r + m[3]; }
  }
  function trPh(e) { const p = e.getAttribute("placeholder"), r = tt(p); if (r) { e.dataset.ph0 = p; e.setAttribute("placeholder", r); } }
  function walk(root) {
    if (root.nodeType === 3) return trNode(root);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) trNode(n);
    if (root.querySelectorAll) root.querySelectorAll("[placeholder]").forEach(trPh);
  }
  function restore() {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) if (orig.has(n)) { n.nodeValue = orig.get(n); orig.delete(n); }
    document.querySelectorAll("[data-ph0]").forEach(e => { e.setAttribute("placeholder", e.dataset.ph0); delete e.dataset.ph0; });
  }
  new MutationObserver(ms => {
    if (lang !== "fr") return;
    ms.forEach(m => m.type === "characterData" ? trNode(m.target) : m.addedNodes.forEach(walk));
  }).observe(document.body, { childList: true, subtree: true, characterData: true });

  function setLang(c) {
    lang = c; localStorage.setItem("fc_lang", c);
    document.querySelectorAll(".lang-btn").forEach(b => b.classList.toggle("on", b.dataset.l === c));
    const fr = c === "fr", cards = document.querySelectorAll(".mode-card");
    cards[0].innerHTML = fr ? "MODE<br>AVENTURE" : "ADVENTURE<br>MODE";
    cards[1].innerHTML = fr ? "MODE<br>ARCADE" : "ARCADE<br>MODE";
    if (fr) walk(document.body); else restore();
    window.dispatchEvent(new Event("langchange"));
  }
  if (lang === "fr") setLang("fr");
})();
