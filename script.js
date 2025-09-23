/* Accounts + folder mapping (read-only viewer build) */
const ALL_FOLDERS = ["backend cmds","instagram","toutatis","dead zone","codes","blueprints","prototypes"];

const ACCOUNTS = {
  "hackersworld@backend.com": { pwd: "sro43kl", folders: ["backend cmds","instagram","toutatis","dead zone"] },
  "saaidsaroash@personal.com": { pwd: "saaidsaroash772009", folders: ["codes","blueprints","prototypes"] },
  "hackersuniverse@unkown.com": { pwd: "26112009", folders: ALL_FOLDERS.slice() }
};

/* Helpers */
function setSession(email){ sessionStorage.setItem("lw_user", email); }
function clearSession(){ sessionStorage.removeItem("lw_user"); }
function getSession(){ return sessionStorage.getItem("lw_user"); }

/* LOGIN */
function attemptLogin(ev){
  ev && ev.preventDefault();
  const email = document.getElementById("email").value.trim();
  const pass = document.getElementById("password").value.trim();
  const acc = ACCOUNTS[email];
  if(acc && acc.pwd === pass){
    setSession(email);
    // replace history so login isn't in history stack
    location.replace("dashboard.html");
  } else {
    alert("Invalid credentials");
  }
}

/* DASHBOARD */
function renderDashboard(){
  // protect page immediately
  const user = getSession();
  if(!user){ location.replace("index.html"); return; }

  // replace current history entry (so back doesn't return to login)
  history.replaceState(null, "", location.href);

  document.getElementById("userTag").textContent = user;
  const allowed = ACCOUNTS[user].folders || [];
  const container = document.getElementById("folders");
  container.innerHTML = "";
  for(const f of allowed){
    const el = document.createElement("div");
    el.className = "folder";
    el.innerHTML = `<span>${f}</span><span class="small">view</span>`;
    el.addEventListener("click", ()=>{
      // use replace to avoid stacking history entry that could be returned to after logout
      location.replace(`viewer.html?folder=${encodeURIComponent(f)}`);
    });
    container.appendChild(el);
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if(logoutBtn){
    logoutBtn.addEventListener("click", ()=>{
      if(confirm("Logout?")){
        clearSession();
        // replace to login and remove this page from history
        location.replace("index.html");
      }
    });
  }

  // prevent back navigation to protected content after logout:
  window.addEventListener('popstate', () => {
    if(!getSession()) location.replace("index.html");
    else history.replaceState(null, "", location.href);
  });
}

/* VIEWER */
function initViewer(){
  const user = getSession();
  if(!user){ location.replace("index.html"); return; }

  // ensure any attempt to go back to this page after logout will redirect
  history.replaceState(null, "", location.href);

  const params = new URLSearchParams(window.location.search);
  const folder = params.get("folder");
  if(!folder){ location.replace("dashboard.html"); return; }

  const allowed = ACCOUNTS[user].folders || [];
  if(!allowed.includes(folder)){ alert("Access denied"); location.replace("dashboard.html"); return; }

  document.getElementById("userTag").textContent = user;
  document.getElementById("folderName").textContent = folder;
  document.getElementById("backBtn").addEventListener("click", ()=> location.replace("dashboard.html"));
  document.getElementById("logoutBtn").addEventListener("click", ()=> { clearSession(); location.replace("index.html"); });

  // map folder name -> file path
  const fileMap = {
    "backend cmds": "files/backend_cmds.txt",
    "instagram": "files/instagram.txt",
    "toutatis": "files/toutatis.txt",
    "dead zone": "files/dead_zone.txt",
    "codes": "files/codes.txt",
    "blueprints": "files/blueprints.txt",
    "prototypes": "files/prototypes.txt"
  };

  fetch(fileMap[folder], {cache: "no-store"})
    .then(r => {
      if(!r.ok) throw new Error("Network response not ok");
      return r.text();
    })
    .then(text => { document.getElementById("fileContent").textContent = text; })
    .catch(() => { document.getElementById("fileContent").textContent = "Error loading file"; });

  window.addEventListener('popstate', () => {
    if(!getSession()) location.replace("index.html");
    else history.replaceState(null, "", location.href);
  });
}

/* expose API */
window.LW = { attemptLogin, renderDashboard, initViewer, clearSession, getSession };
