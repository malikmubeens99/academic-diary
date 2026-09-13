import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBZhcFXrC_16FLAQ32v9zhrxmg4uWH_g4Y",
  authDomain: "academic-diary-3a12d.firebaseapp.com",
  projectId: "academic-diary-3a12d",
  storageBucket: "academic-diary-3a12d.firebasestorage.app",
  messagingSenderId: "654645926256",
  appId: "1:654645926256:web:872c7cb1ad3425af4e17b5",
  measurementId: "G-SZE0CLZ4L0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;

// UI Elements Navigation
document.querySelectorAll('.nav-link').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.nav-link').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active-view'));
    button.classList.add('active');
    document.getElementById(button.dataset.target).classList.add('active-view');
    document.getElementById('view-title').textContent = button.textContent;
  });
});

// Auth Handlers
document.getElementById('login-btn').addEventListener('click', async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    document.getElementById('auth-error').textContent = err.message;
  }
});

document.getElementById('signup-btn').addEventListener('click', async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try {
    await createUserWithEmailAndPassword(auth, email, password);
  } catch (err) {
    document.getElementById('auth-error').textContent = err.message;
  }
});

document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, user => {
  currentUser = user;
  if (user) {
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    document.getElementById('user-email-display').textContent = user.email;
    initAppData();
  } else {
    document.getElementById('auth-container').classList.remove('hidden');
    document.getElementById('app-container').classList.add('hidden');
  }
});

// App Data & Realtime Sync
function initAppData() {
  const uid = currentUser.uid;

  // Classes
  onSnapshot(collection(db, `users/${uid}/classes`), snapshot => {
    const list = document.getElementById('timetable-list');
    const todayList = document.getElementById('today-classes-list');
    list.innerHTML = '';
    todayList.innerHTML = '';
    
    const todayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
    let todayCount = 0;
    let todayHtml = '';

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const itemHtml = `<div class="item-card"><div><strong>${data.subject}</strong><br><small style="color:#94a3b8;">${data.day} • ${data.start} - ${data.end}</small></div><button class="btn danger" onclick="deleteItem('classes', '${docSnap.id}')">Delete</button></div>`;
      list.innerHTML += itemHtml;

      if (data.day === todayName) {
        todayCount++;
        todayHtml += itemHtml;
      }
    });

    document.getElementById('stat-classes').textContent = todayCount;
    todayList.innerHTML = todayHtml || '<p style="color:#94a3b8;">No classes scheduled for today.</p>';
  });

  // Diary
  onSnapshot(collection(db, `users/${uid}/diary`), snapshot => {
    const list = document.getElementById('diary-list');
    list.innerHTML = '';
    let count = 0;
    snapshot.forEach(docSnap => {
      count++;
      const data = docSnap.data();
      list.innerHTML += `<div class="item-card"><div><strong>${data.subject}</strong><p style="margin-top:4px;">${data.notes}</p></div><button class="btn danger" onclick="deleteItem('diary', '${docSnap.id}')">Delete</button></div>`;
    });
    document.getElementById('stat-diary').textContent = count;
  });

  // Tasks
  onSnapshot(collection(db, `users/${uid}/tasks`), snapshot => {
    const list = document.getElementById('task-list');
    list.innerHTML = '';
    let pending = 0;
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (!data.done) pending++;
      list.innerHTML += `<div class="item-card"><div><strong>${data.title}</strong><br><small style="color:#94a3b8;">${data.subject} • Due: ${data.due}</small></div><button class="btn danger" onclick="deleteItem('tasks', '${docSnap.id}')">Delete</button></div>`;
    });
    document.getElementById('stat-tasks').textContent = pending;
  });
}

// Add actions
document.getElementById('add-class-btn').addEventListener('click', async () => {
  const day = document.getElementById('class-day').value;
  const subject = document.getElementById('class-subject').value;
  const start = document.getElementById('class-start').value;
  const end = document.getElementById('class-end').value;
  if (!subject || !start || !end) return alert('Fill all fields');
  await addDoc(collection(db, `users/${currentUser.uid}/classes`), { day, subject, start, end });
  document.getElementById('class-subject').value = '';
});

document.getElementById('add-diary-btn').addEventListener('click', async () => {
  const subject = document.getElementById('diary-subject').value;
  const notes = document.getElementById('diary-notes').value;
  if (!subject || !notes) return alert('Fill all fields');
  await addDoc(collection(db, `users/${currentUser.uid}/diary`), { subject, notes, timestamp: new Date() });
  document.getElementById('diary-subject').value = '';
  document.getElementById('diary-notes').value = '';
});

document.getElementById('add-task-btn').addEventListener('click', async () => {
  const title = document.getElementById('task-title').value;
  const subject = document.getElementById('task-subject').value;
  const due = document.getElementById('task-due').value;
  if (!title) return alert('Enter a title');
  await addDoc(collection(db, `users/${currentUser.uid}/tasks`), { title, subject, due, done: false });
  document.getElementById('task-title').value = '';
});

window.deleteItem = async function(col, id) {
  await deleteDoc(doc(db, `users/${currentUser.uid}/${col}/${id}`));
}
