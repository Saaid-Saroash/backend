/* script.js - Cosmos app (robust transfer-token + sessionStorage approach)
   - sessionStorage holds current-tab user (key: 'cosmos_user_ss')
   - localStorage transfer token (key: 'cosmos_transfer') carries login across navigation reliably
   - visibility/pagehide clears sessionStorage unless a fresh transfer token exists
   - includes dashboard, viewer, search, favorites, menu handling
*/

/* === CONFIG === */
const ALL_FOLDERS = [
  "backend cmds","instagram","toutatis","dead zone",
  "codes","blueprints","prototypes"
];

const FILE_MAP = {
  "backend cmds":"files/backend_cmds.txt",
  "instagram":"files/instagram.txt",
  "toutatis":"files/toutatis.txt",
  "dead zone":"files/dead_zone.txt",
  "codes":"files/codes.txt",
  "blueprints":"files/blueprints.txt",
  "prototypes":"files/prototypes.txt"
};

const ACCOUNTS = {
  "hackersworld@backend.com": { pwd: "sro43kl", folders: ["backend cmds","instagram","toutatis","dead zone"] },
  "saaidsaroash@personal.com": { pwd: "saaidsaroash772009", folders: ["codes","blueprints","prototypes"] },
  "hackersuniverse@unkown.com": { pwd: "26112009", folders: ALL_FOLDERS.slice() }
};

/* === Storage keys and helpers === */
const SESSION_KEY = 'cosmos_user_ss';         // sessionStorage key (per-tab)
const TRANSFER_KEY = 'cosmos_transfer';       // localStorage transfer token
const TRANSFER_TTL = 7000;                    // ms: accept transfer tokens younger than this

function setSessionLocal(email){ try { sessionStorage.setItem(SESSION_KEY, email); } catch(e){} }
function clearSessionLocal(){ try { sessionStorage.removeItem(SESSION_KEY); } catch(e){} }
function getSessionLocal(){ try { return sessionStorage.getItem(SESSION_KEY); } catch(e){ return null; } }

/* create transfer token in localStorage to pass login across pages */
function createTransferToken(email){
  try {
    const payload = {user: email, ts: Date.now()};
    localStorage.setItem(TRANSFER_KEY, JSON.stringify(payload));
  } catch(e){}
}

/* attempt to restore session from a valid transfer token (run immediately on load) */
function restoreFromTransferIfNeeded(){
  try {
    if(getSessionLocal()) return; // already have session
    const raw = localStorage.getItem(TRANSFER_KEY);
    if(!raw) return;
    const obj = JSON.parse(raw);
    if(obj && obj.user && (Date.now() - (obj.ts||0) <= TRANSFER_TTL)){
      // restore into sessionStorage for this tab
      setSessionLocal(obj.user);
      // remove transfer so other tabs won't reuse it
      localStorage.removeItem(TRANSFER_KEY);
    } else {
      // stale token, remove
      try { localStorage.removeItem(TRANSFER_KEY); } catch(e){}
    }
  } catch(e){}
}

/* run restore early */
restoreFromTransferIfNeeded();

/* ==== Internal-nav early marking (still used to help UX) ==== */
function markInternalNavTimestamp(){
  try { localStorage.setItem('cosmos_internal_nav_ts', String(Date.now())); } catch(e){}
}

/* Mark internal nav on common user events (pointerdown, click, submit, keydown) */
(function installEarlyMarking(){
  // programmatic override
  try {
    const nativeReplace = window.location.replace.bind(window.location);
    window.location.replace = function(url){
      markInternalNavTimestamp();
      return nativeReplace(url);
    };
    if(window.location.assign){
      const nativeAssign = window.location.assign.bind(window.location);
      window.location.assign = function(url){
        markInternalNavTimestamp();
        return nativeAssign(url);
      };
    }
  } catch(e){}

  document.addEventListener('pointerdown', (ev) => {
    const a = ev.target.closest && ev.target.closest('a');
    const btn = ev.target.closest && ev.target.closest('button');
    const form = ev.target.closest && ev.target.closest('form');
    if(a && a.href && a.target !== '_blank'){
      try {
        const url = new URL(a.href, location.href);
        if(url.origin === location.origin && url.protocol.startsWith('http')) markInternalNavTimestamp();
      } catch(e){}
    } else if(btn || form){
      markInternalNavTimestamp();
    }
  }, {capture:true, passive:true});

  document.addEventListener('click', (ev) => {
    const a = ev.target.closest && ev.target.closest('a');
    if(a && a.href && a.target !== '_blank'){
      try {
        const url = new URL(a.href, location.href);
        if(url.origin === location.origin && url.protocol.startsWith('http')) markInternalNavTimestamp();
      } catch(e){}
    }
  }, {capture:true});

  document.addEventListener('keydown', (ev) => {
    if(ev.key === 'Enter'){
      const active = document.activeElement;
      if(active){
        if(['A','BUTTON','INPUT','TEXTAREA','SELECT'].includes(active.tagName)) markInternalNavTimestamp();
        else {
          const a = active.closest && active.closest('a');
          const btn = active.closest && active.closest('button');
          if(a || btn) markInternalNavTimestamp();
        }
      }
    }
  }, {capture:true});

  document.addEventListener('submit', ()=> markInternalNavTimestamp(), {capture:true});
})();

/* === visibility/pagehide handling (clears session unless transfer/close internal) === */
(function installVisibilityHandler(){
  const THRESH = 5000; // ms
  function onHidden(){
    try {
      // If a transfer token exists and is fresh, allow it (login transfer)
      const tr = localStorage.getItem(TRANSFER_KEY);
      if(tr){
        try {
          const obj = JSON.parse(tr);
          if(obj && obj.ts && (Date.now() - obj.ts <= TRANSFER_TTL)){
            // it's a fresh transfer; keep session (new page will restore)
            return;
          }
        } catch(e){}
      }

      // If internal navigation timestamp is fresh, do not clear
      const tRaw = localStorage.getItem('cosmos_internal_nav_ts');
      if(tRaw && (Date.now() - parseInt(tRaw,10) <= THRESH)){
        // consume the timestamp and keep session
        try { localStorage.removeItem('cosmos_internal_nav_ts'); } catch(e){}
        return;
      }

      // otherwise clear *sessionStorage* (localStorage used only for transfer)
      try { sessionStorage.removeItem(SESSION_KEY); } catch(e){}
    } catch(e){
      try { sessionStorage.removeItem(SESSION_KEY); } catch(_) {}
    }
  }

  document.addEventListener('visibilitychange', ()=> { if(document.hidden) onHidden(); });
  window.addEventListener('pagehide', ()=> onHidden());
})();

/* === Menu helpers === */
function openMenu(id){
  const m = document.getElementById(id);
  if(m){ m.style.transform = 'translateX(0)'; m.setAttribute('aria-hidden','false'); document.body.classList.add('menu-open'); const ov=document.getElementById('menuOverlay'); if(ov) ov.style.display='block'; }
}
function closeMenu(){
  const menus = document.querySelectorAll('.side-menu');
  menus.forEach(m=>{ m.style.transform='translateX(-110%)'; m.setAttribute('aria-hidden','true'); });
  document.body.classList.remove('menu-open');
  const ov=document.getElementById('menuOverlay'); if(ov) ov.style.display='none';
  if(document.activeElement) document.activeElement.blur();
}
function toggleMenu(id){
  const m=document.getElementById(id);
  if(!m) return;
  const hidden = m.getAttribute('aria-hidden') === 'true';
  if(hidden) openMenu(id); else closeMenu();
}

/* === Auth: login/logout === */
function attemptLogin(ev){
  ev && ev.preventDefault();
  const email = (document.getElementById('email')||{}).value?.trim() || '';
  const password = (document.getElementById('password')||{}).value?.trim() || '';
  const acc = ACCOUNTS[email];
  if(acc && acc.pwd === password){
    // set session in this tab synchronously
    try { sessionStorage.setItem(SESSION_KEY, email); } catch(e){}
    // set transfer token so the next page reliably restores if needed
    createTransferToken(email);
    // navigate
    try { location.replace('dashboard.html'); } catch(e){ window.location.href = 'dashboard.html'; }
  } else {
    alert('Invalid credentials');
  }
}

function logoutNow(){
  try { sessionStorage.removeItem(SESSION_KEY); localStorage.removeItem(TRANSFER_KEY); localStorage.removeItem('cosmos_internal_nav_ts'); } catch(e){}
  try { location.replace('logout.html'); } catch(e){ window.location.href='logout.html'; }
}
function logoutFromMenu(){ if(confirm('Logout?')) logoutNow(); }

/* === Helpers to read session (used by pages) === */
function getCurrentUser(){
  // attempt to restore from transfer if needed (called on page load)
  restoreFromTransferIfNeeded();
  return getSessionLocal();
}

/* === Favorites helpers === */
function toggleFavorite(user, folder){
  if(!user) return;
  const key = `cosmos_favs_${user}`;
  const arr = JSON.parse(localStorage.getItem(key) || '[]');
  const idx = arr.indexOf(folder);
  if(idx === -1) arr.push(folder); else arr.splice(idx,1);
  localStorage.setItem(key, JSON.stringify(arr));
}

/* === Dashboard rendering === */
function renderDashboard(){
  const user = getCurrentUser();
  if(!user){ try { location.replace('index.html'); } catch(e){ window.location.href='index.html'; } return; }

  // update user tag
  const tag = document.getElementById('userTag');
  if(tag) tag.textContent = user;

  const container = document.getElementById('folders');
  if(!container) return;
  container.innerHTML = '';

  const allowed = (ACCOUNTS[user] && ACCOUNTS[user].folders) ? ACCOUNTS[user].folders : [];

  allowed.forEach(folder=>{
    const el = document.createElement('div');
    el.className = 'folder';
    const favs = JSON.parse(localStorage.getItem(`cosmos_favs_${user}`) || '[]');
    const star = favs.includes(folder) ? '★' : '☆';
    el.innerHTML = `<div style="display:flex;gap:10px;align-items:center"><span>${folder}</span><button class="btn small-btn fav-toggle">${star}</button></div><span class="small">View</span>`;

    el.addEventListener('click', ()=>{
      // set transfer only if sessionStorage missing on other page; setting transfer is harmless
      createTransferToken(user);
      try { location.replace(`viewer.html?folder=${encodeURIComponent(folder)}`); } catch(e){ window.location.href = `viewer.html?folder=${encodeURIComponent(folder)}`; }
    });

    el.querySelector('.fav-toggle')?.addEventListener('click', (ev)=>{
      ev.stopPropagation();
      toggleFavorite(user, folder);
      const favs2 = JSON.parse(localStorage.getItem(`cosmos_favs_${user}`) || '[]');
      const btn = el.querySelector('.fav-toggle');
      if(btn) btn.textContent = favs2.includes(folder) ? '★' : '☆';
    });

    container.appendChild(el);
  });

  // attach UI buttons
  document.getElementById('logoutBtnTop')?.addEventListener('click', ()=> { if(confirm('Logout?')) logoutNow(); });
  document.getElementById('menuToggle')?.addEventListener('click', ()=> toggleMenu('sideMenu'));
  document.getElementById('menuOverlay')?.addEventListener('click', ()=> closeMenu());

  window.addEventListener('popstate', ()=> {
    const u = getCurrentUser();
    if(!u) { try{ location.replace('index.html'); } catch(e){ window.location.href='index.html'; } }
    else history.replaceState(null,'',location.href);
  });
}

/* === Viewer init === */
function initViewer(){
  const user = getCurrentUser();
  if(!user){ try { location.replace('index.html'); } catch(e){ window.location.href='index.html'; } return; }
  history.replaceState(null,'',location.href);

  // UI wiring
  document.getElementById('menuToggleV')?.addEventListener('click', ()=> toggleMenu('sideMenuV'));
  document.getElementById('logoutBtnTopV')?.addEventListener('click', ()=> { if(confirm('Logout?')) logoutNow(); });
  document.getElementById('backBtn')?.addEventListener('click', ()=> { createTransferToken(user); try{ location.replace('dashboard.html'); } catch(e){ window.location.href='dashboard.html'; } });

  const params = new URLSearchParams(window.location.search);
  const folder = params.get('folder');
  if(!folder){ try { location.replace('dashboard.html'); } catch(e){ window.location.href='dashboard.html'; } return; }

  const allowed = (ACCOUNTS[user] && ACCOUNTS[user].folders) ? ACCOUNTS[user].folders : [];
  if(!allowed.includes(folder)){ alert('Access denied'); try { location.replace('dashboard.html'); } catch(e){ window.location.href='dashboard.html'; } return; }

  const tag = document.getElementById('userTagV') || document.getElementById('userTag');
  if(tag) tag.textContent = user;
  const titleEl = document.getElementById('folderName'); if(titleEl) titleEl.textContent = folder;

  const path = FILE_MAP[folder];
  fetch(path, {cache:'no-store'}).then(r => { if(!r.ok) throw new Error(); return r.text(); }).then(txt=>{
    document.getElementById('fileContent').textContent = txt;
  }).catch(()=> { document.getElementById('fileContent').textContent = 'Error loading file'; });

  document.getElementById('downloadBtnViewer')?.addEventListener('click', ()=>{
    fetch(path).then(r=>r.blob()).then(blob=>{
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download = folder.replace(/\s+/g,'_') + '.txt'; a.click(); URL.revokeObjectURL(a.href);
    }).catch(()=> alert('Download failed'));
  });

  document.getElementById('favBtn')?.addEventListener('click', ()=>{
    toggleFavorite(user, folder);
    const favsNow = JSON.parse(localStorage.getItem(`cosmos_favs_${user}`) || '[]');
    alert(favsNow.includes(folder) ? `${folder} added to favorites` : `${folder} removed from favorites`);
  });

  document.getElementById('menuOverlay')?.addEventListener('click', ()=> closeMenu());
  window.addEventListener('popstate', ()=> { const u = getCurrentUser(); if(!u){ try{ location.replace('index.html') } catch(e){ window.location.href='index.html'; } } else history.replaceState(null,'',location.href); });
}

/* === Search (prompt-based) === */
function performSearch(query){
  if(!query || !query.trim()){ alert('Type a search term'); return; }
  const user = getCurrentUser();
  if(!user){ try{ location.replace('index.html'); } catch(e){ window.location.href='index.html'; } return; }
  const allowed = (ACCOUNTS[user] && ACCOUNTS[user].folders) ? ACCOUNTS[user].folders : [];
  const lc = query.toLowerCase();
  const results = [];
  let done = 0;
  allowed.forEach(folder=>{
    const path = FILE_MAP[folder];
    fetch(path, {cache:'no-store'}).then(r=>r.text()).then(txt=>{
      if((folder.toLowerCase().includes(lc)) || (txt && txt.toLowerCase().includes(lc))){
        const idx = txt ? txt.toLowerCase().indexOf(lc) : -1;
        let snippet = '';
        if(idx >= 0){
          const start = Math.max(0, idx - 50);
          const end = Math.min(txt.length, idx + 50);
          snippet = txt.substring(start, end).replace(/\n/g,' ');
        }
        results.push({folder, snippet});
      }
    }).catch(()=>{}).finally(()=>{
      done++;
      if(done === allowed.length){
        if(!results.length){ alert('No results'); return; }
        const list = results.map((r,i)=>`${i+1}. ${r.folder} — ${r.snippet? r.snippet : 'match'}`).join('\n\n');
        const choice = prompt('Search results:\n\n' + list + '\n\nEnter number to open (cancel to skip)');
        const num = parseInt(choice);
        if(num && num>0 && num<=results.length){
          createTransferToken(user);
          try { location.replace(`viewer.html?folder=${encodeURIComponent(results[num-1].folder)}&q=${encodeURIComponent(query)}`); } catch(e){ window.location.href = `viewer.html?folder=${encodeURIComponent(results[num-1].folder)}&q=${encodeURIComponent(query)}`; }
        }
      }
    });
  });
}
function performSearchWrapper(q){ performSearch(q); }

/* === Favorites / Help convenience === */
function showFavorites(){
  const user = getCurrentUser();
  if(!user){ alert('Not signed in'); return; }
  const arr = JSON.parse(localStorage.getItem(`cosmos_favs_${user}`) || '[]');
  if(!arr.length) alert('No favorites yet');
  else {
    createTransferToken(user);
    try { location.replace(`viewer.html?folder=${encodeURIComponent(arr[0])}`); } catch(e){ window.location.href = `viewer.html?folder=${encodeURIComponent(arr[0])}`; }
  }
}
function showHelp(){ alert('Help\nContact: hydramusic@gmail.com\nInstagram: @saaid_sarosh77'); }

/* === Public API exported to pages === */
window.LW = {
  attemptLogin,
  renderDashboard,
  initViewer,
  logoutFromMenu,
  logoutNow,
  performSearch: performSearchWrapper,
  showFavorites,
  showHelp,
  getSession: getCurrentUser
};
