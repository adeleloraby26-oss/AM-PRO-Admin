// ====================================================
// SUPABASE INIT
// ====================================================
const { createClient } = supabase;
const SUPABASE_URL    = "https://tzojjwnqodcrhwjaasja.supabase.co";
const SERVICE_KEY     = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6b2pqd25xb2Rjcmh3amFhc2phIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzY3MDY4MCwiZXhwIjoyMDkzMjQ2NjgwfQ.ZER36kgJNIvWE4StqUZEkOKssc7rcmol_-kD5h_YINE";
const sb = createClient(SUPABASE_URL, SERVICE_KEY);

// ====================================================
// RANK SYSTEM (same as dashboard)
// ====================================================
const ranks = [
  { name:"Dust",        max:5,      color:"#8e8e93" },
  { name:"Stone",       max:6,      color:"#636366" },
  { name:"Iron",        max:6,      color:"#aeaeb2" },
  { name:"Bronze",      max:7,      color:"#a2845e" },
  { name:"Silver",      max:7,      color:"#cfd3d6" },
  { name:"Gold",        max:7,      color:"#ffcc00" },
  { name:"Platinum",    max:8,      color:"#e5e5ea" },
  { name:"Diamond",     max:8,      color:"#007aff" },
  { name:"Emerald",     max:9,      color:"#34c759" },
  { name:"Sapphire",    max:9,      color:"#5856d6" },
  { name:"Obsidian",    max:10,     color:"#1c1c1e" },
  { name:"Mythic",      max:10,     color:"#ff2d55" },
  { name:"Legend",      max:10,     color:"#af52de" },
  { name:"Master",      max:12,     color:"#5ac8fa" },
  { name:"Grandmaster", max:15,     color:"#ff9500" },
  { name:"Imperial",    max:20,     color:"linear-gradient(135deg,#ffd60a,#ff9500)" },
  { name:"Royal",       max:20,     color:"linear-gradient(135deg,#bf5af2,#5e5ce6)" },
  { name:"Founder",     max:999999, color:"linear-gradient(135deg,#64d2ff,#0a84ff)" }
];

function getRank(level) {
  let sum = 0;
  for (let i = 0; i < ranks.length; i++) {
    if (level <= sum + ranks[i].max) return { ...ranks[i], level: level - sum };
    sum += ranks[i].max;
  }
  return { ...ranks[ranks.length-1], level:1 };
}

// ====================================================
// ADMIN CREDENTIALS (read from Supabase table)
// ====================================================
let adminCreds = null;

async function fetchAdminCreds() {
  const { data, error } = await sb.from("admin_users").select("username,password").limit(1).single();
  if (error) { console.error("[ADMIN] fetchAdminCreds:", error); return null; }
  return data;
}

// ====================================================
// TOAST
// ====================================================
function toast(msg, type = "success") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast show " + type;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.className = "toast " + type, 3000);
}

// ====================================================
// LOGIN
// ====================================================
async function adminLogin() {
  const user = document.getElementById("adminUser").value.trim();
  const pass = document.getElementById("adminPass").value;
  const errEl = document.getElementById("loginErr");

  if (!user || !pass) { showErr("Please enter username and password"); return; }

  const creds = await fetchAdminCreds();
  if (!creds) { showErr("Could not load admin credentials. Check Supabase setup."); return; }

  if (user === creds.username && pass === creds.password) {
    sessionStorage.setItem("am_admin", "1");
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("adminPanel").classList.remove("hidden");
    lucide.createIcons();
    loadUsers();
    loadTasks();
  } else {
    showErr("Wrong username or password.");
  }
}

function showErr(msg) {
  const el = document.getElementById("loginErr");
  el.textContent = msg;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 3000);
}

function adminLogout() {
  sessionStorage.removeItem("am_admin");
  location.reload();
}

function togglePass() {
  const inp = document.getElementById("adminPass");
  const ic  = document.getElementById("eyeIcon");
  if (inp.type === "password") { inp.type="text"; ic.setAttribute("data-lucide","eye-off"); }
  else { inp.type="password"; ic.setAttribute("data-lucide","eye"); }
  lucide.createIcons();
}

function togglePass2() {
  const inp = document.getElementById("c_pass");
  const ic  = document.getElementById("eyeIcon2");
  if (inp.type === "password") { inp.type="text"; ic.setAttribute("data-lucide","eye-off"); }
  else { inp.type="password"; ic.setAttribute("data-lucide","eye"); }
  lucide.createIcons();
}

// ====================================================
// SECTION SWITCHER
// ====================================================
function showSection(name) {
  document.querySelectorAll(".section").forEach(s => { s.classList.add("hidden"); s.classList.remove("active"); });
  const target = document.getElementById("sec-" + name);
  if (target) { target.classList.remove("hidden"); target.classList.add("active"); }
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  const navItem = document.querySelector(`[data-section="${name}"]`);
  if (navItem) navItem.classList.add("active");
  closeSidebar();
}

// ====================================================
// SIDEBAR (mobile)
// ====================================================
function toggleSidebar() {
  const sb2 = document.getElementById("sidebar");
  const ov  = document.querySelector(".sidebar-overlay");
  sb2.classList.toggle("open");
  if (sb2.classList.contains("open")) {
    if (!ov) { const d = document.createElement("div"); d.className="sidebar-overlay"; d.onclick=closeSidebar; document.body.appendChild(d); }
    else { ov.classList.remove("hidden"); }
  } else { closeSidebar(); }
}

function closeSidebar() {
  document.getElementById("sidebar").classList.remove("open");
  const ov = document.querySelector(".sidebar-overlay");
  if (ov) ov.classList.add("hidden");
}

// ====================================================
// USERS
// ====================================================
let allUsers = [];

async function loadUsers() {
  const grid = document.getElementById("usersList");
  grid.innerHTML = '<div class="empty-state">Loading users...</div>';
  const { data, error } = await sb.from("users").select("*").order("created_at", { ascending: false });
  if (error) { toast("Error loading users: " + error.message, "error"); return; }
  allUsers = data || [];
  renderUsers(allUsers);
  renderStats(allUsers);
}

function renderStats(users) {
  const el = document.getElementById("userStats");
  const fields = {};
  users.forEach(u => { fields[u.field] = (fields[u.field]||0)+1; });
  let fieldHTML = Object.entries(fields).map(([k,v])=>`
    <div class="stat-card">
      <div class="stat-val">${v}</div>
      <div class="stat-label">${k||"Unknown"}</div>
    </div>`).join("");
  el.innerHTML = `
    <div class="stat-card"><div class="stat-val">${users.length}</div><div class="stat-label">Total Members</div></div>
    ${fieldHTML}`;
}

function renderUsers(users) {
  const grid = document.getElementById("usersList");
  if (!users.length) { grid.innerHTML = '<div class="empty-state">No users found.</div>'; return; }
  grid.innerHTML = users.map(u => {
    const rank = getRank(u.level || 1);
    const initials = (u.name || u.username || "?")[0].toUpperCase();
    const isGrad = rank.color.includes("gradient");
    const bgStyle = isGrad ? `background:${rank.color}` : `background-color:${rank.color}`;
    return `
    <div class="user-card" onclick="openUserModal('${u.id}')">
      <div class="user-card-top">
        <div class="user-avatar">${initials}</div>
        <div class="user-rank-badge" style="${bgStyle}">${rank.name}</div>
      </div>
      <div class="user-name">${u.name || "—"}</div>
      <div class="user-email">${u.email || "—"}</div>
      <div class="user-meta">
        <span class="meta-tag">${u.username || "—"}</span>
        <span class="meta-tag">${u.field || "—"}</span>
        <span class="meta-tag">${u.gender || "—"}</span>
      </div>
      <div class="user-card-footer">
        <span class="user-level">Level ${u.level || 1}</span>
        <span style="font-size:11px;color:var(--text-3)">${new Date(u.created_at).toLocaleDateString()}</span>
      </div>
    </div>`;
  }).join("");
}

function filterUsers() {
  const q = document.getElementById("userSearch").value.toLowerCase();
  if (!q) { renderUsers(allUsers); return; }
  renderUsers(allUsers.filter(u =>
    (u.name||"").toLowerCase().includes(q) ||
    (u.username||"").toLowerCase().includes(q) ||
    (u.email||"").toLowerCase().includes(q) ||
    (u.field||"").toLowerCase().includes(q)
  ));
}

// ====================================================
// USER MODAL
// ====================================================
let activeUserId = null;
let modalLevel   = 1;

function openUserModal(userId) {
  const u = allUsers.find(x => x.id === userId);
  if (!u) return;
  activeUserId = userId;
  modalLevel = u.level || 1;
  document.getElementById("modalTitle").textContent = u.name || u.username;
  document.getElementById("modalSub").textContent   = u.email + " • " + (u.field||"");
  document.getElementById("m_pass").value = "";
  document.getElementById("m_verified").checked = !!u.verified;
  updateModalLevel();
  document.getElementById("userModal").classList.remove("hidden");
  lucide.createIcons();
}

function closeUserModal() { document.getElementById("userModal").classList.add("hidden"); }

function closeModal(e) {
  if (e.target.classList.contains("modal-overlay")) {
    document.querySelectorAll(".modal-overlay").forEach(m => m.classList.add("hidden"));
  }
}

function updateModalLevel() {
  document.getElementById("m_level").textContent = modalLevel;
  const rank = getRank(modalLevel);
  const chip = document.getElementById("m_rank");
  chip.textContent = rank.name + " • Level " + rank.level;
  const isGrad = rank.color.includes("gradient");
  chip.style.cssText = isGrad ? `background:${rank.color}` : `background-color:${rank.color}`;
}

function changeLevel(delta) {
  modalLevel = Math.max(1, modalLevel + delta);
  updateModalLevel();
}

async function saveUser() {
  if (!activeUserId) return;
  const newPass  = document.getElementById("m_pass").value;
  const verified = document.getElementById("m_verified").checked;

  // Update level + verified in users table
  const { error: lvlErr } = await sb.from("users").update({ level: modalLevel, verified }).eq("id", activeUserId);
  if (lvlErr) { toast("Error updating user: " + lvlErr.message, "error"); return; }

  // Update password via admin API using service_role key
  if (newPass) {
    const res = await fetch(SUPABASE_URL + "/auth/v1/admin/users/" + activeUserId, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "apikey": SERVICE_KEY,
        "Authorization": "Bearer " + SERVICE_KEY
      },
      body: JSON.stringify({ password: newPass })
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      toast("Level saved! Password error: " + (errBody.message || res.status), "error");
      closeUserModal();
      await loadUsers();
      return;
    }
  }

  toast("User updated successfully!", "success");
  closeUserModal();
  await loadUsers();
}

async function deleteUser() {
  if (!activeUserId) return;
  if (!confirm("Are you sure you want to delete this account? This cannot be undone.")) return;

  const { error } = await sb.from("users").delete().eq("id", activeUserId);
  if (error) { toast("Error: " + error.message, "error"); return; }

  toast("User deleted.", "success");
  closeUserModal();
  await loadUsers();
}

// ====================================================
// TASKS
// ====================================================
let allTasks = [];

async function loadTasks() {
  const list = document.getElementById("tasksList");
  list.innerHTML = '<div class="empty-state">Loading tasks...</div>';
  const { data, error } = await sb.from("tasks").select("*, users(name,username)").order("created_at", { ascending: false });
  if (error) { toast("Error loading tasks: " + error.message, "error"); return; }
  allTasks = data || [];
  renderTasksList(allTasks);
}

function renderTasksList(tasks) {
  const list = document.getElementById("tasksList");
  if (!tasks.length) { list.innerHTML = '<div class="empty-state">No tasks yet. Add one above.</div>'; return; }
  list.innerHTML = tasks.map(t => {
    const linkHTML = t.link
      ? `<a class="task-link" href="${t.link}" target="_blank" rel="noopener"><i data-lucide="external-link"></i> Open Link</a>`
      : "";
    return `
    <div class="task-row">
      <div class="task-dot"></div>
      <div class="task-info">
        <div class="task-title">${t.title || t.text || "Untitled Task"}</div>
        ${t.body ? `<div class="task-body">${t.body}</div>` : ""}
        <div class="task-meta-row">
          <span class="task-assignee">Assigned to: ${t.users ? (t.users.name||t.users.username) : "All users"}</span>
          ${linkHTML}
        </div>
      </div>
      <button class="task-del" onclick="deleteTask('${t.id}')"><i data-lucide="trash-2"></i></button>
    </div>`;
  }).join("");
  lucide.createIcons();
}

function openAddTask() {
  // populate user dropdown
  const sel = document.getElementById("t_user");
  sel.innerHTML = '<option value="">All Users</option>' +
    allUsers.map(u => `<option value="${u.id}">${u.name||u.username} (${u.email})</option>`).join("");
  document.getElementById("t_title").value = "";
  document.getElementById("t_body").value  = "";
  document.getElementById("t_link").value  = "";
  document.getElementById("taskModal").classList.remove("hidden");
  lucide.createIcons();
}

function closeTaskModal() { document.getElementById("taskModal").classList.add("hidden"); }

async function addTask() {
  const title  = document.getElementById("t_title").value.trim();
  const body   = document.getElementById("t_body").value.trim();
  const link   = document.getElementById("t_link").value.trim();
  const userId = document.getElementById("t_user").value;
  if (!title) { toast("Please enter a task title.", "error"); return; }

  const makeRow = (uid) => {
    const row = { title, user_id: uid };
    if (body) row.body = body;
    if (link) row.link = link;
    return row;
  };

  const rows = userId
    ? [makeRow(userId)]
    : allUsers.map(u => makeRow(u.id));

  const { error } = await sb.from("tasks").insert(rows);
  if (error) { toast("Error: " + error.message, "error"); return; }

  toast(`Task added${!userId ? " to all users" : ""}!`, "success");
  closeTaskModal();
  await loadTasks();
}

async function deleteTask(taskId) {
  if (!confirm("Delete this task?")) return;
  const { error } = await sb.from("tasks").delete().eq("id", taskId);
  if (error) { toast("Error: " + error.message, "error"); return; }
  toast("Task deleted.", "success");
  await loadTasks();
}

// ====================================================
// CREATE ACCOUNT
// ====================================================
async function createAccount() {
  const name     = document.getElementById("c_name").value.trim();
  const username = document.getElementById("c_username").value.trim();
  const email    = document.getElementById("c_email").value.trim();
  const pass     = document.getElementById("c_pass").value;
  const gender   = document.getElementById("c_gender").value;
  const field    = document.getElementById("c_field").value;
  const msgEl    = document.getElementById("createMsg");

  if (!name||!username||!email||!pass||!gender||!field) {
    showCreateMsg("Please fill in all fields.", "error"); return;
  }
  if (pass.length < 6) { showCreateMsg("Password must be at least 6 characters.", "error"); return; }

  showCreateMsg("Creating account...", "success");

  const { data, error } = await sb.auth.signUp({ email, password: pass });
  if (error) { showCreateMsg(error.message, "error"); return; }

  const uid = data?.user?.id;
  if (!uid) { showCreateMsg("Signup succeeded but no UID returned.", "error"); return; }

  const { error: insErr } = await sb.from("users").insert([{ id:uid, uid, name, username, gender, field, email }]);
  if (insErr) { showCreateMsg(insErr.message, "error"); return; }

  showCreateMsg("Account created successfully!", "success");
  ["c_name","c_username","c_email","c_pass"].forEach(id => document.getElementById(id).value="");
  document.getElementById("c_gender").value="";
  document.getElementById("c_field").value="";
  await loadUsers();
}

function showCreateMsg(msg, type) {
  const el = document.getElementById("createMsg");
  el.textContent = msg;
  el.className = "msg-box " + type;
  el.classList.remove("hidden");
  if (type === "success") setTimeout(() => el.classList.add("hidden"), 4000);
}

// ====================================================
// INIT
// ====================================================
document.addEventListener("DOMContentLoaded", () => {
  lucide.createIcons();

  // Check if already logged in this session
  if (sessionStorage.getItem("am_admin") === "1") {
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("adminPanel").classList.remove("hidden");
    lucide.createIcons();
    loadUsers();
    loadTasks();
  }

  // Allow Enter key on login
  ["adminUser","adminPass"].forEach(id => {
    document.getElementById(id)?.addEventListener("keydown", e => {
      if (e.key === "Enter") adminLogin();
    });
  });
});
