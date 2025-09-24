/* Cosmos: client-side read-only app */

/* --- Accounts and folders --- */
const ALL_FOLDERS = [
  "backend cmds","instagram","toutatis","dead zone",
  "codes","blueprints","prototypes"
];

const ACCOUNTS = {
  "hackersworld@backend.com": {
    pwd: "sro43kl",
    folders: ["backend cmds","instagram","toutatis","dead zone"]
  },
  "saaidsaroash@personal.com": {
    pwd: "saaidsaroash772009",
    folders: ["codes","blueprints","prototypes"]
  },
  "hackersuniverse@unkown.com": {
    pwd: "26112009",
    folders: ALL_FOLDERS.slice()
  }
};

/* --- Session helpers --- */
function setSession(email){ sessionStorage.setItem("cosmos_user", email); }
function clearSession(){ sessionStorage.removeItem("cosmos_user"); }
function getSession(){ return sessionStorage.getItem("cosmos_user"); }

/* --- Menu helpers --- */
function openMenu(menuId){
  const m = document.getElementById(menuId);
  if(m){
    m.style.transform = "translateX(0)";
    m.setAttribute('aria-hidden','false');
    document.body.classList.add('menu-open');
  }
}
function closeMenu(){
  const sm = document.querySelectorAll('.side-menu');
  sm.forEach(m=>{
    m.style.transform = "translateX(-110%)";
    m.setAttribute('aria-hidden','true');
  });
  document.body.classList.remove('menu-open');
  if(document.activeElement) document.activeElement.blur();
}
function toggleMenu(menuId){
  const m = document.getElementById(menuId);
  if(!m) return;
  const hidden = m.getAttribute('aria-hidden') === 'true';
  if(hidden) openMenu(menuId); else closeMenu();
}

/* --- Login --- */
function attemptLogin(ev){
  ev && ev.preventDefault();
  const email = document.getElementById('email')?.value?.trim() || '';
  const pass = document.getElementById('password')?.value?.trim() || '';
  const acc = ACCOUNTS[email];
  if(acc && acc.pwd === pass){
    setSession(email);
    location.replace('dashboard.html');
  } else {
    alert('Invalid credentials');
  }
}

/* --- Logout --- */
function logoutNow(){
  clearSession();
  location.replace('index.html');
}
function logoutFromMenu(){
  if(confirm('Logout?')) logoutNow();
}

/* --- Dashboard --- */
function renderDashboard(){
  const user = getSession();
  if(!user){ location.replace('index.html'); return; }
  history.replaceState(null, '', location.href);

  const tag = document.getElementById('userTag');
  if(tag) tag.textContent = user;

  const allowed = ACCOUNTS[user].folders || [];
  const container = document.getElementById('folders');
  if(container){
    container.innerHTML = '';
    allowed.forEach(f => {
      const el = document.createElement('div');
      el.className = 'folder';
      el.innerHTML = `<span>${f}</span><span class="small">view</span>`;
      el.addEventListener('click', ()=>{
        location.replace(`viewer.html?folder=${encodeURIComponent(f)}`);
      });
      container.appendChild(el);
    });
  }

  document.getElementById('menuToggle')?.addEventListener('click', ()=>toggleMenu('sideMenu'));
  document.getElementById('logoutBtnTop')?.addEventListener('click', ()=>{ if(confirm('Logout?')) logoutNow(); });

  window.addEventListener('popstate', ()=>{
    if(!getSession()) location.replace('index.html');
    else history.replaceState(null, '', location.href);
  });
}

/* --- Viewer --- */
function initViewer(){
  const user = getSession();
  if(!user){ location.replace('index.html'); return; }
  history.replaceState(null, '', location.href);

  document.getElementById('menuToggleV')?.addEventListener('click', ()=>toggleMenu('sideMenuV'));
  document.getElementById('logoutBtnTopV')?.addEventListener('click', ()=>{ if(confirm('Logout?')) logoutNow(); });
  document.getElementById('backBtn')?.addEventListener('click', ()=>location.replace('dashboard.html'));

  const params = new URLSearchParams(window.location.search);
  const folder = params.get('folder');
  if(!folder){ location.replace('dashboard.html'); return; }

  const allowed = ACCOUNTS[user].folders || [];
  if(!allowed.includes(folder)){
    alert('Access denied');
    location.replace('dashboard.html');
    return;
  }

  document.getElementById('userTagV').textContent = user;
  document.getElementById('folderName').textContent = folder;

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
  fetch(path,{cache:"no-store"})
    .then(r=>r.ok?r.text():Promise.reject())
    .then(txt=>{
      document.getElementById('fileContent').textContent = txt;
    })
    .catch(()=>{ document.getElementById('fileContent').textContent = 'Error loading file'; });

  document.getElementById('downloadBtnViewer')?.addEventListener('click', ()=>{
    fetch(path).then(r=>r.blob()).then(blob=>{
      const a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download=folder.replace(/\s+/g,'_')+'.txt';
      a.click();
      URL.revokeObjectURL(a.href);
    });
  });

  document.getElementById('favBtn')?.addEventListener('click', ()=>{
    let favs = JSON.parse(localStorage.getItem('cosmos_favs')||'[]');
    if(!favs.includes(folder)) favs.push(folder);
    localStorage.setItem('cosmos_favs', JSON.stringify(favs));
    alert(folder+' added to favorites');
  });

  window.addEventListener('popstate', ()=>{
    if(!getSession()) location.replace('index.html');
    else history.replaceState(null,'',location.href);
  });
}

/* --- Search --- */
function searchSite(){
  const user=getSession();
  if(!user) return;
  const allowed=ACCOUNTS[user].folders||[];
  const q=prompt('Enter a word to search:');
  if(!q) return;
  const results=[];
  let done=0;
  allowed.forEach(f=>{
    const path={
      "backend cmds":"files/backend_cmds.txt",
      "instagram":"files/instagram.txt",
      "toutatis":"files/toutatis.txt",
      "dead zone":"files/dead_zone.txt",
      "codes":"files/codes.txt",
      "blueprints":"files/blueprints.txt",
      "prototypes":"files/prototypes.txt"
    }[f];
    fetch(path).then(r=>r.text()).then(txt=>{
      if(txt.toLowerCase().includes(q.toLowerCase())) results.push(f);
    }).catch(()=>{}).finally(()=>{
      done++;
      if(done===allowed.length){
        if(results.length) alert('Found in: '+results.join(', '));
        else alert('No matches found');
      }
    });
  });
}

/* --- Help --- */
function showHelp(){
  alert("Help:\nContact: hydramusic@gmail.com\nInstagram: @saaid_sarosh77");
}

/* --- Favorites --- */
function showFavorites(){
  const favs = JSON.parse(localStorage.getItem('cosmos_favs')||'[]');
  if(!favs.length){ alert('No favorites yet'); return; }
  alert('Favorites:\n'+favs.join('\n'));
}

/* --- Export API --- */
window.LW = {
  attemptLogin,
  renderDashboard,
  initViewer,
  logoutFromMenu,
  logoutNow,
  searchSite,
  showHelp,
  showFavorites,
  getSession
};
