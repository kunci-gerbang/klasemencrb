// admin.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ==== CONFIG FIREBASE PUNYA KAMU ====
const firebaseConfig = {
  apiKey: "AIzaSyDMqHZJRirWCunxOQFXc3aL5M8NIwld6WM",
  authDomain: "klasemencrb.firebaseapp.com",
  projectId: "klasemencrb",
  storageBucket: "klasemencrb.firebasestorage.app",
  messagingSenderId: "703606806172",
  appId: "1:703606806172:web:3db31d6cbf75604b02bf59",
  measurementId: "G-44RRGYR8T9"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// === DOM ELEMENTS ===
const loginForm   = document.getElementById("login-form");
const errorText   = document.getElementById("error-text");
const successText = document.getElementById("success-text");
const loginBtn    = document.getElementById("login-btn");

function showError(msg) {
  if (errorText) errorText.textContent = msg;
  if (successText) successText.textContent = "";
}

function showSuccess(msg) {
  if (successText) successText.textContent = msg;
  if (errorText) errorText.textContent = "";
}

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
        showSuccess("Login berhasil. Mengarahkan...");
        localStorage.setItem("admin_username", username);

        // TODO: kalau punya halaman admin lain, tinggal arahkan ke sana
        // window.location.href = "admin.html";
        setTimeout(() => {
          alert("Login sukses sebagai " + username);
        }, 500);
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

// === AUTO STATUS LOGIN (OPSIONAL) ===
window.addEventListener("DOMContentLoaded", () => {
  const adminName = localStorage.getItem("admin_username");
  if (adminName) {
    showSuccess("Sudah login sebagai " + adminName);
  }
});
