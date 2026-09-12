// Import Firebase SDKs (CDN modular versions for browser)
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
  addDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Configuration provided by user
const firebaseConfig = {
  apiKey: "AIzaSyBZhcFXrC_16FLAQ32v9zhrxmg4uWH_g4Y",
  authDomain: "academic-diary-3a12d.firebaseapp.com",
  projectId: "academic-diary-3a12d",
  storageBucket: "academic-diary-3a12d.firebasestorage.app",
  messagingSenderId: "654645926256",
  appId: "1:654645926256:web:872c7cb1ad3425af4e17b5",
  measurementId: "G-SZE0CLZ4L0"
};

// Initialize Firebase (Declared only once)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Sample Timetable Data for UET Business Data Analytics
const sampleTimetable = [
  { day: "Monday", time: "08:00 - 09:30", subject: "Data Structures & Algorithms", room: "Lab 3", teacher: "Dr. Ahmed" },
  { day: "Monday", time: "09:45 - 11:15", subject: "Financial Accounting", room: "Hall B", teacher: "Sir Bilal" },
  { day: "Tuesday", time: "08:00 - 09:30", subject: "Business Analytics", room: "Room 102", teacher: "Dr. Usman" },
  { day: "Wednesday", time: "11:30 - 01:00", subject: "Data Structures & Algorithms", room: "Lab 3", teacher: "Dr. Ahmed" }
];

document.addEventListener("DOMContentLoaded", () => {
  console.log("Academic Diary Loaded Successfully");

  // Ensure user is authenticated anonymously
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth error:", err);
      }
    } else {
      console.log("Authenticated user ID:", user.uid);
      loadDashboardData(user.uid);
    }
  });

  setupNavigation();
  setupModalHandlers();
  setupNotificationsUI();
  renderTimetableTable();
});

// Handle Sidebar Navigation Views
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
        if (view.id === targetView) {
          view.classList.add("active-view");
        }
      });

      if (pageTitle) {
        if (targetView === "dashboard") pageTitle.textContent = "Good evening 👋";
        else if (targetView === "timetable") pageTitle.textContent = "Timetable 📅";
        else if (targetView === "diary") pageTitle.textContent = "Class Diary ✎";
        else if (targetView === "assignments") pageTitle.textContent = "Assignments ✓";
        else if (targetView === "settings") pageTitle.textContent = "Settings ⚙";
      }
    });
  });

  const goTimetableBtn = document.querySelector("[data-go='timetable']");
  if (goTimetableBtn) {
    goTimetableBtn.addEventListener("click", () => {
      document.querySelector("[data-view='timetable']").click();
    });
  }
}

// Render Timetable inside the Timetable view
function renderTimetableTable() {
  const container = document.getElementById("fullTimetable");
  if (!container) return;

  let html = `<table class="timetable-grid" style="width:100%; border-collapse: collapse; margin-top: 1rem;">
    <thead>
      <tr style="background: rgba(255,255,255,0.05); text-align: left;">
        <th style="padding: 10px;">Day</th>
        <th style="padding: 10px;">Time</th>
        <th style="padding: 10px;">Subject</th>
        <th style="padding: 10px;">Room</th>
        <th style="padding: 10px;">Teacher</th>
      </tr>
    </thead>
    <tbody>`;

  sampleTimetable.forEach(item => {
    html += `<tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
      <td style="padding: 10px;"><strong>${item.day}</strong></td>
      <td style="padding: 10px;">${item.time}</td>
      <td style="padding: 10px; color: #38bdf8;">${item.subject}</td>
      <td style="padding: 10px;">${item.room}</td>
      <td style="padding: 10px;">${item.teacher}</td>
    </tr>`;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
}

// Load Dashboard Data & Stats from Firestore
async function loadDashboardData(userId) {
  const todayLabel = document.getElementById("todayLabel");
  const todayClasses = document.getElementById("todayClasses");
  
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const currentDate = new Date().toLocaleDateString('en-US', options);
  if (todayLabel) todayLabel.textContent = currentDate;

  if (todayClasses) {
    let html = "";
    sampleTimetable.slice(0, 2).forEach((cls) => {
      html += `<div class="class-card" style="background: rgba(255,255,255,0.03); padding: 1rem; border-radius: 8px; margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span style="font-size: 0.8rem; color: #38bdf8; font-weight: 600;">${cls.time} • ${cls.room}</span>
          <h4 style="margin: 4px 0 0 0;">${cls.subject}</h4>
          <small style="color: #94a3b8;">Instructor: ${cls.teacher}</small>
        </div>
        <button class="secondary-btn open-diary-modal" data-subject="${cls.subject}" data-time="${cls.time}" style="padding: 6px 12px; font-size: 0.85rem; background: #1e293b; border: 1px solid rgba(255,255,255,0.1); color: #fff; border-radius: 6px; cursor: pointer;">Add Diary ✎</button>
      </div>`;
    });
    todayClasses.innerHTML = html;
    
    document.querySelectorAll(".open-diary-modal").forEach(btn => {
      btn.addEventListener("click", () => {
        const subject = btn.getAttribute("data-subject");
        const time = btn.getAttribute("data-time");
        openDiaryModal(subject, time);
      });
    });
  }

  try {
    const diarySnap = await getDocs(collection(db, `users/${userId}/diary`));
    const assignmentsSnap = await getDocs(collection(db, `users/${userId}/assignments`));

    document.getElementById("diaryCount").textContent = diarySnap.size;
    document.getElementById("pendingCount").textContent = assignmentsSnap.size;
    document.getElementById("studyHours").textContent = `${sampleTimetable.length * 2}h`;
    document.getElementById("streak").textContent = `${Math.max(1, diarySnap.size)} days`;
  } catch (err) {
    console.log("Firestore fetch note:", err.message);
  }
}

// Modal handling for Class Diary entry
function openDiaryModal(subject, time) {
  const modal = document.getElementById("diaryModal");
  const modalSubject = document.getElementById("modalSubject");
  const modalTime = document.getElementById("modalTime");
  
  if (modal && modalSubject && modalTime) {
    modalSubject.textContent = subject;
    modalTime.textContent = time;
    modal.classList.remove("hidden");
  }
}

function setupModalHandlers() {
  const modal = document.getElementById("diaryModal");
  const closeModal = document.getElementById("closeModal");
  const saveDiary = document.getElementById("saveDiary");

  if (closeModal && modal) {
    closeModal.addEventListener("click", () => modal.classList.add("hidden"));
  }

  if (saveDiary) {
    saveDiary.addEventListener("click", async () => {
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
          await addDoc(collection(db, `users/${user.uid}/diary`), {
            subject,
            taught,
            date: new Date().toISOString()
          });

          if (assignment) {
            await addDoc(collection(db, `users/${user.uid}/assignments`), {
              title: assignment,
              subject,
              deadline: deadline || "No deadline",
              completed: false
            });
          }

          alert("Diary entry saved successfully to Firebase!");
          modal.classList.add("hidden");
          loadDashboardData(user.uid);
        } catch (err) {
          alert("Error saving: " + err.message);
        }
      }
    });
  }
}

// Notifications setup
function setupNotificationsUI() {
  const enableBtn = document.getElementById("enableNotifications");
  const testBtn = document.getElementById("testNotification");
  const notifToggle = document.getElementById("notificationsToggle");

  if (enableBtn) {
    enableBtn.addEventListener("click", async () => {
      if (!("Notification" in window)) {
        alert("This browser does not support desktop notifications.");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        alert("Notifications enabled successfully!");
        if (notifToggle) notifToggle.checked = true;
      } else {
        alert("Notification permission denied.");
      }
    });
  }

  if (testBtn) {
    testBtn.addEventListener("click", () => {
      if (Notification.permission === "granted") {
        new Notification("Academic Diary Test", {
          body: "Your notifications are working perfectly!",
          icon: "manifest.json"
        });
      } else {
        alert("Please enable notifications first.");
      }
    });
  }
}
