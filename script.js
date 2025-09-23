/* Accounts + folder mapping */
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
  ev.preventDefault();
  const email = document.getElementById("email").value.trim();
  const pass = document.getElementById("password").value.trim();
  const acc = ACCOUNTS[email];
  if(acc && acc.pwd === pass){
    setSession(email);
    window.location = "dashboard.html";
  } else alert("Invalid credentials");
}

/* Demo fill */
function demoFill(){
  document.getElementById("email").value = "hackersworld@backend.com";
  document.getElementById("password").value = "sro43kl";
}

/* DASHBOARD */
function renderDashboard(){
  const user = getSession();
  if(!user){ window.location = "index.html"; return; }
  document.getElementById("userTag").textContent = user;
  const allowed = ACCOUNTS[user].folders;
  const container = document.getElementById("folders");
  container.innerHTML = "";
  for(const f of allowed){
    const el = document.createElement("div");
    el.className = "folder";
    el.innerHTML = `<span>${f}</span><span class="small">view</span>`;
    el.addEventListener("click", ()=>{
      window.location = `viewer.html?folder=${encodeURIComponent(f)}`;
    });
    container.appendChild(el);
  }
  document.getElementById("logoutBtn").addEventListener("click", ()=>{ clearSession(); window.location="index.html"; });
}

/* VIEWER */
function initViewer(){
  const user = getSession();
  if(!user){ window.location = "index.html"; return; }
  const params = new URLSearchParams(window.location.search);
  const folder = params.get("folder");
  if(!folder){ window.location = "dashboard.html"; return; }

  const allowed = ACCOUNTS[user].folders;
  if(!allowed.includes(folder)){ alert("Access denied"); window.location="dashboard.html"; return; }

  document.getElementById("userTag").textContent = user;
  document.getElementById("folderName").textContent = folder;
  document.getElementById("backBtn").addEventListener("click", ()=> window.location="dashboard.html");
  document.getElementById("logoutBtn").addEventListener("click", ()=>{ clearSession(); window.location="index.html"; });

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
  fetch(fileMap[folder])
    .then(r => r.text())
    .then(text => { document.getElementById("fileContent").textContent = text; })
    .catch(() => { document.getElementById("fileContent").textContent = "Error loading file"; });
}

window.LW = { attemptLogin, demoFill, renderDashboard, initViewer, clearSession };
