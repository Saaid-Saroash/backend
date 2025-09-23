/* client-side "auth" for GitHub Pages (not secure) */
/* Accounts and folder mapping (as requested) */
const ACCOUNTS = {
  "hackersworld@backend.com": { pwd: "sro43kl", folders: ["backend cmds","instagram","toutatis"] },
  "saaidsaroash@personal.com": { pwd: "saaidsaroash772009", folders: ["dead zone","codes","blueprints","prototypes"] }
};
const ALL_FOLDERS = ["backend cmds","instagram","toutatis","dead zone","codes","blueprints","prototypes"];

/* Helpers */
function setSession(email){
  sessionStorage.setItem("lw_user", email);
}
function clearSession(){ sessionStorage.removeItem("lw_user"); }
function getSession(){ return sessionStorage.getItem("lw_user"); }

/* LOGIN PAGE: run on submit */
function attemptLogin(ev){
  ev && ev.preventDefault();
  const email = document.getElementById("email").value.trim();
  const pass = document.getElementById("password").value.trim();
  const acc = ACCOUNTS[email];
  if(acc && acc.pwd === pass){
    setSession(email);
    // choose account id for compatibility with earlier flow
    window.location = "dashboard.html";
  } else {
    alert("Invalid credentials");
  }
}

/* Demo fill */
function demoFill(){
  document.getElementById("email").value = "hackersworld@backend.com";
  document.getElementById("password").value = "sro43kl";
}

/* DASHBOARD PAGE: render folders */
function renderDashboard(){
  const user = getSession();
  if(!user){ window.location = "login.html"; return; }
  document.getElementById("userTag").textContent = user;
  const allowed = ACCOUNTS[user].folders;
  const container = document.getElementById("folders");
  container.innerHTML = "";
  for(const f of ALL_FOLDERS){
    const el = document.createElement("div");
    el.className = "folder";
    if(!allowed.includes(f)) el.classList.add("locked");
    el.innerHTML = `<span>${f}</span><span class="small">${allowed.includes(f)?'open':'locked'}</span>`;
    el.addEventListener("click", ()=>{
      if(!allowed.includes(f)){ alert("Access denied for this folder."); return; }
      // open editor page with folder param
      window.location = `editor.html?folder=${encodeURIComponent(f)}`;
    });
    container.appendChild(el);
  }
  document.getElementById("logoutBtn").addEventListener("click", ()=>{
    if(confirm("Logout?")){ clearSession(); window.location="login.html"; }
  });
}

/* EDITOR PAGE */
function initEditor(){
  const user = getSession();
  if(!user){ window.location = "login.html"; return; }
  const params = new URLSearchParams(window.location.search);
  const folder = params.get("folder");
  if(!folder){ alert("No folder specified"); window.location="dashboard.html"; return; }
  // access control: ensure folder allowed for this user
  const allowed = ACCOUNTS[user].folders;
  if(!allowed.includes(folder)){ alert("Access denied"); window.location="dashboard.html"; return; }

  document.getElementById("userTag").textContent = user;
  document.getElementById("folderName").textContent = folder;

  const key = storageKey(user, folder);
  const saved = localStorage.getItem(key) || "";
  const editor = document.getElementById("editor");
  editor.textContent = saved;

  document.getElementById("saveBtn").addEventListener("click", ()=> {
    localStorage.setItem(key, editor.textContent || "");
    showStatus("Saved " + new Date().toLocaleString());
  });
  document.getElementById("clearBtn").addEventListener("click", ()=> {
    if(confirm("Clear folder content?")){
      localStorage.removeItem(key);
      editor.textContent = "";
      showStatus("Cleared");
    }
  });
  document.getElementById("downloadBtn").addEventListener("click", ()=> {
    const text = localStorage.getItem(key) || editor.textContent || "";
    const blob = new Blob([text], {type:'text/plain'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = folder.replace(/\s+/g,'_') + ".txt";
    a.click();
    URL.revokeObjectURL(a.href);
  });
  document.getElementById("backBtn").addEventListener("click", ()=> window.location="dashboard.html");
  document.getElementById("logoutBtn").addEventListener("click", ()=> { clearSession(); window.location="login.html"; });
  // ctrl/cmd + s saves
  editor.addEventListener("keydown", (e)=> {
    if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='s'){ e.preventDefault(); localStorage.setItem(key, editor.textContent || ""); showStatus("Saved " + new Date().toLocaleString()); }
  });
}

function storageKey(email, folder){ return `locked_${email}__${folder}`; }
function showStatus(msg){ const el = document.getElementById("status"); if(el) el.textContent = msg; }

/* On pages load binding */
window.LW = { attemptLogin, demoFill, renderDashboard, initEditor, clearSession };
