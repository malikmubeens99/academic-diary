const schedule = [
  {day:"Monday", start:"08:00", end:"11:00", subject:"Principle of Marketing", room:"Auditorium", teacher:"Ms. Mahnoor IBM"},
  {day:"Monday", start:"13:00", end:"15:00", subject:"DSA (TH)", room:"CB Room 5", teacher:"Mr. Nazir"},
  {day:"Tuesday", start:"08:00", end:"11:00", subject:"DSA (Lab)", room:"CB Room 14", teacher:"Mr. Nazir"},
  {day:"Tuesday", start:"13:00", end:"15:00", subject:"Psychology", room:"CB Room 15 2nd Floor", teacher:""},
  {day:"Wednesday", start:"11:00", end:"12:00", subject:"Quantitative Reasoning I", room:"CB Room 15 2nd Floor", teacher:"T2 Maths"},
  {day:"Wednesday", start:"14:00", end:"16:00", subject:"Financial Accounting", room:"CB Room 15 2nd Floor", teacher:"Ms. Sana Mushtaq"},
  {day:"Thursday", start:"08:00", end:"10:00", subject:"Quantitative Reasoning I", room:"CB Room 2", teacher:"T2 Maths"},
  {day:"Thursday", start:"11:00", end:"12:00", subject:"DSA (TH)", room:"CB Room 1", teacher:"Mr. Nazir"},
  {day:"Thursday", start:"13:00", end:"14:00", subject:"Business Mathematics II", room:"CB Room 2", teacher:"T13 Maths"},
  {day:"Friday", start:"08:00", end:"09:00", subject:"Financial Accounting", room:"CB Room 7", teacher:"Ms. Sana Mushtaq"},
  {day:"Friday", start:"09:00", end:"11:00", subject:"Business Mathematics II", room:"CB Room 11", teacher:"T13 Maths"}
];

let diaries = JSON.parse(localStorage.getItem("academicDiaries") || "[]");
let settings = JSON.parse(localStorage.getItem("academicSettings") || JSON.stringify({
  notifications:false,before:true,beforeMinutes:15,after:true
}));
let activeClass = null;

const $ = id => document.getElementById(id);
const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function saveSettings(){ localStorage.setItem("academicSettings", JSON.stringify(settings)); }
function formatTime(t){ const [h,m]=t.split(":"); const d=new Date(); d.setHours(+h,+m); return d.toLocaleTimeString([], {hour:"numeric",minute:"2-digit"}); }
function todayName(){ return dayNames[new Date().getDay()]; }

function showView(view){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active-view"));
  $(view).classList.add("active-view");
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  const titles={dashboard:"Good evening 👋",timetable:"Your timetable",diary:"Your class diary",assignments:"Your assignments",settings:"Notification settings"};
  $("pageTitle").textContent=titles[view]||"Academic Diary";
  if(view==="dashboard") renderDashboard();
  if(view==="timetable") renderTimetable();
  if(view==="diary") renderDiaries();
  if(view==="assignments") renderAssignments();
}
document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.go)));

function renderDashboard(){
  const day=todayName();
  $("todayLabel").textContent=day;
  const classes=schedule.filter(x=>x.day===day);
  $("todayClasses").innerHTML=classes.length ? classes.map((c,i)=>`
    <div class="class-card">
      <div class="class-time">${formatTime(c.start)}<br><span style="color:#94a3b8">to ${formatTime(c.end)}</span></div>
      <div class="class-info"><strong>${c.subject}</strong><span>${c.room}${c.teacher?" · "+c.teacher:""}</span></div>
      <button class="class-action" onclick="openDiary(${schedule.indexOf(c)})">+ Diary</button>
    </div>`).join("") : `<div class="empty">No classes today 🎉</div>`;
  $("diaryCount").textContent=diaries.length;
  $("pendingCount").textContent=diaries.filter(d=>d.assignment && !d.completed).length;
  $("studyHours").textContent=Math.round(schedule.length*1.5/7*10)/10+"h";
  $("streak").textContent=(diaries.length?Math.min(diaries.length,30):0)+" days";
}

function renderTimetable(){
  $("fullTimetable").innerHTML=`<table class="schedule-table"><thead><tr><th>Day</th><th>Time</th><th>Subject</th><th>Room</th><th>Teacher</th></tr></thead><tbody>
  ${schedule.map(c=>`<tr><td>${c.day}</td><td>${formatTime(c.start)} – ${formatTime(c.end)}</td><td><strong>${c.subject}</strong></td><td>${c.room}</td><td>${c.teacher||"—"}</td></tr>`).join("")}</tbody></table>`;
}

function renderDiaries(){
  $("diaryList").innerHTML=diaries.length ? diaries.slice().reverse().map(d=>`
  <div class="class-card"><div class="class-info"><strong>${d.subject}</strong><span>${d.date} · ${d.time}</span><p>${escapeHtml(d.taught||"No lesson notes added.")}</p>${d.assignment?`<small>📋 ${escapeHtml(d.assignment)}</small>`:""}</div></div>`).join("") : `<div class="empty">Your class notes will appear here after you save your first entry.</div>`;
}

function renderAssignments(){
  const items=diaries.filter(d=>d.assignment);
  $("assignmentList").innerHTML=items.length ? items.map((d,i)=>`
  <div class="class-card"><div class="class-info"><strong>${escapeHtml(d.assignment)}</strong><span>${d.subject} · Deadline: ${d.deadline||"Not set"}</span></div><button class="class-action" onclick="completeAssignment(${diaries.indexOf(d)})">${d.completed?"✓ Completed":"Mark done"}</button></div>`).join("") : `<div class="empty">No assignments yet.</div>`;
}
function completeAssignment(i){diaries[i].completed=!diaries[i].completed;localStorage.setItem("academicDiaries",JSON.stringify(diaries));renderAssignments();renderDashboard();}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}

window.openDiary=function(index){
  activeClass=schedule[index];
  $("modalSubject").textContent=activeClass.subject;
  $("modalTime").textContent=`${activeClass.day} · ${formatTime(activeClass.start)} – ${formatTime(activeClass.end)}`;
  $("taught").value=""; $("assignment").value=""; $("deadline").value="";
  $("diaryModal").classList.remove("hidden");
};
$("closeModal").onclick=()=>$("diaryModal").classList.add("hidden");
$("saveDiary").onclick=()=>{
  if(!activeClass)return;
  diaries.push({subject:activeClass.subject,time:`${formatTime(activeClass.start)} – ${formatTime(activeClass.end)}`,date:new Date().toLocaleDateString(),taught:$("taught").value.trim(),assignment:$("assignment").value.trim(),deadline:$("deadline").value,completed:false});
  localStorage.setItem("academicDiaries",JSON.stringify(diaries));
  $("diaryModal").classList.add("hidden"); renderDashboard();
  alert("Diary entry saved ✓");
};

async function requestNotifications(){
  if(!("Notification" in window)){alert("This browser does not support notifications.");return false}
  const permission=await Notification.requestPermission();
  settings.notifications=permission==="granted"; saveSettings(); syncSettingsUI();
  if(permission==="granted") new Notification("Academic Diary", {body:"Notifications are enabled ✓"});
  return settings.notifications;
}
$("enableNotifications").onclick=requestNotifications;
$("notificationBtn").onclick=()=>showView("settings");

$("notificationsToggle").onchange=async e=>{if(e.target.checked) await requestNotifications(); else {settings.notifications=false;saveSettings();syncSettingsUI();}};
$("beforeToggle").onchange=e=>{settings.before=e.target.checked;saveSettings()};
$("afterToggle").onchange=e=>{settings.after=e.target.checked;saveSettings()};
$("beforeMinutes").onchange=e=>{settings.beforeMinutes=+e.target.value;saveSettings()};
$("testNotification").onclick=()=>{if(settings.notifications && Notification.permission==="granted") new Notification("Academic Diary", {body:"Test notification — your reminders are working."}); else requestNotifications()};

function syncSettingsUI(){
  $("notificationsToggle").checked=settings.notifications && Notification.permission==="granted";
  $("beforeToggle").checked=settings.before; $("afterToggle").checked=settings.after; $("beforeMinutes").value=settings.beforeMinutes;
}
$("timetableFile").onchange=e=>{
  const f=e.target.files[0]; if(!f)return;
  $("uploadStatus").textContent=`Selected: ${f.name} — AI analysis will be connected next.`;
};

if("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(console.error));
syncSettingsUI(); renderDashboard(); renderTimetable();
