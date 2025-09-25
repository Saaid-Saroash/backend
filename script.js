/* script.js - Cosmos app (menu fix + on-page notifications + robust session logic)
   Replace the existing script.js fully with this file.
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

/* === Storage keys/helpers (transfer-token approach) === */
const SESSION_KEY = 'cosmos_user_ss';
const TRANSFER_KEY = 'cosmos_transfer';
const TRANSFER_TTL = 7000; // ms
function setSessionLocal(email){ try{ sessionStorage.setItem(SESSION_KEY, email); }catch(e){} }
function clearSessionLocal(){ try{ sessionStorage.removeItem(SESSION_KEY); }catch(e){} }
function getSessionLocal(){ try{ return sessionStorage.getItem(SESSION_KEY); }catch(e){ return null; } }
function createTransferToken(email){ try{ localStorage.setItem(TRANSFER_KEY, JSON.stringify({user: email, ts: Date.now()})); }catch(e){} }
function restoreFromTransferIfNeeded(){
  try{
    if(getSessionLocal()) return;
    const raw = localStorage.getItem(TRANSFER_KEY);
    if(!raw) return;
    const obj = JSON.parse(raw);
    if(obj && obj.user && (Date.now() - (obj.ts||0) <= TRANSFER_TTL)){
      setSessionLocal(obj.user);
      localStorage.removeItem(TRANSFER_KEY);
    } else {
      try{ localStorage.removeItem(TRANSFER_KEY); }catch(e){}
    }
  }catch(e){}
}
restoreFromTransferIfNeeded();

/* === Simple on-page notification (toast) === */
function ensureToastContainer(){
  if(document.getElementById('cosmos_toast_container')) return;
  const c = document.createElement('div');
  c.id = 'cosmos_toast_container';
  c.setAttribute('aria-live','polite');
  document.body.appendChild(c);
}
function showNotification(message, type = 'info', timeout = 4200){
  ensureToastContainer();
  const container = document.getElementById('cosmos_toast_container');
  const el = document.createElement('div');
  el.className = `cosmos_toast ${type}`;
  el.textContent = message;
  container.appendChild(el);
  // animate in
  requestAnimationFrame(()=> el.classList.add('visible'));
  // auto-remove
  setTimeout(()=> {
    el.classList.remove('visible');
    setTimeout(()=> el.remove(), 300);
  }, timeout);
}

/* === Menu helpers (fixed) === */
function openMenu(menuEl){
  if(!menuEl) return;
  menuEl.style.transform = 'translateX(0)';
  menuEl.setAttribute('aria-hidden','false');
  document.body.classList.add('menu-open');
  const ov = getOrCreateOverlay();
  ov.style.display = 'block';
}
function closeMenu(){
  const menus = document.querySelectorAll('.side-menu');
  menus.forEach(m=>{
    m.style.transform = 'translateX(-110%)';
    m.setAttribute('aria-hidden','true');
  });
  document.body.classList.remove('menu-open');
  const ov = document.getElementById('menuOverlay');
  if(ov) ov.style.display = 'none';
}
function toggleMenuForPage(){
  // toggles the first .side-menu found on current page
  const menu = document.querySelector('.side-menu');
  if(!menu) return;
  const hidden = menu.getAttribute('aria-hidden') === 'true';
  if(hidden) openMenu(menu); else closeMenu();
}
function getOrCreateOverlay(){
  let ov = document.getElementById('menuOverlay');
  if(!ov){
    ov = document.createElement('div');
    ov.id = 'menuOverlay';
    ov.className = 'menu-overlay';
    ov.onclick = function(){ closeMenu(); };
    document.body.appendChild(ov);
  }
  return ov;
}

/* close menu when clicking outside or pressing Escape */
(function installGlobalMenuClose(){
  // ensure overlay present (some pages already have it in HTML; safe to re-create)
  getOrCreateOverlay();

  // click outside side-menu -> close
  document.addEventListener('click', function(e){
    const menuOpen = document.body.classList.contains('menu-open');
    if(!menuOpen) return;
    const target = e.target;
    const insideMenu = !!target.closest('.side-menu');
    const isHamburger = !!target.closest('.hamburger');
    if(!insideMenu && !isHamburger){
      closeMenu();
    }
  }, true);

  // press Escape -> close
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape') closeMenu();
  });
})();

/* bind hamburger buttons (any with class .hamburger) */
(function bindHamburgers(){
  document.addEventListener('click', function(e){
    const btn = e.target.closest && e.target.closest('.hamburger');
    if(!btn) return;
    e.preventDefault();
    toggleMenuForPage();
  }, true);
})();

/* === Early internal-marking + transfer token usage === */
/* Mark internal navigation timestamp so we don't clear session on internal moves */
function markInternalNavTimestamp(){ try{ localStorage.setItem('cosmos_internal_nav_ts', String(Date.now())); }catch(e){} }
(function installEarlyMarking(){
  // override location.replace/assign to mark internal nav
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
  } catch(e){ /* ignore */ }

  // pointerdown (covers touch/mouse) mark internal nav if same-origin link/button/form
  document.addEventListener('pointerdown', function(ev){
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

  document.addEventListener('submit', ()=> markInternalNavTimestamp(), {capture:true});
  document.addEventListener('keydown', function(ev){
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
})();

/* visibility/pagehide handler that respects transfer token & internal nav stamp */
(function installVisibilityHandler(){
  const THRESH = 5000;
  function handleHidden(){
    try {
      // fresh transfer token => do not clear (because new page will restore)
      const tr = localStorage.getItem(TRANSFER_KEY);
      if(tr){
        try {
          const obj = JSON.parse(tr);
          if(obj && obj.ts && (Date.now() - obj.ts <= TRANSFER_TTL)) return;
        } catch(e){}
      }
      // fresh internal nav stamp => do not clear
      const t = localStorage.getItem('cosmos_internal_nav_ts');
      if(t && (Date.now() - parseInt(t,10) <= THRESH)){ try{ localStorage.removeItem('cosmos_internal_nav_ts'); }catch(e){}; return; }

      // otherwise clear sessionStorage-only session
      try{ sessionStorage.removeItem(SESSION_KEY); }catch(e){}
    } catch(e){
      try{ sessionStorage.removeItem(SESSION_KEY);}catch(_) {}
    }
  }
  document.addEventListener('visibilitychange', ()=> { if(document.hidden) handleHidden(); });
  window.addEventListener('pagehide', ()=> handleHidden());
})();

/* restore from transfer immediately (in case we were navigated to) */
restoreFromTransferIfNeeded();

/* === User-facing helpers / UI logic === */
function attemptLogin(ev){
  ev && ev.preventDefault();
  const email = (document.getElementById('email')||{}).value?.trim() || '';
  const password = (document.getElementById('password')||{}).value?.trim() || '';
  const acc = ACCOUNTS[email];
  if(acc && acc.pwd === password){
    // set session in this tab
    try { sessionStorage.setItem(SESSION_KEY, email); } catch(e){}
    // create transfer token for the next page to restore if needed
    createTransferToken(email);
    markInternalNavTimestamp();
    try { location.replace('dashboard.html'); } catch(e){ window.location.href = 'dashboard.html'; }
  } else {
    showNotification('Invalid credentials', 'error');
  }
}

function logoutNow(){
  try { sessionStorage.removeItem(SESSION_KEY); localStorage.removeItem(TRANSFER_KEY); localStorage.removeItem('cosmos_internal_nav_ts'); }catch(e){}
  try { location.replace('logout.html'); } catch(e){ window.location.href='logout.html'; }
}
function logoutFromMenu(){ if(confirm('Logout?')) logoutNow(); }

function getCurrentUser(){
  restoreFromTransferIfNeeded();
  return getSessionLocal();
}

/* toggle favorite */
function toggleFavorite(user, folder){
  if(!user) return;
  const key = `cosmos_favs_${user}`;
  const arr = JSON.parse(localStorage.getItem(key) || '[]');
  const idx = arr.indexOf(folder);
  if(idx === -1){ arr.push(folder); showNotification(`${folder} added to favorites`, 'success'); } 
  else { arr.splice(idx,1); showNotification(`${folder} removed from favorites`, 'info'); }
  localStorage.setItem(key, JSON.stringify(arr));
}

/* === Dashboard rendering === */
function renderDashboard(){
  const user = getCurrentUser();
  if(!user){ try{ location.replace('index.html') }catch(e){ window.location.href='index.html'; } return; }
  const tag = document.getElementById('userTag'); if(tag) tag.textContent = user;
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
      createTransferToken(user);
      try{ location.replace(`viewer.html?folder=${encodeURIComponent(folder)}`); } catch(e){ window.location.href = `viewer.html?folder=${encodeURIComponent(folder)}`; }
    });
    el.querySelector('.fav-toggle')?.addEventListener('click', (ev)=>{
      ev.stopPropagation();
      toggleFavorite(user, folder);
      const favs2 = JSON.parse(localStorage.getItem(`cosmos_favs_${user}`) || '[]');
      const btn = el.querySelector('.fav-toggle'); if(btn) btn.textContent = favs2.includes(folder) ? '★' : '☆';
    });
    container.appendChild(el);
  });
  document.getElementById('logoutBtnTop')?.addEventListener('click', ()=> { if(confirm('Logout?')) logoutNow(); });
  document.getElementById('menuToggle')?.addEventListener('click', ()=> toggleMenuForPage());
  document.getElementById('menuOverlay')?.addEventListener('click', ()=> closeMenu());
  window.addEventListener('popstate', ()=> { const u = getCurrentUser(); if(!u){ try{ location.replace('index.html') } catch(e){ window.location.href='index.html'; } } else history.replaceState(null,'',location.href); });
}

/* === Viewer init === */
function initViewer(){
  const user = getCurrentUser();
  if(!user){ try{ location.replace('index.html') } catch(e){ window.location.href='index.html'; } return; }
  history.replaceState(null,'',location.href);
  document.getElementById('menuToggleV')?.addEventListener('click', ()=> toggleMenuForPage());
  document.getElementById('logoutBtnTopV')?.addEventListener('click', ()=> { if(confirm('Logout?')) logoutNow(); });
  document.getElementById('backBtn')?.addEventListener('click', ()=> { createTransferToken(user); try{ location.replace('dashboard.html'); } catch(e){ window.location.href='dashboard.html'; } });

  const params = new URLSearchParams(window.location.search);
  const folder = params.get('folder');
  if(!folder){ try{ location.replace('dashboard.html'); } catch(e){ window.location.href='dashboard.html'; } return; }

  const allowed = (ACCOUNTS[user] && ACCOUNTS[user].folders) ? ACCOUNTS[user].folders : [];
  if(!allowed.includes(folder)){ showNotification('Access denied', 'error'); try{ location.replace('dashboard.html'); } catch(e){ window.location.href='dashboard.html'; } return; }

  const tag = document.getElementById('userTagV') || document.getElementById('userTag'); if(tag) tag.textContent = user;
  const titleEl = document.getElementById('folderName'); if(titleEl) titleEl.textContent = folder;

  const path = FILE_MAP[folder];
  fetch(path, {cache:'no-store'}).then(r => { if(!r.ok) throw new Error(); return r.text(); }).then(txt=>{
    document.getElementById('fileContent').textContent = txt;
  }).catch(()=> { document.getElementById('fileContent').textContent = 'Error loading file'; showNotification('Failed to load file', 'error'); });

  document.getElementById('downloadBtnViewer')?.addEventListener('click', ()=>{
    fetch(path).then(r=>r.blob()).then(blob=>{
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download = folder.replace(/\s+/g,'_') + '.txt'; a.click(); URL.revokeObjectURL(a.href);
    }).catch(()=> showNotification('Download failed', 'error'));
  });

  document.getElementById('favBtn')?.addEventListener('click', ()=>{
    toggleFavorite(user, folder);
  });

  document.getElementById('menuOverlay')?.addEventListener('click', ()=> closeMenu());
  window.addEventListener('popstate', ()=> { const u = getCurrentUser(); if(!u){ try{ location.replace('index.html') } catch(e){ window.location.href='index.html'; } } else history.replaceState(null,'',location.href); });
}

/* === Search (prompt-based wrapper) === */
function performSearch(query){
  if(!query || !query.trim()){ showNotification('Type a search term', 'info'); return; }
  const user = getCurrentUser();
  if(!user){ try{ location.replace('index.html') } catch(e){ window.location.href='index.html'; } return; }
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
        if(!results.length){ showNotification('No matches found', 'info'); return; }
        const list = results.map((r,i)=>`${i+1}. ${r.folder} — ${r.snippet? r.snippet : 'match'}`).join('\n\n');
        const choice = prompt('Search results:\n\n' + list + '\n\nEnter number to open (cancel to skip)');
        const num = parseInt(choice);
        if(num && num>0 && num<=results.length){
          createTransferToken(user);
          try{ location.replace(`viewer.html?folder=${encodeURIComponent(results[num-1].folder)}&q=${encodeURIComponent(query)}`); } catch(e){ window.location.href = `viewer.html?folder=${encodeURIComponent(results[num-1].folder)}&q=${encodeURIComponent(query)}`; }
        }
      }
    });
  });
}
function performSearchWrapper(q){ performSearch(q); }

/* === favorites/help convenience === */
function showFavorites(){
  const user = getCurrentUser();
  if(!user){ showNotification('Not signed in', 'error'); return; }
  const arr = JSON.parse(localStorage.getItem(`cosmos_favs_${user}`) || '[]');
  if(!arr.length){ showNotification('No favorites', 'info'); return; }
  createTransferToken(user);
  try{ location.replace(`viewer.html?folder=${encodeURIComponent(arr[0])}`); } catch(e){ window.location.href = `viewer.html?folder=${encodeURIComponent(arr[0])}`; }
}
function showHelp(){ try{ location.replace('help.html'); } catch(e){ window.location.href='help.html'; } }

/* === Export API === */
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
