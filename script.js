/* script.js - Cosmos app
   Fix: mark same-origin anchor clicks as internal nav so visibility handler
   doesn't clear session on internal navigation.
*/

/* --- Accounts & folders --- */
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

/* --- session helpers --- */
function setSession(email){ sessionStorage.setItem('cosmos_user', email); }
function clearSession(){ sessionStorage.removeItem('cosmos_user'); }
function getSession(){ return sessionStorage.getItem('cosmos_user'); }

/* --- INTERNAL NAV FLAG ---
   Set sessionStorage 'cosmos_internal_nav' before internal navigations
*/

/* 1) Intercept programmatic navigations (replace/assign) */
(function installNavInterceptor(){
  try {
    const nativeReplace = window.location.replace.bind(window.location);
    window.location.replace = function(url){
      try { sessionStorage.setItem('cosmos_internal_nav','1'); } catch(e){}
      return nativeReplace(url);
    };
    const nativeAssign = window.location.assign ? window.location.assign.bind(window.location) : null;
    if(nativeAssign){
      window.location.assign = function(url){
        try { sessionStorage.setItem('cosmos_internal_nav','1'); } catch(e){}
        return nativeAssign(url);
      };
    }
  } catch(e){ console.warn('nav interceptor not installed', e); }
})();

/* 2) Intercept user link clicks (same-origin anchors) */
(function installAnchorInterceptor(){
  document.addEventListener('click', function(e){
    // find nearest anchor element
    const a = e.target.closest && e.target.closest('a');
    if(!a || !a.href) return;
    try {
      const href = a.href;
      const url = new URL(href, location.href);
      // only mark internal navigations (same origin, and not just hash navigation)
      if(url.origin === location.origin){
        // allow mailto/tel etc to pass
        if(url.protocol.startsWith('http')){
          sessionStorage.setItem('cosmos_internal_nav','1');
        }
      }
    } catch(err){
      // ignore malformed hrefs
    }
  }, true); // use capture to run early
})();

/* --- centralized visibility / pagehide handler --- */
(function installVisibilityHandler(){
  function handleHidden(){
    try {
      const internal = sessionStorage.getItem('cosmos_internal_nav');
      if(internal){
        // internal nav: remove flag and keep session
        sessionStorage.removeItem('cosmos_internal_nav');
      } else {
        // actual leave/tab-switch: clear session
        sessionStorage.removeItem('cosmos_user');
      }
    } catch(e){
      try { sessionStorage.removeItem('cosmos_user'); } catch(_) {}
    }
  }
  document.addEventListener('visibilitychange', () => {
    if(document.hidden) handleHidden();
  });
  window.addEventListener('pagehide', (ev) => { handleHidden(); });
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
    // navigation will be intercepted and flag set
    location.replace('dashboard.html');
  } else alert('Invalid credentials');
}
function logoutNow(){ clearSession(); location.replace('logout.html'); }
function logoutFromMenu(){ if(confirm('Logout?')) logoutNow(); }

/* --- Favorites helper --- */
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
      try{ sessionStorage.setItem('cosmos_internal_nav','1'); } catch(e){}
      location.replace(`viewer.html?folder=${encodeURIComponent(f)}`);
    });

    el.querySelector('.fav-toggle')?.addEventListener('click', (ev)=>{
      ev.stopPropagation();
      toggleFavorite(user, f);
      // update UI
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
  document.getElementById('backBtn')?.addEventListener('click', ()=> {
    try{ sessionStorage.setItem('cosmos_internal_nav','1'); } catch(e){}
    location.replace('dashboard.html');
  });

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
          try{ sessionStorage.setItem('cosmos_internal_nav','1'); } catch(e){}
          location.replace(`viewer.html?folder=${encodeURIComponent(results[num-1].folder)}&q=${encodeURIComponent(query)}`);
        }
      }
    });
  });
}

/* convenience wrapper */
function performSearchWrapper(q){ performSearch(q); }

/* --- Favorites / Help --- */
function showFavorites(){
  const user = getSession();
  if(!user){ alert('Not signed in'); return; }
  const arr = JSON.parse(localStorage.getItem(`cosmos_favs_${user}`) || '[]');
  if(!arr.length) alert('No favorites yet');
  else {
    try{ sessionStorage.setItem('cosmos_internal_nav','1'); } catch(e){}
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
