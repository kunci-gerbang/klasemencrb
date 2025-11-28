// admin.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ==== CONFIG FIREBASE PUNYA KAMU ====
const firebaseConfig = {
  apiKey: "AIzaSyDMqHZJRirWCunxOQFXc3aL5M8NIwld6WM",
  authDomain: "klasemencrb.firebaseapp.com",
  projectId: "klasemencrb",
  storageBucket: "klasemencrb.firebasestorage.app",
  messagingSenderId: "703606806172",
  appId: "1:703606806172:web:3db31d6cbf75604b02bf59",
  measurementId: "G-44RRGYR8T9",
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// === DOM ELEMENTS ===
const loginCard = document.getElementById("login-card");
const panelCard = document.getElementById("panel-card");
const loginForm = document.getElementById("login-form");
const loginBtn = document.getElementById("login-btn");
const errorText = document.getElementById("error-text");
const successText = document.getElementById("success-text");
const welcomeText = document.getElementById("welcome-text");
const logoutBtn = document.getElementById("logout-btn");

function showError(msg) {
  if (errorText) errorText.textContent = msg;
  if (successText) successText.textContent = "";
}

function showSuccess(msg) {
  if (successText) successText.textContent = msg;
  if (errorText) errorText.textContent = "";
}

function showPanel(username) {
  if (welcomeText) {
    welcomeText.textContent = "Selamat datang, " + username;
  }
  if (loginCard) loginCard.style.display = "none";
  if (panelCard) panelCard.style.display = "block";
}

function showLogin() {
  if (loginCard) loginCard.style.display = "block";
  if (panelCard) panelCard.style.display = "none";
}

// === CEK SESSION SAAT PAGE DIBUKA ===
window.addEventListener("DOMContentLoaded", () => {
  const adminName = localStorage.getItem("admin_username");
  if (adminName) {
    showPanel(adminName);
    showSuccess("Sudah login sebagai " + adminName);
  } else {
    showLogin();
  }
});

// === EVENT LOGIN ===
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");

    const username = usernameInput?.value.trim() || "";
    const password = passwordInput?.value || "";

    if (!username || !password) {
      showError("Username & password wajib diisi.");
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = "Memeriksa...";
    showError("");
    showSuccess("");

    try {
      // Koleksi 'admins' di Firestore
      const adminsRef = collection(db, "admins");
      const q = query(
        adminsRef,
        where("username", "==", username),
        where("password", "==", password)
      );

      const snap = await getDocs(q);

      if (snap.empty) {
        showError("Username atau password salah.");
      } else {
        // Login sukses
        localStorage.setItem("admin_username", username);
        showSuccess("Login berhasil. Membuka panel...");
        showPanel(username);
      }
    } catch (err) {
      console.error(err);
      showError("Terjadi kesalahan koneksi ke server.");
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = "Masuk";
    }
  });
}

// === EVENT LOGOUT ===
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("admin_username");
    showLogin();
    showError("");
    showSuccess("");
  });
}
