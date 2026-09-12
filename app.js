// Import Firebase SDKs (CDN modular versions for browser)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// VAPID Key for Push Notifications
const VAPID_KEY = "BNvA4c_XnfgDlg6tU0mqbs6zNgZhQM1Ht9R1mZLlxU6zugM5KqQhvPfSW1QGBQdwGSoQJQH2ybWfZdR4hF1GSLE";

// DOM Elements & App State Management
document.addEventListener("DOMContentLoaded", () => {
  console.log("Academic Diary Initialized with Firebase Auth & Firestore");

  // Monitor Authentication State
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log("User logged in:", user.email);
      // Hide auth screens, show main app dashboard
      document.getElementById("auth-container")?.classList.add("hidden");
      document.getElementById("app-container")?.classList.remove("hidden");
      
      // Load user specific data from Firestore
      await loadUserData(user.uid);
    } else {
      console.log("No user logged in");
      // Show auth screen, hide main app
      document.getElementById("auth-container")?.classList.remove("hidden");
      document.getElementById("app-container")?.classList.add("hidden");
    }
  });

  // Setup Event Listeners for Login/Signup forms if they exist in UI
  setupAuthListeners();
});

// Authentication handlers
function setupAuthListeners() {
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("login-email").value;
      const pass = document.getElementById("login-password").value;
      try {
        await signInWithEmailAndPassword(auth, email, pass);
        alert("Login Successful!");
      } catch (error) {
        alert("Login Error: " + error.message);
      }
    });
  }

  const signupForm = document.getElementById("signup-form");
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("signup-email").value;
      const pass = document.getElementById("signup-password").value;
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;
        
        // Initialize user document in Firestore
        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          createdAt: new Date().toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });

        alert("Account created successfully!");
      } catch (error) {
        alert("Signup Error: " + error.message);
      }
    });
  }

  // Logout button handler
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      signOut(auth).then(() => {
        alert("Logged out successfully.");
      });
    });
  }
}

// Load user data from Firestore
async function loadUserData(userId) {
  try {
    const userDocRef = doc(db, "users", userId);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      console.log("User Data loaded:", userSnap.data());
    }
  } catch (error) {
    console.error("Error loading user data:", error);
  }
}
