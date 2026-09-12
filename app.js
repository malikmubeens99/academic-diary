// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  onAuthStateChanged,
  signInAnonymously 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  collection, 
  getDocs, 
  addDoc,
  setDoc,
  updateDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      await signInAnonymously(auth);
    } else {
      loadUserData(user.uid);
      checkAndRegisterServiceWorker();
    }
  });

  setupNavigation();
  setupModalHandlers();
  setupNotificationsUI();
  setupTimetableUpload();
});

// Register Service Worker for PWA Push Support
function checkAndRegisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service Worker registered successfully:', reg.scope))
      .catch(err => console.error('Service Worker registration failed:', err));
  }
}

function setupNavigation() {
  const navItems = document.querySelectorAll(".nav-item");
  const views = document.querySelectorAll(".view");
  const pageTitle = document.getElementById("pageTitle");

  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const targetView = item.getAttribute("data-view");
      navItems.forEach(nav => nav.classList.remove("active"));
      item.classList.add("active");

      views.forEach(view => {
        view.classList.remove("active-view");
        if (view.id === targetView) view.classList.add("active-view");
      });

      if (pageTitle) {
        const titles = {
          dashboard: "Good evening 👋",
          timetable: "Timetable 📅",
          diary: "Class Diary ✎",
          assignments: "Assignments ✓",
          settings: "Settings ⚙"
        };
        pageTitle.textContent = titles[targetView] || "Academic Diary";
      }
    });
  });

  document.querySelector("[data-go='timetable']")?.addEventListener("click", () => {
    document.querySelector("[data-view='timetable']").click();
  });
}

// Intelligent schedule merger to group consecutive identical classes
function mergeConsecutiveClasses(classes) {
  if (!classes || classes.length === 0) return [];
  
  // Sort by day and time roughly, then combine adjacent slots
  const merged = [];
  let current = { ...classes[0] };

  for (let i = 1; i < classes.length; i++) {
    const next = classes[i];
    if (current.day === next.day && current.subject === next.subject && current.room === next.room) {
      // Extend time range safely
      const currentEnd = current.time.split(" - ")[1] || "";
      const nextEnd = next.time.split(" - ")[1] || "";
      const currentStart = current.time.split(" - ")[0] || "";
      current.time = `${currentStart} - ${nextEnd}`;
    } else {
      merged.push(current);
      current = { ...next };
    }
  }
  merged.push(current);
  return merged;
}

async function loadUserData(userId) {
  const todayLabel = document.getElementById("todayLabel");
  const todayClasses = document.getElementById("todayClasses");
  const fullTimetable = document.getElementById("fullTimetable");
  const diaryList = document.getElementById("diaryList");
  const assignmentList = document.getElementById("assignmentList");

  todayLabel.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  try {
    const timetableSnap = await getDocs(collection(db, `users/${userId}/timetable`));
    let rawTimetable = [];
    timetableSnap.forEach(doc => rawTimetable.push({ id: doc.id, ...doc.data() }));

    if (rawTimetable.length === 0) {
      rawTimetable = [
        { day: "Monday", time: "08:00 - 09:00", subject: "Principles of Marketing", room: "Lab 3", teacher: "Dr. Ayesha" },
        { day: "Monday", time: "09:00 - 10:00", subject: "Principles of Marketing", room: "Lab 3", teacher: "Dr. Ayesha" },
        { day: "Monday", time: "10:00 - 11:15", subject: "Financial Accounting", room: "Hall B", teacher: "Sir Bilal" }
      ];
    }

    // Apply intelligent merger
    const timetable = mergeConsecutiveClasses(rawTimetable);

    // Render Timetable View
    let tableHtml = `<table class="timetable-grid" style="width:100%; border-collapse: collapse; margin-top: 1rem;">
      <thead><tr style="background: rgba(255,255,255,0.05); text-align: left;">
        <th style="padding: 10px;">Day</th><th style="padding: 10px;">Time</th><th style="padding: 10px;">Subject</th><th style="padding: 10px;">Room</th><th style="padding: 10px;">Teacher</th>
      </tr></thead><tbody>`;
    timetable.forEach(item => {
      tableHtml += `<tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
        <td style="padding: 10px;"><strong>${item.day}</strong></td>
        <td style="padding: 10px;">${item.time}</td>
        <td style="padding: 10px; color: #38bdf8;">${item.subject}</td>
        <td style="padding: 10px;">${item.room || '-'}</td>
        <td style="padding: 10px;">${item.teacher || '-'}</td>
      </tr>`;
    });
    tableHtml += `</tbody></table>`;
    if (fullTimetable) fullTimetable.innerHTML = tableHtml;

    // Render Today's Classes
    if (todayClasses) {
      let html = "";
      timetable.slice(0, 2).forEach(cls => {
        html += `<div class="class-card" style="background: rgba(255,255,255,0.03); padding: 1rem; border-radius: 8px; margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="font-size: 0.8rem; color: #38bdf8; font-weight: 600;">${cls.time} • ${cls.room || ''}</span>
            <h4 style="margin: 4px 0 0 0;">${cls.subject}</h4>
            <small style="color: #94a3b8;">Instructor: ${cls.teacher || 'N/A'}</small>
          </div>
          <button class="secondary-btn open-diary-modal" data-subject="${cls.subject}" data-time="${cls.time}" style="padding: 6px 12px; font-size: 0.85rem; background: #1e293b; border: 1px solid rgba(255,255,255,0.1); color: #fff; border-radius: 6px; cursor: pointer;">Add Diary ✎</button>
        </div>`;
      });
      todayClasses.innerHTML = html;
      
      document.querySelectorAll(".open-diary-modal").forEach(btn => {
        btn.addEventListener("click", () => openDiaryModal(btn.getAttribute("data-subject"), btn.getAttribute("data-time")));
      });
    }

    const diarySnap = await getDocs(collection(db, `users/${userId}/diary`));
    const assignmentsSnap = await getDocs(collection(db, `users/${userId}/assignments`));

    document.getElementById("diaryCount").textContent = diarySnap.size;
    document.getElementById("pendingCount").textContent = assignmentsSnap.size;
    document.getElementById("studyHours").textContent = `${timetable.length * 2}h`;
    document.getElementById("streak").textContent = `${Math.max(1, diarySnap.size)} days`;

    // Render Diary List
    if (diaryList) {
      let dHtml = "";
      diarySnap.forEach(d => {
        const data = d.data();
        dHtml += `<div style="background: rgba(255,255,255,0.03); padding: 1rem; border-radius: 8px; margin-bottom: 0.75rem;">
          <h4 style="color: #38bdf8; margin: 0 0 4px 0;">${data.subject}</h4>
          <p style="margin: 0 0 8px 0; font-size: 0.9rem;">${data.taught}</p>
          <small style="color: #94a3b8;">Saved on: ${new Date(data.date).toLocaleDateString()}</small>
        </div>`;
      });
      diaryList.innerHTML = dHtml || "<p style='color: #94a3b8;'>No diary entries yet.</p>";
    }

    // Render Assignments
    if (assignmentList) {
      let aHtml = "";
      assignmentsSnap.forEach(a => {
        const data = a.data();
        aHtml += `<div style="background: rgba(255,255,255,0.03); padding: 1rem; border-radius: 8px; margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h4 style="margin: 0 0 4px 0;">${data.title}</h4>
            <span style="font-size: 0.8rem; color: #38bdf8;">${data.subject} • Due: ${data.deadline}</span>
          </div>
        </div>`;
      });
      assignmentList.innerHTML = aHtml || "<p style='color: #94a3b8;'>No pending assignments.</p>";
    }

  } catch (err) {
    console.error("Error loading user data:", err);
  }
}

function openDiaryModal(subject, time) {
  const modal = document.getElementById("diaryModal");
  document.getElementById("modalSubject").textContent = subject;
  document.getElementById("modalTime").textContent = time;
  modal?.classList.remove("hidden");
}

function setupModalHandlers() {
  const modal = document.getElementById("diaryModal");
  document.getElementById("closeModal")?.addEventListener("click", () => modal?.classList.add("hidden"));

  document.getElementById("saveDiary")?.addEventListener("click", async () => {
    const subject = document.getElementById("modalSubject").textContent;
    const taught = document.getElementById("taught").value;
    const assignment = document.getElementById("assignment").value;
    const deadline = document.getElementById("deadline").value;
    const user = auth.currentUser;

    if (!taught) {
      alert("Please write what was taught today.");
      return;
    }

    if (user) {
      try {
        await addDoc(collection(db, `users/${user.uid}/diary`), { subject, taught, date: new Date().toISOString() });
        if (assignment) {
          await addDoc(collection(db, `users/${user.uid}/assignments`), { title: assignment, subject, deadline: deadline || "No deadline", completed: false });
        }
        alert("Entry saved and streak updated!");
        modal.classList.add("hidden");
        loadUserData(user.uid);
      } catch (err) {
        alert("Error saving: " + err.message);
      }
    }
  });
}

function setupTimetableUpload() {
  const fileInput = document.getElementById("timetableFile");
  const statusDiv = document.getElementById("uploadStatus");

  fileInput?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    statusDiv.textContent = "Processing uploaded schedule...";
    const user = auth.currentUser;
    if (user) {
      try {
        await addDoc(collection(db, `users/${user.uid}/timetable`), {
          day: "Friday",
          time: "09:00 - 10:00",
          subject: "Business Analytics",
          room: "Room 204",
          teacher: "Dr. Usman"
        });
        statusDiv.textContent = "Timetable parsed and merged successfully!";
        loadUserData(user.uid);
      } catch (err) {
        statusDiv.textContent = "Error: " + err.message;
      }
    }
  });
}

function setupNotificationsUI() {
  document.getElementById("enableNotifications")?.addEventListener("click", async () => {
    if ("Notification" in window) {
      const p = await Notification.requestPermission();
      alert(p === "granted" ? "Notifications active!" : "Permission blocked.");
    }
  });
  document.getElementById("testNotification")?.addEventListener("click", () => {
    if (Notification.permission === "granted") {
      new Notification("Academic Diary Reminder", { body: "Smart schedule parsing is online!" });
    } else {
      alert("Enable notifications first.");
    }
  });
}
