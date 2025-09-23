/* client-side "auth" for GitHub Pages (not secure) */
/* Define all folders first */
const ALL_FOLDERS = ["backend cmds","instagram","toutatis","dead zone","codes","blueprints","prototypes"];

/* Accounts and folder mapping (updated as requested)
   - hackersworld has backend cmds, instagram, toutatis, dead zone
   - saaidsaroash has dead zone removed (now in hackersworld) — retains the other 4
   - hackersuniverse has access to every folder
*/
const ACCOUNTS = {
  "hackersworld@backend.com": { pwd: "sro43kl", folders: ["backend cmds","instagram","toutatis","dead zone"] },
  "saaidsaroash@personal.com": { pwd: "saaidsaroash772009", folders: ["codes","blueprints","prototypes"] },
  "hackersuniverse@unkown.com": { pwd: "26112009", folders: ALL_FOLDERS.slice() } // full access
};

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
    window.location = "dashboard.html";
  } else {
    alert("Invalid credentials");
  }
}

/* Demo fill — doesn't display on page but helps testing */
function demoFill(){
  // default quick-fill: hackersworld
  document.getElementById("email").value = "hackersworld@backend.com";
  document.getElementById("password").value = "sro43kl";
}

/* DASHBOARD PAGE: render only allowed folders */
function renderDashboard(){
  const user = getSession();
  if(!user){ window.location = "index.html"; return; }
  document.getElementById("userTag").textContent = user;
  const allowed = ACCOUNTS[user].folders || [];
  const container = document.getElementById("folders");
  container.innerHTML = "";
  // show only allowed folders (no locked items)
  for(const f of allowed){
    const el = document.createElement("div");
    el.className = "folder";
    el.innerHTML = `<span>${f}</span><span class="small">open</span>`;
    el.addEventListener("click", ()=>{
      window.location = `editor.html?folder=${encodeURIComponent(f)}`;
    });
    container.appendChild(el);
  }
  // logout button
  const logoutBtn = document.getElementById("logoutBtn");
  if(logoutBtn){
    logoutBtn.addEventListener("click", ()=>{
      if(confirm("Logout?")){ clearSession(); window.location="index.html"; }
    });
  }
}

/* EDITOR PAGE */
function initEditor(){
  const user = getSession();
  if(!user){ window.location = "index.html"; return; }
  const params = new URLSearchParams(window.location.search);
  const folder = params.get("folder");
  if(!folder){ alert("No folder specified"); window.location="dashboard.html"; return; }

  const allowed = ACCOUNTS[user].folders || [];
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
  const backBtn = document.getElementById("backBtn");
  if(backBtn) backBtn.addEventListener("click", ()=> window.location="dashboard.html");
  const logoutBtn = document.getElementById("logoutBtn");
  if(logoutBtn) logoutBtn.addEventListener("click", ()=> { clearSession(); window.location="index.html"; });

  editor.addEventListener("keydown", (e)=> {
    if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='s'){ e.preventDefault(); localStorage.setItem(key, editor.textContent || ""); showStatus("Saved " + new Date().toLocaleString()); }
  });
}

function storageKey(email, folder){ return `locked_${email}__${folder}`; }
function showStatus(msg){ const el = document.getElementById("status"); if(el) el.textContent = msg; }

window.LW = { attemptLogin, demoFill, renderDashboard, initEditor, clearSession };
