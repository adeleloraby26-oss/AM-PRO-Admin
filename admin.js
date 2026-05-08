// ============================================================
// SUPABASE INIT
// ============================================================
const { createClient } = supabase;
const sb = createClient(
  "https://tzojjwnqodcrhwjaasja.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6b2pqd25xb2Rjcmh3amFhc2phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NzA2ODAsImV4cCI6MjA5MzI0NjY4MH0.G4IGSUgjVIKTNVszU5GpxNaD0VUnSmzUXe8p7uUl418"
);

// ============================================================
// RANKS (same as dash.js)
// ============================================================
const RANKS = [
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
  { name:"Obsidian",    max:10,     color:"#3a3a3c" },
  { name:"Mythic",      max:10,     color:"#ff2d55" },
  { name:"Legend",      max:10,     color:"#af52de" },
  { name:"Master",      max:12,     color:"#5ac8fa" },
  { name:"Grandmaster", max:15,     color:"#ff9500" },
  { name:"Imperial",    max:20,     color:"#ffd60a" },
  { name:"Royal",       max:20,     color:"#bf5af2" },
  { name:"Founder",     max:999999, color:"#64d2ff" }
];

function getRank(level) {
  let sum = 0;
  for (let r of RANKS) {
    if (level <= sum + r.max) return { ...r, sub: level - sum };
    sum += r.max;
  }
  return { ...RANKS[RANKS.length - 1], sub: 1 };
}

function badgeStyle(rank) {
  const lightColors = ["#ffcc00","#e5e5ea","#cfd3d6","#aeaeb2","#ffd60a","#64d2ff","#5ac8fa"];
  const tc = lightColors.includes(rank.color) ? "#000" : "#fff";
  return `background:${rank.color};color:${tc}`;
}

function avatarColor(name) {
  const pool = ["#007aff","#30d158","#ff9500","#ff2d55","#5856d6","#64d2ff","#af52de","#ffd60a"];
  let h = 0;
  for (const c of (name || "?")) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return pool[h % pool.length];
}

// ============================================================
// STATE
// ============================================================
let members    = [];
let taskMap    = {};   // { userId: [tasks] }
let editLevel  = 1;
let editUserId = null;

// ============================================================
// TOAST
// ============================================================
function toast(msg, type = "ok") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = `toast show ${type}`;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.className = "toast"; }, 3000);
}

// ============================================================
// BOOT — check sessionStorage auth
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  lucide.createIcons();

  const adminId   = sessionStorage.getItem("am_admin_id");
  const adminUser = sessionStorage.getItem("am_admin_user");

  if (!adminId) {
    document.getElementById("gate").innerHTML =
      `<p style="color:#f5f5f7;font-size:15px">🚫 غير مصرح — <a href="index.html" style="color:#007aff">تسجيل الدخول</a></p>`;
    return;
  }

  document.getElementById("adminName").textContent = adminUser || "Admin";

  document.getElementById("logoutBtn").addEventListener("click", () => {
    sessionStorage.removeItem("am_admin_id");
    sessionStorage.removeItem("am_admin_user");
    window.location.href = "index.html";
  });

  await loadAll();

  document.getElementById("gate").classList.add("hidden");
  document.getElementById("main").classList.remove("hidden");
  lucide.createIcons();
});

// ============================================================
// LOAD ALL
// ============================================================
async function loadAll() {
  const [{ data: users, error: uErr }, { data: tasks, error: tErr }] = await Promise.all([
    sb.from("users").select("*").order("created_at", { ascending: false }),
    sb.from("tasks").select("*")
  ]);

  if (uErr) { toast("خطأ في تحميل الأعضاء: " + uErr.message, "err"); return; }
  if (tErr) { toast("خطأ في تحميل التاسكات: " + tErr.message, "err"); }

  taskMap = {};
  for (const t of (tasks || [])) {
    if (!taskMap[t.user_id]) taskMap[t.user_id] = [];
    taskMap[t.user_id].push(t);
  }

  members = users || [];
  updateStats();
  renderTable(members);
  fillSelect();
}

// ============================================================
// STATS
// ============================================================
function updateStats() {
  document.getElementById("sMembers").textContent = members.length;
  const total = Object.values(taskMap).reduce((s, a) => s + a.length, 0);
  document.getElementById("sTasks").textContent   = total;
  const avg = members.length
    ? Math.round(members.reduce((s, m) => s + (m.level || 1), 0) / members.length)
    : 0;
  document.getElementById("sAvg").textContent = avg;
  if (members.length) {
    const top = members.reduce((a, b) => (b.level||1) > (a.level||1) ? b : a);
    document.getElementById("sMaxRank").textContent = getRank(top.level||1).name;
  }
}

// ============================================================
// RENDER TABLE
// ============================================================
function renderTable(list) {
  const body = document.getElementById("tBody");
  if (!list.length) {
    body.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:36px;color:var(--dim)">لا يوجد أعضاء</td></tr>`;
    return;
  }
  body.innerHTML = list.map(m => {
    const level  = m.level || 1;
    const rank   = getRank(level);
    const tasks  = taskMap[m.id] || [];
    const color  = avatarColor(m.name);
    const init   = (m.name || m.username || "?")[0].toUpperCase();
    const date   = m.created_at ? new Date(m.created_at).toLocaleDateString("ar-EG") : "—";
    const bs     = badgeStyle(rank);

    return `<tr>
      <td>
        <div class="mem-cell">
          <div class="avatar" style="background:${color}22;color:${color};border:1.5px solid ${color}55">${init}</div>
          <div>
            <div class="mem-name">${esc(m.name||"—")}</div>
            <div class="mem-user">@${esc(m.username||"—")}</div>
          </div>
        </div>
      </td>
      <td style="color:var(--dim);font-size:13px">${esc(m.field||"—")}</td>
      <td style="color:var(--dim);font-size:13px">${esc(m.gender||"—")}</td>
      <td><span class="rank-pill" style="${bs}">${esc(rank.name)}</span></td>
      <td style="font-family:'IBM Plex Mono',monospace;font-size:14px">${level}</td>
      <td>
        <span class="tc">
          <i data-lucide="check-square"></i>
          ${tasks.length}
        </span>
      </td>
      <td><span class="date-txt">${date}</span></td>
      <td>
        <div class="act">
          <button class="icon-btn" title="تعديل" onclick="openEdit('${m.id}')">
            <i data-lucide="edit-2"></i>
          </button>
        </div>
      </td>
    </tr>`;
  }).join("");
  lucide.createIcons();
}

// ============================================================
// FILTER
// ============================================================
window.filterTable = function () {
  const q = document.getElementById("searchInput").value.trim().toLowerCase();
  renderTable(q
    ? members.filter(m =>
        (m.name||"").toLowerCase().includes(q) ||
        (m.username||"").toLowerCase().includes(q) ||
        (m.email||"").toLowerCase().includes(q))
    : members
  );
};

// ============================================================
// OPEN EDIT MODAL
// ============================================================
window.openEdit = async function (uid) {
  const m = members.find(x => x.id === uid);
  if (!m) return;

  editUserId = uid;
  editLevel  = m.level || 1;

  document.getElementById("editId").value           = uid;
  document.getElementById("editTitle").textContent  = m.name || m.username || "—";
  document.getElementById("lvlNum").textContent     = editLevel;
  updateRankBar(editLevel);
  await loadTasksForModal(uid);

  document.getElementById("editModal").classList.remove("hidden");
  lucide.createIcons();
};

async function loadTasksForModal(uid) {
  const list = document.getElementById("tasksList");
  list.innerHTML = `<div class="no-tasks"><div class="spinner sm" style="margin:0 auto"></div></div>`;
  lucide.createIcons();

  const { data, error } = await sb
    .from("tasks").select("*").eq("user_id", uid).order("created_at");

  if (error) { list.innerHTML = `<div class="no-tasks">خطأ: ${esc(error.message)}</div>`; return; }

  taskMap[uid] = data || [];
  renderModalTasks(uid);
}

function renderModalTasks(uid) {
  const tasks = taskMap[uid] || [];
  document.getElementById("taskCountBadge").textContent = tasks.length;

  const list = document.getElementById("tasksList");
  if (!tasks.length) {
    list.innerHTML = `<div class="no-tasks">لا توجد تاسكات بعد</div>`;
    lucide.createIcons();
    return;
  }
  list.innerHTML = tasks.map(t => `
    <div class="task-row" id="tr-${t.id}">
      <span>${esc(t.text)}</span>
      <button onclick="deleteTask('${t.id}','${uid}')" title="حذف">
        <i data-lucide="trash-2"></i>
      </button>
    </div>`).join("");
  lucide.createIcons();
}

// ============================================================
// LEVEL CONTROL
// ============================================================
window.lvl = function (delta) {
  editLevel = Math.max(1, editLevel + delta);
  document.getElementById("lvlNum").textContent = editLevel;
  updateRankBar(editLevel);
};

function updateRankBar(level) {
  const rank = getRank(level);
  const el   = document.getElementById("rankBar");
  const bs   = badgeStyle(rank);
  el.setAttribute("style", bs + ";border-radius:12px;");
  el.textContent = `${rank.name}  •  Sub-Level ${rank.sub}`;

  const badge = document.getElementById("editBadge");
  if (badge) { badge.setAttribute("style", bs); badge.textContent = rank.name; }
}

// ============================================================
// SAVE LEVEL
// ============================================================
window.saveLevel = async function () {
  const uid = document.getElementById("editId").value;
  const { error } = await sb.from("users").update({ level: editLevel }).eq("id", uid);
  if (error) { toast("خطأ: " + error.message, "err"); return; }

  const m = members.find(x => x.id === uid);
  if (m) m.level = editLevel;

  toast("✓ تم حفظ المستوى");
  updateStats();
  renderTable(members);
  lucide.createIcons();
};

// ============================================================
// ADD TASK (in edit modal)
// ============================================================
window.addTask = async function () {
  const uid  = document.getElementById("editId").value;
  const text = document.getElementById("newTask").value.trim();
  if (!text) { toast("اكتب نص التاسك أولاً", "err"); return; }

  const { data, error } = await sb
    .from("tasks").insert([{ user_id: uid, text }]).select().single();

  if (error) { toast("خطأ: " + error.message, "err"); return; }

  if (!taskMap[uid]) taskMap[uid] = [];
  taskMap[uid].push(data);
  document.getElementById("newTask").value = "";
  renderModalTasks(uid);
  updateStats();
  toast("✓ تم إضافة التاسك");
};

// ============================================================
// DELETE TASK
// ============================================================
window.deleteTask = async function (taskId, uid) {
  const { error } = await sb.from("tasks").delete().eq("id", taskId);
  if (error) { toast("خطأ: " + error.message, "err"); return; }

  taskMap[uid] = (taskMap[uid] || []).filter(t => t.id !== taskId);
  renderModalTasks(uid);
  updateStats();
  toast("تم حذف التاسك");
};

// ============================================================
// GLOBAL TASK MODAL
// ============================================================
function fillSelect() {
  const sel = document.getElementById("taskTarget");
  sel.innerHTML = members.map(m =>
    `<option value="${m.id}">${esc(m.name || m.username)} (@${esc(m.username)})</option>`
  ).join("");
}

window.openGlobalTask = function () {
  document.getElementById("taskText").value = "";
  document.getElementById("taskModal").classList.remove("hidden");
  lucide.createIcons();
};

window.saveGlobalTask = async function () {
  const uid  = document.getElementById("taskTarget").value;
  const text = document.getElementById("taskText").value.trim();
  if (!text) { toast("اكتب نص التاسك أولاً", "err"); return; }

  const { data, error } = await sb
    .from("tasks").insert([{ user_id: uid, text }]).select().single();

  if (error) { toast("خطأ: " + error.message, "err"); return; }

  if (!taskMap[uid]) taskMap[uid] = [];
  taskMap[uid].push(data);
  closeModal("taskModal");
  updateStats();
  renderTable(members);
  lucide.createIcons();
  toast("✓ تم إضافة التاسك");
};

// ============================================================
// CLOSE MODAL
// ============================================================
window.closeModal = function (id) {
  document.getElementById(id).classList.add("hidden");
};

document.addEventListener("click", e => {
  if (e.target.classList.contains("overlay")) e.target.classList.add("hidden");
});

// ============================================================
// ESCAPE HTML
// ============================================================
function esc(s) {
  return String(s ?? "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
