/* script.js — obfuscated credentials version
   Obfuscation method: base64 then reverse string.
   This hides plain credentials from casual view in Sources.
   NOT a secure replacement for a server-side auth.
*/

/* --- utility obfuscation helpers --- */
function _rev(s){return s.split('').reverse().join('');}
function _b64dec(s){ return decodeURIComponent(escape(window.atob(s))); } // atob -> raw decode
function _decodeObf(s){ try{ return _b64dec(_rev(s)); } catch(e){ return ''; } }

/* --- Folders & file map (plain) --- */
const ALL_FOLDERS = [
  "backend cmds","instagram","toutatis","dead zone",
  "codes","blueprints","prototypes"
];

const FILE_MAP = {
  "backend cmds": "files/backend_cmds.txt",
  "instagram": "files/instagram.txt",
  "toutatis": "files/toutatis.txt",
  "dead zone": "files/dead_zone.txt",
  "codes": "files/codes.txt",
  "blueprints": "files/blueprints.txt",
  "prototypes": "files/prototypes.txt"
};

/* --- Encoded accounts (base64 then reversed) ---
   These are intentionally unreadable in the source.
   Decoded at runtime into ACCOUNTS.
   To add accounts, encode email/password with:
     encoded = btoa(email).split('').reverse().join('')
   (we precomputed the values below)
*/
const ENCODED_ACCOUNTS = {
  // hackersworld@backend.com / sro43kl
  "t92YuQmblt2YhJGQkxmcvd3cyV2ajFGa": {
    pwd: "==AbrNDNvJ3c",
    folders: ["backend cmds","instagram","toutatis","dead zone"]
  },
  // saaidsaroash@personal.com / saaidsaroash772009
  "==QbvNmLsFmbvNnclBHQoNXYvJXYzRWahF2c": {
    pwd: "5ADMyczNoNXYvJXYzRWahF2c",
    folders: ["codes","blueprints","prototypes"]
  },
  // hackersuniverse@unkown.com / 26112009
  "=02bj5ib392auVHQlNnclZXauV3cyV2ajFGa": {
    pwd: "=kDMwITMxYjM",
    folders: ALL_FOLDERS.slice()
  }
};

/* --- Build runtime ACCOUNTS by decoding keys & passwords --- */
const ACCOUNTS = (function buildAccounts(){
  const out = {};
  for(const encEmail in ENCODED_ACCOUNTS){
    const decEmail = _decodeObf(encEmail);
    const encPwd = ENCODED_ACCOUNTS[encEmail].pwd;
    const decPwd = _decodeObf(encPwd);
    const folders = ENCODED_ACCOUNTS[encEmail].folders || [];
    if(decEmail) out[decEmail] = { pwd: decPwd, folders: folders.slice() };
  }
  return out;
})();

/* --- Session helpers --- */
function setSession(email){ sessionStorage.setItem('cosmos_user', email); }
function clearSession(){ sessionStorage.removeItem('cosmos_user'); }
function getSession(){ return sessionStorage.getItem('cosmos_user'); }

/* --- Menu helpers --- */
function openMenu(id){
  const m = document.getElementById(id);
  if(m){ m.style.transform = 'translateX(0)'; m.setAttribute('aria-hidden','false'); document.body.classList.add('menu-open'); }
}
function closeMenu(){
  const menus = document.querySelectorAll('.side-menu');
  menus.forEach(m=>{ m.style.transform='translateX(-110%)'; m.setAttribute('aria-hidden','true'); });
  document.body.classList.remove('menu-open');
  if(document.activeElement) document.activeElement.blur();
}
function toggleMenu(id){
  const m = document.getElementById(id); if(!m) return;
  const hidden = m.getAttribute('aria-hidden') === 'true';
  if(hidden) openMenu(id); else closeMenu();
}

/* --- Authentication (uses decoded ACCOUNTS) --- */
function attemptLogin(ev){
  ev && ev.preventDefault();
  const email = document.getElementById('email')?.value?.trim() || '';
  const password = document.getElementById('password')?.value?.trim() || '';
  const acct = ACCOUNTS[email];
  if(acct && acct.pwd === password){
    setSession(email);
    // replace so login not in history
    location.replace('dashboard.html');
  } else {
    alert('Invalid credentials');
  }
}
function logoutNow(){ clearSession(); location.replace('index.html'); }
function logoutFromMenu(){ if(confirm('Logout?')) logoutNow(); }

/* --- Dashboard rendering --- */
function renderDashboard(){
  const user = getSession();
  if(!user){ location.replace('index.html'); return; }
  history.replaceState(null,'',location.href);
  const userTag = document.getElementById('userTag');
  if(userTag) userTag.textContent = user;
  const allowed = (ACCOUNTS[user] && ACCOUNTS[user].folders) ? ACCOUNTS[user].folders : [];
  const container = document.getElementById('folders');
  if(container){
    container.innerHTML = '';
    allowed.forEach(folder=>{
      const el = document.createElement('div');
      el.className = 'folder';
      el.innerHTML = `<span>${folder}</span><span class="small">view</span>`;
      el.addEventListener('click', ()=> { location.replace(`viewer.html?folder=${encodeURIComponent(folder)}`); });
      container.appendChild(el);
    });
  }
  document.getElementById('menuToggle')?.addEventListener('click', ()=> toggleMenu('sideMenu'));
  document.getElementById('logoutBtnTop')?.addEventListener('click', ()=> { if(confirm('Logout?')) logoutNow(); });
  window.addEventListener('popstate', ()=> {
    if(!getSession()) location.replace('index.html');
    else history.replaceState(null,'',location.href);
  });
}

/* --- Viewer --- */
function initViewer(){
  const user = getSession();
  if(!user){ location.replace('index.html'); return; }
  history.replaceState(null,'',location.href);
  document.getElementById('menuToggleV')?.addEventListener('click', ()=> toggleMenu('sideMenuV'));
  document.getElementById('logoutBtnTopV')?.addEventListener('click', ()=> { if(confirm('Logout?')) logoutNow(); });
  document.getElementById('backBtn')?.addEventListener('click', ()=> location.replace('dashboard.html'));
  const params = new URLSearchParams(window.location.search);
  const folder = params.get('folder');
  if(!folder){ location.replace('dashboard.html'); return; }
  const allowed = ACCOUNTS[user] ? ACCOUNTS[user].folders : [];
  if(!allowed.includes(folder)){ alert('Access denied'); location.replace('dashboard.html'); return; }
  const tag = document.getElementById('userTagV') || document.getElementById('userTag');
  if(tag) tag.textContent = user;
  const titleEl = document.getElementById('folderName'); if(titleEl) titleEl.textContent = folder;
  const path = FILE_MAP[folder];
  fetch(path, {cache:'no-store'})
    .then(r => { if(!r.ok) throw new Error('Network'); return r.text(); })
    .then(txt => { document.getElementById('fileContent').textContent = txt; })
    .catch(()=> { document.getElementById('fileContent').textContent = 'Error loading file'; });
  document.getElementById('downloadBtnViewer')?.addEventListener('click', ()=>{
    fetch(path).then(r => r.blob()).then(blob=>{
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = folder.replace(/\s+/g,'_') + '.txt';
      a.click();
      URL.revokeObjectURL(a.href);
    }).catch(()=> alert('Download failed'));
  });
  document.getElementById('favBtn')?.addEventListener('click', ()=>{
    const key = `cosmos_favs_${user}`;
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    if(!arr.includes(folder)) arr.push(folder);
    localStorage.setItem(key, JSON.stringify(arr));
    alert('Added to favorites');
  });
  window.addEventListener('popstate', ()=> {
    if(!getSession()) location.replace('index.html');
    else history.replaceState(null,'',location.href);
  });
}

/* --- Search (simple prompt-driven - searches allowed files) --- */
function searchSite(){
  const user = getSession();
  if(!user){ location.replace('index.html'); return; }
  const term = prompt('Search term:');
  if(!term) return;
  const allowed = ACCOUNTS[user] ? ACCOUNTS[user].folders : [];
  let completed = 0;
  const hits = [];
  allowed.forEach(folder=>{
    const path = FILE_MAP[folder];
    fetch(path).then(r => r.text()).then(txt=>{
      if(txt.toLowerCase().includes(term.toLowerCase()) || folder.toLowerCase().includes(term.toLowerCase())){
        hits.push(folder);
      }
    }).catch(()=>{}).finally(()=>{
      completed++;
      if(completed === allowed.length){
        if(hits.length) alert('Matches in: ' + hits.join(', '));
        else alert('No matches');
      }
    });
  });
}

/* --- Help & Favorites helpers --- */
function showHelp(){
  alert('Help\nContact: hydramusic@gmail.com\nInstagram: @saaid_sarosh77');
}
function showFavorites(){
  const user = getSession();
  if(!user){ alert('Not signed in'); return; }
  const arr = JSON.parse(localStorage.getItem(`cosmos_favs_${user}`) || '[]');
  if(!arr.length) alert('No favorites');
  else alert('Favorites:\n' + arr.join('\n'));
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
