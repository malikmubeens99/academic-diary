import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js';
import {getAuth,onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut,updateProfile} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';
import {getFirestore,doc,setDoc,getDoc,collection,addDoc,deleteDoc,onSnapshot} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
import {getMessaging,getToken,onMessage} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-messaging.js';

const firebaseConfig={
  apiKey:'AIzaSyBZhcFXrC_16FLAQ32v9zhrxmg4uWH_g4Y',
  authDomain:'academic-diary-3a12d.firebaseapp.com',
  projectId:'academic-diary-3a12d',
  storageBucket:'academic-diary-3a12d.firebasestorage.app',
  messagingSenderId:'654645926256',
  appId:'1:654645926256:web:872c7cb1ad3425af4e17b5',
  measurementId:'G-SZE0CLZ4L0'
};

const VAPID_PUBLIC_KEY='BNvA4c_XnfgDlg6tU0mqbs6zNgZhQM1Ht9R1mZLlxU6zugM5KqQhvPfSW1QGBQdwGSoQJQH2ybWfZdR4hF1GSlE';
const GEMINI_API_KEY='AIzaSyBIr1zSKNREyHANNrdFAUYFqhFle-qgfuw';

const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
let user=null,classes=[],notes=[],tasks=[],prefs={before:true,after:true,beforeMin:10};

const sample=[
  ['Monday','Principles of Marketing','08:00','11:00'],
  ['Monday','Data Structures & Algorithms','13:00','15:00'],
  ['Tuesday','Financial Accounting','08:00','11:00'],
  ['Wednesday','Business Mathematics','11:00','13:00'],
  ['Thursday','Quantitative Reasoning','09:00','11:00'],
  ['Friday','Business Analytics','08:00','10:00']
].map(x=>({day:x[0],subject:x[1],start:x[2],end:x[3]}));

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

function openModal(html){
  $('modalContent').innerHTML=html;
  $('modal').classList.remove('hidden');
}
function closeModal(){
  $('modal').classList.add('hidden');
}
$('closeModal').onclick=closeModal;
$('modal').onclick=e=>{if(e.target===$('modal'))closeModal()};

function toast(msg){
  $('authMsg').textContent=msg;
  setTimeout(()=>{$('authMsg').textContent=''},4000);
}

async function loadData(){
  if(!user)return;
  try {
    const u=await getDoc(doc(db,'users',user.uid));
    if(u.exists()) prefs={...prefs,...(u.data().preferences||{})};
    
    onSnapshot(collection(db,'users',user.uid,'classes'),s=>{
      classes=s.docs.map(d=>({id:d.id,...d.data()}));
      renderAll();
    });
    onSnapshot(collection(db,'users',user.uid,'notes'),s=>{
      notes=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
      renderAll();
    });
    onSnapshot(collection(db,'users',user.uid,'tasks'),s=>{
      tasks=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(a.due||'').localeCompare(String(b.due||'')));
      renderAll();
    });
  } catch(err){
    console.error("Error loading data:", err);
  }
}

async function seed(){
  try {
    const snap=await getDoc(doc(db,'users',user.uid,'meta','seed'));
    if(!snap.exists()){
      for(const c of sample) await addDoc(collection(db,'users',user.uid,'classes'),c);
      await setDoc(doc(db,'users',user.uid,'meta','seed'),{done:true});
    }
  } catch(err){
    console.error("Seed error:", err);
  }
}

function todayName(){return new Intl.DateTimeFormat('en-US',{weekday:'long'}).format(new Date())}
function fmt(t){return new Date('2000-01-01T'+t).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}
function renderAll(){renderHome();renderTimetable();renderDiary();renderTasks();renderSettings()}

function renderHome(){
  const day=todayName(),today=classes.filter(c=>c.day===day).sort((a,b)=>a.start.localeCompare(b.start));
  $('home').innerHTML=`
    <div class="grid">
      <div class="card"><span class="muted">Today's classes</span><div class="stat">${today.length}</div></div>
      <div class="card"><span class="muted">Pending assignments</span><div class="stat">${tasks.filter(t=>!t.done).length}</div></div>
      <div class="card"><span class="muted">Diary entries</span><div class="stat">${notes.length}</div></div>
    </div>
    <div class="section-head"><h3>Today's timetable</h3><button class="secondary" id="addClassHome">+ Class</button></div>
    ${today.length?today.map(classHtml).join(''):`<div class="empty">No classes today. Enjoy your free time ✨</div>`}
    <div class="section-head"><h3>Quick diary</h3></div>
    ${notes.slice(0,3).map(noteHtml).join('')||'<div class="empty">No notes yet.</div>'}
  `;
  $('addClassHome').onclick=()=>classModal();
}

function classHtml(c){
  return `<div class="class-card"><div><div class="class-time">${fmt(c.start)} – ${fmt(c.end)}</div><b>${esc(c.subject)}</b></div><span class="badge">${esc(c.day)}</span></div>`;
}

function renderTimetable(){
  $('timetable').innerHTML=`
    <div class="row"><div><h3>Weekly timetable</h3><p class="muted">Synced with Firebase.</p></div><div><button class="secondary" id="importSample">Add sample</button> <button class="primary small" id="addClass">+ Add class</button></div></div>
    <div class="upload">
      <b>🤖 AI timetable import</b>
      <p class="muted">Upload an image or PDF to auto-extract your timetable schedule.</p>
      <input id="aiFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf">
      <button class="primary" id="aiImport">Analyze timetable</button>
      <div id="aiStatus" class="muted"></div>
    </div>
    <div class="week">${['Monday','Tuesday','Wednesday','Thursday','Friday'].map(d=>`<div class="day"><h4>${d}</h4>${classes.filter(c=>c.day===d).sort((a,b)=>a.start.localeCompare(b.start)).map(c=>`<div class="mini"><b>${fmt(c.start)}–${fmt(c.end)}</b><br>${esc(c.subject)}<br><button class="danger" data-del-class="${c.id}">Delete</button></div>`).join('')||'<span class="muted">No class</span>'}</div>`).join('')}</div>
  `;
  $('addClass').onclick=classModal;
  $('importSample').onclick=async()=>{
    for(const c of sample) await addDoc(collection(db,'users',user.uid,'classes'),c);
    alert('Sample classes added successfully!');
  };
  $('aiImport').onclick=analyzeTimetable;
  document.querySelectorAll('[data-del-class]').forEach(b=>b.onclick=async()=>deleteDoc(doc(db,'users',user.uid,'classes',b.dataset.delClass)));
}

function fileToBase64(file){
  return new Promise((resolve,reject)=>{
    const r=new FileReader();
    r.onload=()=>resolve(String(r.result).split(',')[1]);
    r.onerror=reject;
    r.readAsDataURL(file);
  });
}

async function analyzeTimetable(){
  const file=$('aiFile')?.files?.[0];
  if(!file)return alert('Please select an image or PDF first.');
  
  $('aiStatus').textContent='AI is reading your timetable…';
  $('aiImport').disabled=true;
  
  try {
    const base64Data = await fileToBase64(file);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const prompt = `Analyze this timetable image and extract classes. Return ONLY a valid JSON array of objects with keys: day, subject, start (HH:MM in 24h format), end (HH:MM in 24h format). No markdown code blocks, just raw JSON array.`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: file.type || "image/jpeg", data: base64Data } }
          ]
        }],
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
      })
    });

    const data = await response.json();
    if(data.error) throw new Error(data.error.message);

    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if(!textResponse) throw new Error("No response received from AI model.");

    let cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonMatch = cleanJson.match(/\[[\s\S]*\]/);
    if(jsonMatch) cleanJson = jsonMatch[0];

    const rows = JSON.parse(cleanJson);
    $('aiStatus').textContent=`Found ${rows.length} classes. Review below.`;
    previewAiClasses(rows);
  } catch(e){
    console.error("AI Error:", e);
    $('aiStatus').textContent='';
    alert("AI parsing failed. Please use '+ Add class' or 'Add sample' to manage your schedule easily.");
  } finally {
    $('aiImport').disabled=false;
  }
}

function previewAiClasses(rows){
  const safe=rows.map((r,i)=>`<div class="ai-row"><select data-ai-day="${i}">${['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d=>`<option ${d===r.day?'selected':''}>${d}</option>`).join('')}</select><input data-ai-subject="${i}" value="${esc(r.subject)}"><input data-ai-start="${i}" type="time" value="${esc(r.start)}"><input data-ai-end="${i}" type="time" value="${esc(r.end)}"></div>`).join('');
  openModal(`<h2>Review AI timetable</h2><p class="muted">Review and save extracted classes.</p><div class="ai-list">${safe}</div><button class="primary" id="saveAiClasses">Save ${rows.length} classes</button>`);
  $('saveAiClasses').onclick=async()=>{
    for(let i=0;i<rows.length;i++){
      const day=document.querySelector(`[data-ai-day="${i}"]`).value,
            subject=document.querySelector(`[data-ai-subject="${i}"]`).value.trim(),
            start=document.querySelector(`[data-ai-start="${i}"]`).value,
            end=document.querySelector(`[data-ai-end="${i}"]`).value;
      if(subject&&start&&end) await addDoc(collection(db,'users',user.uid,'classes'),{day,subject,start,end,source:'ai'});
    }
    closeModal();
    alert('Timetable saved successfully!');
  }
}

function renderDiary(){
  $('diary').innerHTML=`<div class="row"><div><h3>Class diary</h3><p class="muted">Capture what you studied.</p></div><button class="primary small" id="newNote">+ New entry</button></div>${notes.map(noteHtml).join('')||'<div class="empty">Your diary is empty.</div>'}`;
  $('newNote').onclick=noteModal;
}

function noteHtml(n){
  return `<div class="card" style="margin-bottom:10px"><div class="row"><b>${esc(n.title||'Class note')}</b><button class="danger" data-del-note="${n.id}">Delete</button></div><p>${esc(n.body||'')}</p>${n.assignment?`<span class="badge">Assignment: ${esc(n.assignment)}</span>`:''}</div>`;
}

function renderTasks(){
  $('tasks').innerHTML=`<div class="row"><div><h3>Assignments</h3><p class="muted">Track your deadlines.</p></div><button class="primary small" id="newTask">+ Assignment</button></div>${tasks.map(t=>`<div class="class-card"><div><b>${esc(t.title)}</b><div class="muted">${esc(t.subject||'General')} · Due ${esc(t.due||'No date')}</div></div><div><button class="secondary" data-done="${t.id}">${t.done?'Undo':'Done'}</button> <button class="danger" data-del-task="${t.id}">×</button></div></div>`).join('')||'<div class="empty">No assignments yet.</div>'}`;
  $('newTask').onclick=taskModal;
}

function renderSettings(){
  $('settings').innerHTML=`
    <div class="card">
      <h3>Notifications</h3>
      <p class="muted">Enable browser push notifications.</p>
      <button class="primary" id="enablePush">🔔 Enable notifications</button>
      <div class="toggle"><div><b>Before class reminder</b></div><button class="switch ${prefs.before?'on':''}" id="beforeToggle"><i></i></button></div>
    </div>
    <div class="card" style="margin-top:15px"><h3>Account</h3><p>${esc(user?.displayName||'Student')}<br><span class="muted">${esc(user?.email||'')}</span></p></div>
  `;
  $('enablePush').onclick=enablePush;
  $('beforeToggle').onclick=()=>savePrefs({before:!prefs.before});
}

async function savePrefs(x){
  prefs={...prefs,...x};
  await setDoc(doc(db,'users',user.uid),{preferences:prefs},{merge:true});
  renderSettings();
}

async function enablePush(){
  if(!('Notification'in window)||!('serviceWorker'in navigator))return alert('Not supported.');
  try{
    const permission=await Notification.requestPermission();
    if(permission!=='granted')return alert('Permission denied.');
    alert('Notifications enabled successfully ✅');
  }catch(e){
    alert('Could not enable notifications.');
  }
}

function classModal(){
  openModal(`<h2>Add class</h2><select id="cDay">${['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d=>`<option>${d}</option>`).join('')}</select><input id="cSubject" placeholder="Subject"><div class="row"><input id="cStart" type="time"><input id="cEnd" type="time"></div><button class="primary" id="saveClass">Save class</button>`);
  $('saveClass').onclick=async()=>{
    if(!$('cSubject').value||!$('cStart').value||!$('cEnd').value)return alert('Fill all fields');
    await addDoc(collection(db,'users',user.uid,'classes'),{day:$('cDay').value,subject:$('cSubject').value,start:$('cStart').value,end:$('cEnd').value});
    closeModal();
  }
}

function noteModal(){
  openModal(`<h2>New diary entry</h2><input id="nTitle" placeholder="Topic"><textarea id="nBody" rows="6" placeholder="What did you study?"></textarea><button class="primary" id="saveNote">Save entry</button>`);
  $('saveNote').onclick=async()=>{
    if(!$('nBody').value)return alert('Write something');
    await addDoc(collection(db,'users',user.uid,'notes'),{title:$('nTitle').value||'Note',body:$('nBody').value,createdAt:new Date()});
    closeModal();
  }
}

function taskModal(){
  openModal(`<h2>New assignment</h2><input id="tTitle" placeholder="Title"><input id="tSubject" placeholder="Subject"><input id="tDue" type="date"><button class="primary" id="saveTask">Save</button>`);
  $('saveTask').onclick=async()=>{
    if(!$('tTitle').value)return alert('Add title');
    await addDoc(collection(db,'users',user.uid,'tasks'),{title:$('tTitle').value,subject:$('tSubject').value,due:$('tDue').value,done:false});
    closeModal();
  }
}

function setupAuth(){
  document.querySelectorAll('.auth-tabs button').forEach(b=>b.onclick=()=>{
    document.querySelectorAll('.auth-tabs button').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    $('loginForm').classList.toggle('hidden',b.dataset.auth!=='login');
    $('signupForm').classList.toggle('hidden',b.dataset.auth!=='signup');
  });
  $('loginForm').onsubmit=async e=>{e.preventDefault();try{await signInWithEmailAndPassword(auth,$('loginEmail').value,$('loginPassword').value)}catch(e){toast(e.message)}};
  $('signupForm').onsubmit=async e=>{e.preventDefault();try{const r=await createUserWithEmailAndPassword(auth,$('signupEmail').value,$('signupPassword').value);await updateProfile(r.user,{displayName:$('signupName').value});await setDoc(doc(db,'users',r.user.uid),{name:$('signupName').value,email:r.user.email},{merge:true});}catch(e){toast(e.message)}};
}

function setupNav(){
  document.querySelectorAll('.nav[data-page]').forEach(b=>b.onclick=()=>showPage(b.dataset.page));
  $('quickAdd').onclick=noteModal;
  $('logoutBtn').onclick=()=>signOut(auth);
}

function showPage(p){
  document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
  $(p).classList.add('active');
  document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x.dataset.page===p));
  $('pageTitle').textContent={home:'Good morning 👋',timetable:'Your timetable',diary:'Your diary',tasks:'Assignments',settings:'Settings'}[p];
}

$('dateLabel').textContent=new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric'}).format(new Date());
setupAuth();
setupNav();

onAuthStateChanged(auth,async u=>{
  user=u;
  if(u){
    $('authView').classList.add('hidden');
    $('appView').classList.remove('hidden');
    await seed();
    await loadData();
  }else{
    $('authView').classList.remove('hidden');
    $('appView').classList.add('hidden');
  }
});

document.addEventListener('click',async e=>{
  const dn=e.target.dataset.delNote,dt=e.target.dataset.delTask,done=e.target.dataset.done;
  if(dn)await deleteDoc(doc(db,'users',user.uid,'notes',dn));
  if(dt)await deleteDoc(doc(db,'users',user.uid,'tasks',dt));
  if(done){
    const t=tasks.find(x=>x.id===done);
    await setDoc(doc(db,'users',user.uid,'tasks',done),{...t,done:!t.done},{merge:true});
  }
});
