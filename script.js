/* script.js - Cosmos app (auth + viewer + search + favorites + menu handling) */

/* --- Accounts & folders (plain in this version) --- */
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

/* --- Session helpers --- */
function setSession(email){ sessionStorage.setItem('cosmos_user', email); }
function clearSession(){ sessionStorage.removeItem('cosmos_user'); }
function getSession(){ return sessionStorage.getItem('cosmos_user'); }

/* --- Menu & overlay helpers --- */
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
  const email = (document.getElementById('email')||{}).value || '';
  const pass = (document.getElementById('password')||{}).value || '';
  const acc = ACCOUNTS[email];
  if(acc && acc.pwd === pass){
    setSession(email);
    // prevent back to login
    location.replace('dashboard.html');
  } else alert('Invalid credentials');
}
function logoutNow(){ clearSession(); location.replace('logout.html'); }
function logoutFromMenu(){ if(confirm('Logout?')) logoutNow(); }

/* --- Dashboard rendering --- */
function renderDashboard(){
  const user = getSession();
  if(!user){ location.replace('index.html'); return; }
  history.replaceState(null,'',location.href);
  document.getElementById('userTag').textContent = user;
  const allowed = (ACCOUNTS[user] && ACCOUNTS[user].folders) ? ACCOUNTS[user].folders : [];
  const container = document.getElementById('folders');
  if(!container) return;
  container.innerHTML = '';
  allowed.forEach(f=>{
    const el = document.createElement('div');
    el.className = 'folder';
    const favs = JSON.parse(localStorage.getItem(`cosmos_favs_${user}`) || '[]');
    const star = favs.includes(f) ? '★' : '☆';
    el.innerHTML = `<div style="display:flex;gap:10px;align-items:center"><span>${f}</span><button class="btn small-btn fav-toggle">${star}</button></div><span class="small">View</span>`;
    el.addEventListener('click', ()=> location.replace(`viewer.html?folder=${encodeURIComponent(f)}`));
    el.querySelector('.fav-toggle').addEventListener('click', (ev)=>{
      ev.stopPropagation();
      toggleFavorite(user, f, el);
    });
    container.appendChild(el);
  });

  document.getElementById('logoutBtnTop')?.addEventListener('click', ()=> { if(confirm('Logout?')) logoutNow(); });
  window.addEventListener('popstate', ()=> { if(!getSession()) location.replace('index.html'); else history.replaceState(null,'',location.href); });
}

/* favorite toggle helper */
function toggleFavorite(user, folder, el){
  const key = `cosmos_favs_${user}`;
  const arr = JSON.parse(localStorage.getItem(key) || '[]');
  const idx = arr.indexOf(folder);
  if(idx === -1) arr.push(folder); else arr.splice(idx,1);
  localStorage.setItem(key, JSON.stringify(arr));
  // update UI star if element passed
  if(el){
    const btn = el.querySelector('.fav-toggle');
    if(btn) btn.textContent = arr.includes(folder) ? '★' : '☆';
  }
}

/* --- Viewer --- */
function initViewer(){
  const user = getSession();
  if(!user){ location.replace('index.html'); return; }
  history.replaceState(null,'',location.href);

  const params = new URLSearchParams(window.location.search);
  const folder = params.get('folder');
  if(!folder){ location.replace('dashboard.html'); return; }
  const allowed = (ACCOUNTS[user] && ACCOUNTS[user].folders) ? ACCOUNTS[user].folders : [];
  if(!allowed.includes(folder)){ alert('Access denied'); location.replace('dashboard.html'); return; }

  document.getElementById('userTagV').textContent = user;
  document.getElementById('folderName').textContent = folder;

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
    alert('Toggled favorite for ' + folder);
  });

  document.getElementById('backBtn')?.addEventListener('click', ()=> location.replace('dashboard.html'));
  document.getElementById('menuToggleV')?.addEventListener('click', ()=> toggleMenu('sideMenuV'));
  document.getElementById('logoutBtnTopV')?.addEventListener('click', ()=> { if(confirm('Logout?')) logoutNow(); });

  window.addEventListener('popstate', ()=> { if(!getSession()) location.replace('index.html'); else history.replaceState(null,'',location.href); });
}

/* --- Search (scans allowed files) --- */
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
      if((folder.toLowerCase().includes(lc)) || (txt && txt.toLowerCase().includes(lc))) {
        // snippet
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
        // show results in prompt-like list and open chosen
        const list = results.map((r,i)=>`${i+1}. ${r.folder} — ${r.snippet? r.snippet : 'match'}`).join('\n\n');
        const choice = prompt('Search results:\n\n' + list + '\n\nEnter number to open (cancel to skip)');
        const num = parseInt(choice);
        if(num && num>0 && num<=results.length) location.replace(`viewer.html?folder=${encodeURIComponent(results[num-1].folder)}`);
      }
    });
  });
}

/* wrapper named LW.performSearch to avoid name clash */
function performSearchWrapper(q){
  performSearch(q);
}

/* --- Favorites / Help quick functions for menu pages --- */
function openFavoritesPage(){ location.replace('favorites.html'); }
function openHelpPage(){ location.replace('help.html'); }

/* --- Expose API --- */
window.LW = {
  attemptLogin,
  renderDashboard,
  initViewer,
  logoutFromMenu,
  logoutNow,
  performSearch: performSearchWrapper,
  performSearchDirect: performSearch,
  toggleFavorite,
  openFavoritesPage,
  openHelpPage,
  getSession
};
