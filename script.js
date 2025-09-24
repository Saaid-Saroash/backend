/* Cosmos: client-side read-only app (static) */
/* Folders + accounts */
const ALL_FOLDERS = ["backend cmds","instagram","toutatis","dead zone","codes","blueprints","prototypes"];

const ACCOUNTS = {
  "hackersworld@backend.com": { pwd: "sro43kl", folders: ["backend cmds","instagram","toutatis","dead zone"] },
  "saaidsaroash@personal.com": { pwd: "saaidsaroash772009", folders: ["codes","blueprints","prototypes"] },
  "hackersuniverse@unkown.com": { pwd: "26112009", folders: ALL_FOLDERS.slice() }
};

/* Session helpers */
function setSession(email){ sessionStorage.setItem("cosmos_user", email); }
function clearSession(){ sessionStorage.removeItem("cosmos_user"); }
function getSession(){ return sessionStorage.getItem("cosmos_user"); }

/* NAV / MENU helpers */
function openMenu(menuId){ const m = document.getElementById(menuId); if(m){ m.style.transform = "translateX(0)"; m.setAttribute('aria-hidden','false'); document.body.classList.add('menu-open'); }}
function closeMenu(){ const sm = document.querySelectorAll('.side-menu'); sm.forEach(m=>{ m.style.transform = "translateX(-110%)"; m.setAttribute('aria-hidden','true'); }); document.body.classList.remove('menu-open'); }
function toggleMenu(menuId){ const m = document.getElementById(menuId); if(!m) return; const hidden = m.getAttribute('aria-hidden') === 'true'; if(hidden) openMenu(menuId); else closeMenu(); }

/* LOGIN */
function attemptLogin(ev){
  ev && ev.preventDefault();
  const email = (document.getElementById('email')||{}).value?.trim() || '';
  const pass = (document.getElementById('password')||{}).value?.trim() || '';
  const acc = ACCOUNTS[email];
  if(acc && acc.pwd === pass){
    setSession(email);
    // replace so login won't be reachable by back
    location.replace('dashboard.html');
  } else {
    alert('Invalid credentials');
  }
}

/* Logout helper used by menu and top buttons */
function logoutNow(){
  clearSession();
  // replace to remove protected pages from history
  location.replace('index.html');
}
function logoutFromMenu(){ if(confirm('Logout?')) logoutNow(); }

/* DASHBOARD */
function renderDashboard(){
  const user = getSession();
  if(!user){ location.replace('index.html'); return; }
  // ensure protected history behavior
  history.replaceState(null, '', location.href);

  const tag = document.getElementById('userTag');
  if(tag) tag.textContent = user;
  const allowed = ACCOUNTS[user].folders || [];
  const container = document.getElementById('folders');
  if(!container) return;
  container.innerHTML = '';
  allowed.forEach(f => {
    const el = document.createElement('div');
    el.className = 'folder';
    el.innerHTML = `<span>${f}</span><span class="small">view</span>`;
    el.addEventListener('click', ()=> location.replace(`viewer.html?folder=${encodeURIComponent(f)}`));
    container.appendChild(el);
  });

  // top nav events
  const menuToggle = document.getElementById('menuToggle');
  if(menuToggle) menuToggle.addEventListener('click', ()=> toggleMenu('sideMenu'));
  const logoutBtnTop = document.getElementById('logoutBtnTop');
  if(logoutBtnTop) logoutBtnTop.addEventListener('click', ()=> { if(confirm('Logout?')) logoutNow(); });

  // extra quick action
  const openAllBtn = document.getElementById('openAllBtn');
  if(openAllBtn && allowed[0]) openAllBtn.addEventListener('click', ()=> location.replace(`viewer.html?folder=${encodeURIComponent(allowed[0])}`));

  // back-protection
  window.addEventListener('popstate', ()=> { if(!getSession()) location.replace('index.html'); else history.replaceState(null, '', location.href); });
}

/* VIEWER */
function initViewer(){
  const user = getSession();
  if(!user){ location.replace('index.html'); return; }
  history.replaceState(null, '', location.href);

  // nav/menu wiring
  const menuToggle = document.getElementById('menuToggleV');
  if(menuToggle) menuToggle.addEventListener('click', ()=> toggleMenu('sideMenuV'));
  const logoutBtnTopV = document.getElementById('logoutBtnTopV');
  if(logoutBtnTopV) logoutBtnTopV.addEventListener('click', ()=> { if(confirm('Logout?')) logoutNow(); });
  const backBtn = document.getElementById('backBtn');
  if(backBtn) backBtn.addEventListener('click', ()=> location.replace('dashboard.html'));

  // load file
  const params = new URLSearchParams(window.location.search);
  const folder = params.get('folder');
  if(!folder){ location.replace('dashboard.html'); return; }
  const allowed = ACCOUNTS[user].folders || [];
  if(!allowed.includes(folder)){ alert('Access denied'); location.replace('dashboard.html'); return; }

  // show metadata
  const tag = document.getElementById('userTagV') || document.getElementById('userTag');
  if(tag) tag.textContent = user;
  const title = document.getElementById('folderName');
  if(title) title.textContent = folder;

  const fileMap = {
    "backend cmds": "files/backend_cmds.txt",
    "instagram": "files/instagram.txt",
    "toutatis": "files/toutatis.txt",
    "dead zone": "files/dead_zone.txt",
    "codes": "files/codes.txt",
    "blueprints": "files/blueprints.txt",
    "prototypes": "files/prototypes.txt"
  };

  const path = fileMap[folder];
  fetch(path, {cache: "no-store"})
    .then(resp => {
      if(!resp.ok) throw new Error('Fetch error');
      return resp.text();
    })
    .then(txt => {
      const pre = document.getElementById('fileContent');
      if(pre) pre.textContent = txt;
    })
    .catch(()=> {
      const pre = document.getElementById('fileContent');
      if(pre) pre.textContent = 'Error loading file';
    });

  // download button
  const downloadBtn = document.getElementById('downloadBtnViewer');
  if(downloadBtn){
    downloadBtn.addEventListener('click', ()=>{
      fetch(path).then(r=>r.blob()).then(blob=>{
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = folder.replace(/\s+/g,'_') + '.txt';
        a.click();
        URL.revokeObjectURL(a.href);
      }).catch(()=> alert('Download failed'));
    });
  }

  // ensure back protection after logout
  window.addEventListener('popstate', ()=> { if(!getSession()) location.replace('index.html'); else history.replaceState(null,'',location.href); });
}

/* small helpers for linking from menu */
function showAllFiles(){
  const u = getSession();
  if(!u) return;
  const allowed = ACCOUNTS[u].folders || [];
  if(!allowed.length) return;
  // open first allowed file
  location.replace(`viewer.html?folder=${encodeURIComponent(allowed[0])}`);
}

/* API exported */
window.LW = {
  attemptLogin,
  renderDashboard,
  initViewer,
  logoutFromMenu,
  logoutNow,
  getSession
};
