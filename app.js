// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  onAuthStateChanged,
  signInAnonymously 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc 
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
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth error:", err);
      }
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

function checkAndRegisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service Worker registered:', reg.scope))
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

function mergeConsecutiveClasses(classes) {
  if (!classes || classes.length === 0) return [];
  const merged = [];
  let current = { ...classes[0] };

  for (let i = 1; i < classes.length; i++) {
    const next = classes[i];
    if (current.day === next.day && current.subject === next.subject && current.room === next.room) {
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

  if (todayLabel) {
    todayLabel.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

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

    const timetable = mergeConsecutiveClasses(rawTimetable);

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
    let diaryEntries = [];
    diarySnap.forEach(d => diaryEntries.push(d.data()));

    const diaryCountEl = document.getElementById("diaryCount");
    const studyHoursEl = document.getElementById("studyHours");
    const streakEl = document.getElementById("streak");

    if (diaryCountEl) diaryCountEl.textContent = diaryEntries.length;
    if (studyHoursEl) studyHoursEl.textContent = `${timetable.length * 2}h`;
    if (streakEl) streakEl.textContent = `${Math.max(1, diaryEntries.length)} days`;

    if (diaryList) {
      let dHtml = "";
      diaryEntries.forEach(data => {
        dHtml += `<div style="background: rgba(255,255,255,0.03); padding: 1rem; border-radius: 8px; margin-bottom: 0.75rem;">
          <h4 style="color: #38bdf8; margin: 0 0 4px 0;">${data.subject}</h4>
          <p style="margin: 0 0 8px 0; font-size: 0.9rem;">${data.taught}</p>
          <small style="color: #94a3b8;">Saved on: ${new Date(data.date).toLocaleDateString()}</small>
        </div>`;
      });
      diaryList.innerHTML = dHtml || "<p style='color: #94a3b8;'>No diary entries yet.</p>";
    }

    await loadAssignmentsAndStats(userId);
    renderSubjectProgress(timetable, diaryEntries);

  } catch (err) {
    console.error("Error loading user data:", err);
  }
}

async function loadAssignmentsAndStats(userId) {
  const assignmentList = document.getElementById("assignmentList");
  const assignmentsSnap = await getDocs(collection(db, `users/${userId}/assignments`));
  
  let pendingCount = 0;
  let aHtml = "";
  const today = new Date().toISOString().split('T')[0];

  assignmentsSnap.forEach(docSnap => {
    const data = docSnap.data();
    const isOverdue = data.deadline < today && !data.completed;
    if (!data.completed) pendingCount++;

    aHtml += `<div style="background: rgba(255,255,255,0.03); padding: 1rem; border-radius: 8px; margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid ${isOverdue ? '#ef4444' : '#38bdf8'};">
      <div>
        <h4 style="margin: 0 0 4px 0;">${data.title}</h4>
        <span style="font-size: 0.8rem; color: #94a3b8;">${data.subject} • Due: ${data.deadline}</span>
        ${isOverdue ? '<span style="margin-left: 8px; font-size: 0.75rem; color: #ef4444; font-weight: bold;">OVERDUE</span>' : ''}
      </div>
    </div>`;
  });

  if (assignmentList) {
    assignmentList.innerHTML = aHtml || "<p style='color: #94a3b8;'>No pending assignments.</p>";
  }
  const pendingCountEl = document.getElementById("pendingCount");
  if (pendingCountEl) pendingCountEl.textContent = pendingCount;
}

function renderSubjectProgress(timetable, diaryEntries) {
  const subjects = [...new Set(timetable.map(t => t.subject))];
  let progressHtml = `<div class="settings-card" style="margin-top: 1.5rem;"><h3 style="margin-bottom: 1rem;">Subject Progress</h3>`;
  
  subjects.forEach(subject => {
    const count = diaryEntries.filter(d => d.subject === subject).length;
    const percentage = Math.min(100, (count * 25) + 40);
    
    progressHtml += `<div style="margin-bottom: 1rem;">
      <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px;">
        <span>${subject}</span>
        <span style="color: #38bdf8;">${percentage}%</span>
      </div>
      <div style="background: rgba(255,255,255,0.1); height: 8px; border-radius: 4px; overflow: hidden;">
        <div style="background: #38bdf8; width: ${percentage}%; height: 100%;"></div>
      </div>
    </div>`;
  });
  
  progressHtml += `</div>`;
  const dashboard = document.getElementById("dashboard");
  let existingProgress = document.getElementById("subjectProgressWidget");
  if (!existingProgress && dashboard) {
    const widget = document.createElement("div");
    widget.id = "subjectProgressWidget";
    widget.innerHTML = progressHtml;
    dashboard.appendChild(widget);
  } else if (existingProgress) {
    existingProgress.innerHTML = progressHtml;
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
    
    let user = auth.currentUser;
    if (!user) {
      try {
        const cred = await signInAnonymously(auth);
        user = cred.user;
      } catch (err) {
        alert("Authentication failed.");
        return;
      }
    }

    if (!taught) {
      alert("Please write what was taught today.");
      return;
    }

    try {
      await addDoc(collection(db, `users/${user.uid}/diary`), { subject, taught, date: new Date().toISOString() });
      if (assignment) {
        await addDoc(collection(db, `users/${user.uid}/assignments`), { title: assignment, subject, deadline: deadline || "No deadline", completed: false });
      }
      alert("Entry saved successfully!");
      modal.classList.add("hidden");
      loadUserData(user.uid);
    } catch (err) {
      alert("Error saving: " + err.message);
    }
  });
}

function setupTimetableUpload() {
  const fileInput = document.getElementById("timetableFile");
  const statusDiv = document.getElementById("uploadStatus");

  fileInput?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    statusDiv.textContent = "Analyzing timetable with AI... Please wait ⏳";
    
    let user = auth.currentUser;
    if (!user) {
      try {
        const cred = await signInAnonymously(auth);
        user = cred.user;
      } catch (err) {
        statusDiv.textContent = "Error: User authentication failed.";
        return;
      }
    }

    try {
      const base64Data = await fileToBase64(file);
      const extractedClasses = await analyzeTimetableWithAI(base64Data, file.type);

      if (extractedClasses && extractedClasses.length > 0) {
        for (const cls of extractedClasses) {
          await addDoc(collection(db, `users/${user.uid}/timetable`), {
            day: cls.day || "Monday",
            time: cls.time || "08:00 - 09:00",
            subject: cls.subject || "General Class",
            room: cls.room || "TBD",
            teacher: cls.teacher || "TBD"
          });
        }
        statusDiv.textContent = "Success! Timetable analyzed and saved automatically 🎉";
        loadUserData(user.uid);
      } else {
        statusDiv.textContent = "Could not parse schedule. Please try a clearer image.";
      }
    } catch (err) {
      console.error("AI Analysis Error:", err);
      statusDiv.textContent = "Error analyzing timetable: " + err.message;
    }
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
  });
}

async function analyzeTimetableWithAI(base64Image, mimeType) {
  const GEMINI_API_KEY = "AIzaSyBZhcFXrC_16FLAQ32v9zhrxmg4uWH_g4Y";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const prompt = `Analyze this timetable image and extract all classes. Return ONLY a valid JSON array of objects with keys: day, time (e.g. 08:00 - 09:30), subject, room, teacher. Do not include markdown formatting like \`\`\`json, just return the raw JSON array.`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType || "image/jpeg", data: base64Image } }
        ]
      }]
    })
  });

  const data = await response.json();
  const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!textResponse) throw new Error("No response from AI model.");

  const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleanJson);
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
      new Notification("Academic Diary Reminder", { body: "System is fully operational!" });
    } else {
      alert("Enable notifications first.");
    }
  });
}
