/* Cosmos: read-only static app with search & favorites */

/* --- config --- */
const ALL_FOLDERS = ["backend cmds","instagram","toutatis","dead zone","codes","blueprints","prototypes"];
const FILE_MAP = {
  "backend cmds": "files/backend_cmds.txt",
  "instagram": "files/instagram.txt",
  "toutatis": "files/toutatis.txt",
  "dead zone": "files/dead_zone.txt",
  "codes": "files/codes.txt",
  "blueprints": "files/blueprints.txt",
  "prototypes": "files/prototypes.txt"
};
const ACCOUNTS = {
  "hackersworld@backend.com": { pwd: "sro43kl", folders: ["backend cmds","instagram","toutatis","dead zone"] },
  "saaidsaroash@personal.com": { pwd: "saaidsaroash772009", folders: ["codes","blueprints","prototypes"] },
  "hackersuniverse@unkown.com": { pwd: "26112009", folders: ALL_FOLDERS.slice() }
};

/* --- session and storage keys --- */
function sessionKey(){ return 'cosmos_user'; }
function favKey(user){ return `cosmos_favs_${user}`; }

function setSession(email){ sessionStorage.setItem(sessionKey(), email); }
function clearSession(){ sessionStorage.removeItem(sessionKey()); }
function getSession(){ return sessionStorage.getItem(sessionKey()); }

/* --- title & favicon helper --- */
function setFaviconAndTitle(pageTag){
  const f = document.getElementById('favicon');
  if(f) f.href = 'assets/cosmos.jpg';
  if(pageTag) document.title = `cosmos-${pageTag}`;
}

/* --- menu helpers --- */
function openMenu(menuId){ const m=document.getElementById(menuId); if(m){ m.style.transform='translateX(0)'; m.setAttribute('aria-hidden','false'); document.body.classList.add('menu-open'); }}
function closeMenu(){ const sm=document.querySelectorAll('.side-menu'); sm.forEach(m=>{ m.style.transform='translateX(-110%)'; m.setAttribute('aria-hidden','true'); }); document.body.classList.remove('menu-open'); if(document.activeElement) document.activeElement.blur(); }
function toggleMenu(menuId){ const m=document.getElementById(menuId); if(!m) return; const hidden = m.getAttribute('aria-hidden') === 'true'; if(hidden) openMenu(menuId); else closeMenu(); }

/* --- favorites --- */
function getFavorites(user){ try{ return JSON.parse(localStorage.getItem(favKey(user))||'[]'); }catch(e){return [];} }
function setFavorites(user, arr){ localStorage.setItem(favKey(user), JSON.stringify(arr)); }
function isFavorite(user, folder){ return getFavorites(user).includes(folder); }
function toggleFavorite(user, folder){
  const favs = getFavorites(user);
  const idx = favs.indexOf(folder);
  if(idx === -1) favs.push(folder); else favs.splice(idx,1);
  setFavorites(user,favs);
}

/* --- login --- */
function attemptLogin(ev){
  ev && ev.preventDefault();
  const email = (document.getElementById('email')||{}).value?.trim() || '';
  const pass = (document.getElementById('password')||{}).value?.trim() || '';
  const acc = ACCOUNTS[email];
  if(acc && acc.pwd === pass){
    setSession(email);
    setFaviconAndTitle('dashboard');
    location.replace('dashboard.html');
  } else alert('Invalid credentials');
}
function logoutNow(){ clearSession(); location.replace('index.html'); }
function logoutFromMenu(){ if(confirm('Logout?')) logoutNow(); }

/* --- attach search UI on dashboard --- */
function attachDashboardUI(){
  // set favicon/title
  setFaviconAndTitle('dashboard');

  // search
  const sBtn = document.getElementById('searchBtn');
  const sIn = document.getElementById('searchInput');
  if(sBtn && sIn) sBtn.addEventListener('click', ()=> performSearchAndShow(sIn.value.trim()));
  if(sIn) sIn.addEventListener('keydown', e=> { if(e.key==='Enter') performSearchAndShow(sIn.value.trim()); });

  // overlay open
  const overlayBtn = document.getElementById('searchOverlayBtn');
  const overlayInput = document.getElementById('searchOverlayInput');
  if(overlayBtn && overlayInput) overlayBtn.addEventListener('click', ()=> performSearchAndShow(overlayInput.value.trim(), true));
  if(overlayInput) overlayInput.addEventListener('keydown', e=> { if(e.key==='Enter') performSearchAndShow(overlayInput.value.trim(), true); });

  // menu toggle
  const menuToggle = document.getElementById('menuToggle');
  if(menuToggle) menuToggle.addEventListener('click', ()=> toggleMenu('sideMenu'));

  // favorites link
  const favLink = document.getElementById('favoritesLink');
  if(favLink) favLink.addEventListener('click', ()=> showFavorites());

  // all files link
  const allLink = document.getElementById('allFilesLink');
  if(allLink) allLink.addEventListener('click', ()=> showAllFiles());
}

/* --- render dashboard --- */
function renderDashboard(){
  const user = getSession();
  if(!user){ location.replace('index.html'); return; }
  history.replaceState(null,'',location.href);
  setFaviconAndTitle('dashboard');

  const tag = document.getElementById('userTag');
  if(tag) tag.textContent = user;
  const allowed = ACCOUNTS[user].folders || [];
  const container = document.getElementById('folders');
  if(!container) return;
  container.innerHTML = '';
  allowed.forEach(f=>{
    const el = document.createElement('div');
    el.className = 'folder';
    const favMark = isFavorite(user,f) ? '★' : '☆';
    el.innerHTML = `<div style="display:flex;gap:10px;align-items:center"><span>${f}</span><button class="fav" title="toggle favorite">${favMark}</button></div><span class="small">view</span>`;
    el.querySelector('.fav').addEventListener('click', (ev)=>{
      ev.stopPropagation();
      toggleFavorite(user,f);
      renderDashboard(); // re-render to update mark
    });
    el.addEventListener('click', ()=> location.replace(`viewer.html?folder=${encodeURIComponent(f)}`));
    container.appendChild(el);
  });

  // menu / logout wiring
  const logoutBtnTop = document.getElementById('logoutBtnTop');
  if(logoutBtnTop) logoutBtnTop.addEventListener('click', ()=> { if(confirm('Logout?')) logoutNow(); });
  const menuToggle = document.getElementById('menuToggle');
  if(menuToggle) menuToggle.addEventListener('click', ()=> toggleMenu('sideMenu'));
  const openAllBtn = document.getElementById('openAllBtn');
  if(openAllBtn && allowed[0]) openAllBtn.addEventListener('click', ()=> location.replace(`viewer.html?folder=${encodeURIComponent(allowed[0])}`));

  window.addEventListener('popstate', ()=> { if(!getSession()) location.replace('index.html'); else history.replaceState(null,'',location.href); });
}

/* --- show favorites list --- */
function showFavorites(){
  const user = getSession(); if(!user){ alert('Not signed in'); return; }
  const favs = getFavorites(user);
  if(!favs.length){ alert('No favorites yet'); return; }
  // open first favorite
  location.replace(`viewer.html?folder=${encodeURIComponent(favs[0])}`);
}

/* --- show all files (open first) --- */
function showAllFiles(){ const u=getSession(); if(!u) return; const allowed = ACCOUNTS[u].folders||[]; if(allowed[0]) location.replace(`viewer.html?folder=${encodeURIComponent(allowed[0])}`); }

/* --- Search: fetch allowed files, search content and filenames --- */
function performSearchAndShow(query, openOverlay=false){
  if(!query || !query.trim()){ alert('Type search term'); return; }
  const user = getSession(); if(!user){ location.replace('index.html'); return; }
  const allowed = ACCOUNTS[user].folders || [];
  if(!allowed.length){ alert('No files'); return; }

  // show overlay if requested
  if(openOverlay) { openSearchOverlay(); document.getElementById('searchOverlayInput').value = query; }

  const results = [];
  const lcq = query.toLowerCase();

  // fetch all allowed files (parallel)
  const fetches = allowed.map(folder=>{
    const path = FILE_MAP[folder];
    return fetch(path, {cache:'no-store'}).then(r => {
      if(!r.ok) return {folder, text: ''};
      return r.text().then(text => ({folder, text}));
    }).catch(()=> ({folder, text:''}));
  });

  Promise.all(fetches).then(arr=>{
    arr.forEach(item=>{
      const {folder, text} = item;
      const matchInName = folder.toLowerCase().includes(lcq);
      const matchInContent = (text || '').toLowerCase().includes(lcq);
      if(matchInName || matchInContent){
        let snippet = '';
        if(matchInContent){
          const idx = text.toLowerCase().indexOf(lcq);
          const start = Math.max(0, idx - 60);
          const end = Math.min(text.length, idx + 60);
          snippet = (text.substring(start, end)).replace(/\n/g,' ');
        }
        results.push({folder, snippet});
      }
    });

    showSearchResults(results, query);
  });
}

/* --- Search overlay UI --- */
function openSearchOverlay(){ const o=document.getElementById('searchOverlay'); if(o) o.style.display='flex'; }
function closeSearchOverlay(){ const o=document.getElementById('searchOverlay'); if(o) o.style.display='none'; }
function showSearchResults(results, query){
  const box = document.getElementById('searchResults');
  if(!box) return;
  box.innerHTML = '';
  if(!results.length){
    box.innerHTML = `<div class="small">No results for "<strong>${escapeHtml(query)}</strong>"</div>`;
    return;
  }
  results.forEach(r=>{
    const node = document.createElement('div');
    node.className = 'box';
    node.style.marginBottom = '8px';
    const snippet = r.snippet ? escapeHtml(r.snippet) : '<i>No snippet</i>';
    node.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><div style="font-weight:800">${escapeHtml(r.folder)}</div><div><button class="btn" onclick="location.replace('viewer.html?folder=${encodeURIComponent(r.folder)}&q=${encodeURIComponent(query)}')">Open</button></div></div><div class="small" style="margin-top:6px">${snippet}</div>`;
    box.appendChild(node);
  });
}

/* --- Viewer init (loads file, supports highlighting & favorites) --- */
function escapeHtml(s){ if(!s) return ''; return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function highlightText(text, q){
  if(!q) return escapeHtml(text);
  const safeQ = q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const re = new RegExp(safeQ, 'ig');
  // split and replace with <mark>
  return escapeHtml(text).replace(re, match => `<mark>${escapeHtml(match)}</mark>`);
}

function initViewer(){
  const user = getSession();
  if(!user){ location.replace('index.html'); return; }
  history.replaceState(null,'',location.href);
  setFaviconAndTitle('viewer');

  // nav wiring
  const menuToggle = document.getElementById('menuToggleV') || document.getElementById('menuToggle');
  if(menuToggle) menuToggle.addEventListener('click', ()=> toggleMenu('sideMenuV'));

  const logoutBtnTopV = document.getElementById('logoutBtnTopV') || document.getElementById('logoutBtnTop');
  if(logoutBtnTopV) logoutBtnTopV.addEventListener('click', ()=> { if(confirm('Logout?')) logoutNow(); });

  const searchBtnV = document.getElementById('searchBtnV') || document.getElementById('searchBtn');
  const searchInV = document.getElementById('searchInputV') || document.getElementById('searchInput');
  if(searchBtnV && searchInV) searchBtnV.addEventListener('click', ()=> performSearchAndShow(searchInV.value.trim(), true));
  if(searchInV) searchInV.addEventListener('keydown', e=> { if
