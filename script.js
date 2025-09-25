/* script.js - Cosmos app (robust, debugged)
   - localStorage session (cosmos_user)
   - internal nav timestamp marking (cosmos_internal_nav_ts)
   - visibility/pagehide clears session except for internal nav within THRESH ms
   - anchor/pointer/form/key intercepts + overridden location.replace/assign
   - functions exported via window.LW for HTML pages
*/

/* --- Config --- */
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

/* --- Storage helpers --- */
const USER_KEY = 'cosmos_user';
const INTERNAL_KEY = 'cosmos_internal_nav_ts';
function setSession(email){ try{ localStorage.setItem(USER_KEY, email); } catch(e){} }
function clearSession(){ try{ localStorage.removeItem(USER_KEY); } catch(e){} }
function getSession(){ try{ return localStorage.getItem(USER_KEY); } catch(e){ return null; } }

/* --- Internal nav marking --- */
function markInternalNav(){
  try { localStorage.setItem(INTERNAL_KEY, String(Date.now())); } catch(e){}
}

/* --- Install interceptors: programmatic + user actions --- */
(function installNavInterceptors(){
  // override location.replace and assign to mark internal nav
  try {
    const nativeReplace = window.location.replace.bind(window.location);
    window.location.replace = function(url){
      markInternalNav();
      return nativeReplace(url);
    };
    if(window.location.assign){
      const nativeAssign = window.location.assign.bind(window.location);
      window.location.assign = function(url){
        markInternalNav();
        return nativeAssign(url);
      };
    }
  } catch(e){ console.warn('Could not override location methods', e); }

  // pointerdown earliest user event before navigation
  document.addEventListener('pointerdown', function(ev){
    const a = ev.target.closest && ev.target.closest('a');
    const btn = ev.target.closest && ev.target.closest('button');
    const form = ev.target.closest && ev.target.closest('form');
    if(a && a.href && a.target !== '_blank'){
      try {
        const url = new URL(a.href, location.href);
        if(url.origin === location.origin && url.protocol.startsWith('http')) markInternalNav();
      } catch(e){}
    } else if(btn || form){
      markInternalNav();
    }
  }, {capture:true, passive:true});

  // click fallback
  document.addEventListener('click', function(ev){
    const a = ev.target.closest && ev.target.closest('a');
    if(a && a.href && a.target !== '_blank'){
      try {
        const url = new URL(a.href, location.href);
        if(url.origin === location.origin && url.protocol.startsWith('http')) markInternalNav();
      } catch(e){}
    }
  }, {capture:true});

  // keydown (Enter) marking
  document.addEventListener('keydown', function(ev){
    if(ev.key === 'Enter'){
      const active = document.activeElement;
      if(active){
        if(['A','BUTTON','INPUT','TEXTAREA','SELECT'].includes(active.tagName)) markInternalNav();
        else {
          const a = active.closest && active.closest('a');
          const btn = active.closest && active.closest('button');
          if(a || btn) markInternalNav();
        }
      }
    }
  }, {capture:true});

  // form submit
  document.addEventListener('submit', function(ev){
    markInternalNav();
  }, {capture:true});
})();

/* --- Visibility/pagehide handler --- */
(function installVisibilityHandler(){
  const THRESH = 5000; // ms window to treat hidden as internal nav
  function handleHidden(){
    try {
      const tsRaw = localStorage.getItem(INTERNAL_KEY);
      if(tsRaw){
        const ts = parseInt(tsRaw,10) || 0;
        if(Date.now() - ts <= THRESH){
          // internal navigation -> remove flag and keep session
          localStorage.removeItem(INTERNAL_KEY);
          return;
        }
      }
      // not internal -> clear session
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(INTERNAL_KEY);
    } catch(e){
      try { localStorage.removeItem(USER_KEY); localStorage.removeItem(INTERNAL_KEY); } catch(_) {}
    }
  }
  document.addEventListener('visibilitychange', ()=> { if(document.hidden) handleHidden(); });
  window.addEventListener('pagehide', ()=> handleHidden());
})();

/* --- Menu helpers --- */
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
function toggleMenu(id){ const m=document.getElementById(id); if(!m) return; const hidden = m.getAttribute('aria-hidden')==='true'; if(hidden) openMenu(id); else closeMenu(); }

/* --- Auth --- */
function attemptLogin(ev){
  ev && ev.preventDefault();
  const email = (document.getElementById('email')||{}).value?.trim() || '';
  const pass = (document.getElementById('password')||{}).value?.trim() || '';
  const acc = ACCOUNTS[email];
  if(acc && acc.pwd === pass){
    setSession(email);
    markInternalNav(); // mark before navigating
    location.replace('dashboard.html');
  } else {
    alert('Invalid credentials');
  }
}
function logoutNow(){ localStorage.removeItem(USER_KEY); localStorage.removeItem(INTERNAL_KEY); location.replace('logout.html'); }
function logoutFromMenu(){ if(confirm('Logout?')) logoutNow(); }

/* --- Favorites --- */
function toggleFavorite(user, folder){
  if(!user) return;
  const key = `cosmos_favs_${user}`;
  const arr = JSON.parse(localStorage.getItem(key) || '[]');
  const idx = arr.indexOf(folder);
  if(idx === -1) arr.push(folder); else arr.splice(idx,1);
  localStorage.setItem(key, JSON.stringify(arr));
}

/* --- Dashboard rendering --- */
function renderDashboard(){
  const user = getSession();
  if(!user){ location.replace('index.html'); return; }
  history.replaceState(null,'',location.href);

  const tag = document.getElementById('userTag');
  if(tag) tag.textContent = user;

  const container = document.getElementById('folders');
  if(!container) return;
  container.innerHTML = '';
  const allowed = (ACCOUNTS[user] && ACCOUNTS[user].folders) ? ACCOUNTS[user].folders : [];

  allowed.forEach(f=>{
    const el = document.createElement('div');
    el.className = 'folder';
    const favs = JSON.parse(localStorage.getItem(`cosmos_favs_${user}`) || '[]');
    const star = favs.includes(f) ? '★' : '☆';
    el.innerHTML = `<div style="display:flex;gap:10px;align-items:center"><span>${f}</span><button class="btn small-btn fav-toggle">${star}</button></div><span class="small">View</span>`;

    el.addEventListener('click', ()=> {
      markInternalNav();
      location.replace(`viewer.html?folder=${encodeURIComponent(f)}`);
    });

    el.querySelector('.fav-toggle')?.addEventListener('click', (ev)=>{
      ev.stopPropagation();
      toggleFavorite(user, f);
      const favs2 = JSON.parse(localStorage.getItem(`cosmos_favs_${user}`) || '[]');
      const btn = el.querySelector('.fav-toggle');
      if(btn) btn.textContent = favs2.includes(f) ? '★' : '☆';
    });

    container.appendChild(el);
  });

  document.getElementById('logoutBtnTop')?.addEventListener('click', ()=> { if(confirm('Logout?')) logoutNow(); });
  document.getElementById('menuToggle')?.addEventListener('click', ()=> toggleMenu('sideMenu'));
  document.getElementById('menuOverlay')?.addEventListener('click', ()=> closeMenu());

  window.addEventListener('popstate', ()=> { if(!getSession()) location.replace('index.html'); else history.replaceState(null,'',location.href); });
}

/* --- Viewer --- */
function initViewer(){
  const user = getSession();
  if(!user){ location.replace('index.html'); return; }
  history.replaceState(null,'',location.href);

  document.getElementById('menuToggleV')?.addEventListener('click', ()=> toggleMenu('sideMenuV'));
  document.getElementById('logoutBtnTopV')?.addEventListener('click', ()=> { if(confirm('Logout?')) logoutNow(); });
  document.getElementById('backBtn')?.addEventListener('click', ()=> { markInternalNav(); location.replace('dashboard.html'); });

  const params = new URLSearchParams(window.location.search);
  const folder = params.get('folder');
  if(!folder){ location.replace('dashboard.html'); return; }
  const allowed = (ACCOUNTS[user] && ACCOUNTS[user].folders) ? ACCOUNTS[user].folders : [];
  if(!allowed.includes(folder)){ alert('Access denied'); location.replace('dashboard.html'); return; }

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
  window.addEventListener('popstate', ()=> { if(!getSession()) location.replace('index.html'); else history.replaceState(null,'',location.href); });
}

/* --- Search --- */
function performSearch(query){
  if(!query || !query.trim()){ alert('Type a search term'); return; }
  const user = getSession();
  if(!user){ location.replace('index.html'); return; }
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
          markInternalNav();
          location.replace(`viewer.html?folder=${encodeURIComponent(results[num-1].folder)}&q=${encodeURIComponent(query)}`);
        }
      }
    });
  });
}
function performSearchWrapper(q){ performSearch(q); }

/* --- Favorites / Help --- */
function showFavorites(){
  const user = getSession();
  if(!user){ alert('Not signed in'); return; }
  const arr = JSON.parse(localStorage.getItem(`cosmos_favs_${user}`) || '[]');
  if(!arr.length) alert('No favorites yet');
  else {
    markInternalNav();
    location.replace(`viewer.html?folder=${encodeURIComponent(arr[0])}`);
  }
}
function showHelp(){ alert('Help\nContact: hydramusic@gmail.com\nInstagram: @saaid_sarosh77'); }

/* --- Export API --- */
window.LW = {
  attemptLogin,
  renderDashboard,
  initViewer,
  logoutFromMenu,
  logoutNow,
  performSearch: performSearchWrapper,
  showFavorites,
  showHelp,
  getSession
};
