// home-ui.js : nouvel écran d'accueil (police Inter). L'ancien contenu de l'accueil est simplement caché.
// Script classique : à charger après i18n.js, dans le même dossier que index.html et les images.
(function () {
  const home = document.getElementById("home-screen");
  if (!home) return;

  /* ---------- réglages ---------- */
  const IMG = {
    joystick: "Joystick Dark Mode.png",
    account: "Account Dark Mode.png",
    help: "Help Dark Mode.png",
    privacy: "Privacy Policy Dark Mode.png",
    compass: "Adventure Mode Compass Dark Mode.png",
    timer: "Arcade Mode Timer Dark Mode.png",
    discord: "https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/discord-round-black-icon.png"
  };
  const DISCORD_URL = "https://discord.gg/52UY26TBQF";
  const HELP_URL = "https://how2play.fastcollectchallenge.com";
  const PRIVACY_URL = "https://privacy-policy.fastcollectchallenge.com";
  const src = f => (/^https?:/.test(f) ? f : encodeURI(f));

  const INVERT_ICONS = true;   // true = couleurs des icônes inversées ; false = telles quelles
  const TXT = {
    en: { adv: "ADVENTURE<br>MODE", arc: "ARCADE<br>MODE", account: "Account Settings", help: "How to play", privacy: "Privacy Policy", discord: "Join our Discord server!" },
    fr: { adv: "MODE<br>AVENTURE", arc: "MODE<br>ARCADE", account: "Paramètres du compte", help: "Comment jouer", privacy: "Politique de confidentialité", discord: "Rejoins notre serveur Discord !" }
  };


  /* ---------- styles (cartes de mode et titre : copiés de index_play.html) ---------- */
  const css = document.createElement("style");
  css.textContent = `
  html body #home-screen{background:radial-gradient(1200px 700px at 15% 10%,rgba(124,92,255,.22),transparent 60%),radial-gradient(900px 600px at 90% 90%,rgba(34,211,238,.16),transparent 60%),linear-gradient(180deg,#0a0d14,#0d1220)!important;border:none!important;box-shadow:none!important}
  html body #home-screen #dvdCanvas{opacity:.35}
  #home-screen .home-content{display:none!important}
  #trade-btn img{filter:none!important}
  #hm-root,#hm-root *{font-family:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif!important;box-sizing:border-box}
  #hm-root{--hu:min(calc(100vw / 1920),calc(100vh / 1080));position:absolute;inset:0;z-index:2;pointer-events:none;color:#e8ecf4}

  /* titre : mêmes taille (44 u), poids, espacement et dégradé que index_play.html */
  #hm-title{position:absolute;left:50%;top:calc(70 * var(--u));transform:translate(-50%,-50%);line-height:1.5;text-align:center;white-space:nowrap}
  #hm-title span{display:inline-block;font-weight:800;letter-spacing:-.03em;text-transform:none;font-size:calc(44 * var(--u));background:linear-gradient(90deg,#ffffff,#a5b4fc 50%,#67e8f9);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;text-shadow:none}

  /* les 2 petits conteneurs (blanc à 15 %) */
  #hm-head{position:absolute;top:calc(40 * var(--hu));left:calc(40 * var(--hu));right:calc(40 * var(--hu));height:calc(120 * var(--hu));display:flex;justify-content:space-between;align-items:flex-start}
  .hm-card{height:100%;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.22);border-radius:calc(34 * var(--hu));pointer-events:auto;box-shadow:0 calc(8 * var(--hu)) calc(30 * var(--hu)) rgba(0,0,0,.35)}
  #hm-left{width:calc(250 * var(--hu));display:flex;align-items:center}
  #hm-joy{width:calc(158 * var(--hu));display:flex;justify-content:center}
  #hm-joy img{height:calc(78 * var(--hu));width:auto;display:block}
  .hm-vl{width:calc(3 * var(--hu));height:calc(78 * var(--hu));background:#e8ecf4;flex:none;border-radius:calc(2 * var(--hu))}
  .hm-hl{width:calc(76 * var(--hu));height:calc(3 * var(--hu));background:#e8ecf4;flex:none}
  #hm-side{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:calc(12 * var(--hu))}
  #hm-right{width:calc(120 * var(--hu));display:flex;flex-direction:column;align-items:center;justify-content:center;gap:calc(11 * var(--hu))}
  .hm-ico{position:relative;display:flex;align-items:center;justify-content:center;background:none;border:0;padding:0;margin:0;cursor:pointer;text-decoration:none;pointer-events:auto;transition:transform .15s}
  .hm-ico img{height:calc(34 * var(--hu));width:auto;display:block}
  .hm-ico:hover{transform:scale(1.14)}

  /* cartes de mode : exactement le .mode-card de index_play.html (+ l'icône) */
  #hm-modes{position:absolute;left:50%;top:calc(50% + 5 * var(--u));transform:translate(-50%,-50%);display:flex;gap:calc(60 * var(--u))}
  .hm-mode{box-sizing:content-box!important;width:calc(320 * var(--u));height:calc(220 * var(--u));display:flex;justify-content:center;align-items:center;gap:calc(16 * var(--u));cursor:pointer;pointer-events:auto;
    background:linear-gradient(145deg,rgba(255,255,255,.07),rgba(255,255,255,.02));border:1px solid rgba(255,255,255,.10);border-radius:calc(24 * var(--u));
    color:#e8ecf4;font-weight:700;font-size:calc(24 * var(--u));line-height:1.35;letter-spacing:.02em;text-align:center;
    box-shadow:0 20px 50px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.06);backdrop-filter:blur(14px);
    transition:transform .3s ease,border-color .3s ease,box-shadow .3s ease,background .3s ease}
  .hm-mode:hover{transform:translateY(-6px);border-color:rgba(124,92,255,.7);background:linear-gradient(145deg,rgba(124,92,255,.24),rgba(34,211,238,.08));box-shadow:0 24px 60px rgba(124,92,255,.28),inset 0 1px 0 rgba(255,255,255,.10)}
  .hm-mico{flex:none;width:calc(62 * var(--u));display:flex;justify-content:center}
  .hm-mico img{max-width:calc(62 * var(--u));max-height:calc(70 * var(--u));width:auto;height:auto;display:block}
  .hm-mode .hm-vl{height:calc(84 * var(--u));width:calc(2 * var(--u))}`;
  document.head.appendChild(css);

  /* ---------- structure ---------- */
  const img = (k, alt) => `<img src="${src(IMG[k])}" alt="${alt}" draggable="false">`;
  const root = document.createElement("div"); root.id = "hm-root";
  root.innerHTML = `
    <div id="hm-title"><span>Fast Collect Challenge</span></div>
    <div id="hm-head">
      <div id="hm-left" class="hm-card">
        <div id="hm-joy">${img("joystick", "")}</div>
        <div class="hm-vl"></div>
        <div id="hm-side">
          <button class="hm-ico" id="hm-account" type="button">${img("account", "Account")}</button>
          <a class="hm-ico" id="hm-discord" href="${DISCORD_URL}" target="_blank" rel="noopener">${img("discord", "Discord")}</a>
        </div>
      </div>
      <div id="hm-right" class="hm-card">
        <a class="hm-ico" id="hm-help" href="${HELP_URL}">${img("help", "Help")}</a>
        <div class="hm-hl"></div>
        <a class="hm-ico" id="hm-privacy" href="${PRIVACY_URL}">${img("privacy", "Privacy Policy")}</a>
      </div>
    </div>
    <div id="hm-modes">
      <div class="hm-mode" id="hm-adv"><div class="hm-mico">${img("compass", "")}</div><div class="hm-vl"></div><div class="hm-mtxt"></div></div>
      <div class="hm-mode" id="hm-arc"><div class="hm-mico">${img("timer", "")}</div><div class="hm-vl"></div><div class="hm-mtxt"></div></div>
    </div>`;
  home.appendChild(root);
  const $ = id => document.getElementById(id);

  /* ---------- actions ---------- */
  $("hm-account").onclick = () => { if (window.openAccountModal) window.openAccountModal(); };
  $("hm-adv").onclick = () => window.startAdventure && window.startAdventure();
  $("hm-arc").onclick = () => window.startGame && window.startGame();

  /* ---------- langue (EN / FR) ---------- */
  function applyLang() {
    const t = TXT[document.documentElement.classList.contains("fr") ? "fr" : "en"];
    $("hm-adv").querySelector(".hm-mtxt").innerHTML = t.adv;
    $("hm-arc").querySelector(".hm-mtxt").innerHTML = t.arc;
    [["hm-account", t.account], ["hm-help", t.help], ["hm-privacy", t.privacy], ["hm-discord", t.discord]].forEach(([id, d]) => { const im = $(id).querySelector("img"); im.alt = d; im.title = d; });
  }
  window.addEventListener("langchange", applyLang);
  applyLang();
  /* ---------- icônes : une icône sombre est passée en blanc (le fond du jeu est sombre) ---------- */
  const BALL_IMG = "Ball Dark Mode.png";
  const FC = (window.FC_ICONS = window.FC_ICONS || {});
  function whiten(file) {
    return new Promise(res => {
      const im = new Image();
      im.onload = () => {
        try {
          const c = document.createElement("canvas"), w = c.width = im.naturalWidth, h = c.height = im.naturalHeight, x = c.getContext("2d");
          x.drawImage(im, 0, 0); const id = x.getImageData(0, 0, w, h), d = id.data; let sum = 0, n = 0;
          for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 40) { sum += d[i] * .299 + d[i + 1] * .587 + d[i + 2] * .114; n++; }
          if (n && sum / n < 128) { for (let i = 0; i < d.length; i += 4) d[i] = d[i + 1] = d[i + 2] = 255; x.putImageData(id, 0, 0); return res(c); }
        } catch (e) { /* image non lisible (ouverture en fichier local) : on la garde telle quelle */ }
        res(im);
      };
      im.onerror = () => res(null);
      im.src = src(file);
    });
  }
  if (INVERT_ICONS) root.querySelectorAll("img").forEach(el => { el.style.filter = "invert(1)"; });
  whiten(IMG.joystick).then(r => { if (r) FC.joystick = r; });   // utilisés dans le jeu à la place des emojis
  whiten(BALL_IMG).then(r => { if (r) FC.ball = r; });
})();