// admin.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  setDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ====== DOM ======
const $ = (id) => document.getElementById(id);

const loginOverlay = $("login-overlay");
const panelLayout = $("panel-layout");
const loginForm = $("login-form");
const loginUsername = $("login-username");
const loginPassword = $("login-password");
const loginError = $("login-error");
const logoutButton = $("logout-button");
const welcomeText = $("welcome-text");
const activeAdminPill = $("active-admin-pill");

const menuButtons = Array.from(document.querySelectorAll(".menu-item"));
const sections = {
  dashboard: $("section-dashboard"),
  klasemen: $("section-klasemen"),
  hadiah: $("section-hadiah"),
  event: $("section-event"),
  admin: $("section-admin"),
};

// stats
const statTotalAktif = $("stat-total-aktif");
const statTotalTurnover = $("stat-total-turnover");
const statEventTitle = $("stat-event-title");

// tabel klasemen
const klasemenTableBody = document.querySelector("#klasemen-table tbody");

// hadiah
const hadiahForm = $("hadiah-form");
const hMain = $("h-main");
const hOthers = $("h-others");
const hNotes = $("h-notes");
const hadiahMessage = $("hadiah-message");

// event
const eventForm = $("event-form");
const eTitle = $("e-title");
const ePeriod = $("e-period");
const eDescription = $("e-description");
const eNotes = $("e-notes");
const eventMessage = $("event-message");

// admin
const adminForm = $("admin-form");
const aId = $("a-id");
const aUsername = $("a-username");
const aPassword = $("a-password");
const aNote = $("a-note");
const adminMessage = $("admin-message");
const adminTableBody = document.querySelector("#admin-table tbody");

// ====== STATE ======
let currentAdmin = null;
let klasemenData = [];
let eventConfig = null;
let hadiahConfig = null;

// ====== UI helpers ======
function showLogin() {
  loginOverlay.classList.remove("hidden");
  panelLayout.classList.add("hidden");
}

function showPanel() {
  loginOverlay.classList.add("hidden");
  panelLayout.classList.remove("hidden");
}

function switchSection(name) {
  Object.entries(sections).forEach(([key, el]) => {
    const btn = menuButtons.find((b) => b.dataset.section === key);
    if (!el) return;
    if (key === name) {
      el.classList.remove("hidden");
      btn && btn.classList.add("active");
    } else {
      el.classList.add("hidden");
      btn && btn.classList.remove("active");
    }
  });
}

// ====== LOGIN LOGIC ======
async function doLogin(e) {
  e.preventDefault();
  loginError.textContent = "";

  const username = loginUsername.value.trim();
  const password = loginPassword.value;

  if (!username || !password) {
    loginError.textContent = "Admin ID & password wajib diisi.";
    return;
  }

  try {
    const ref = collection(db, "admins");
    const q = query(ref, where("username", "==", username));
    const snap = await getDocs(q);

    if (snap.empty) {
      loginError.textContent = "Admin ID tidak ditemukan.";
      return;
    }

    const docSnap = snap.docs[0];
    const data = docSnap.data();

    if (data.password !== password) {
      loginError.textContent = "Password salah.";
      return;
    }

    currentAdmin = {
      id: docSnap.id,
      username: data.username,
      note: data.note || "",
    };
    localStorage.setItem("ceriabet_admin", JSON.stringify(currentAdmin));

    applyAdminUI();
  } catch (err) {
    console.error(err);
    loginError.textContent = "Gagal login. Coba lagi.";
  }
}

function restoreSession() {
  try {
    const raw = localStorage.getItem("ceriabet_admin");
    if (!raw) {
      showLogin();
      return;
    }
    const data = JSON.parse(raw);
    if (!data || !data.username) {
      showLogin();
      return;
    }
    currentAdmin = data;
    applyAdminUI();
  } catch (e) {
    console.error(e);
    showLogin();
  }
}

function applyAdminUI() {
  welcomeText.textContent = `Selamat datang, ${currentAdmin.username}.`;
  activeAdminPill.textContent = `Admin: ${currentAdmin.username}`;
  showPanel();
  switchSection("dashboard");
}

function doLogout() {
  localStorage.removeItem("ceriabet_admin");
  currentAdmin = null;
  showLogin();
}

// ====== DATA LOADERS ======
async function loadKlasemen() {
  try {
    const ref = collection(db, "klasemen");
    const q = query(ref, orderBy("turnover", "desc"));
    const snap = await getDocs(q);
    klasemenData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderKlasemen();
    refreshDashboard();
  } catch (e) {
    console.error("loadKlasemen error", e);
  }
}

function renderKlasemen() {
  if (!klasemenTableBody) return;
  klasemenTableBody.innerHTML = "";
  klasemenData.forEach((row, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${row.userId || "-"}</td>
      <td>${row.nickname || "-"}</td>
      <td>${(row.turnover || 0).toLocaleString("id-ID")}</td>
      <td>${row.hadiah || "-"}</td>
      <td>${row.notes || "-"}</td>
    `;
    klasemenTableBody.appendChild(tr);
  });
}

async function loadHadiah() {
  try {
    const ref = collection(db, "hadiah");
    const snap = await getDocs(ref);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    hadiahConfig = list[0] || null;
    if (hadiahConfig) {
      hMain.value = hadiahConfig.main || "";
      hOthers.value = hadiahConfig.others || "";
      hNotes.value = hadiahConfig.notes || "";
    }
  } catch (e) {
    console.error("loadHadiah error", e);
  }
}

async function loadEventConfig() {
  try {
    const ref = collection(db, "eventConfig");
    const snap = await getDocs(ref);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    eventConfig = list[0] || null;
    if (eventConfig) {
      eTitle.value = eventConfig.title || "";
      ePeriod.value = eventConfig.period || "";
      eDescription.value = eventConfig.description || "";
      eNotes.value = eventConfig.notes || "";
    }
    refreshDashboard();
  } catch (e) {
    console.error("loadEvent error", e);
  }
}

async function loadAdmins() {
  try {
    const ref = collection(db, "admins");
    const snap = await getDocs(ref);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderAdminTable(list);
  } catch (e) {
    console.error("loadAdmins error", e);
  }
}

function refreshDashboard() {
  if (statTotalAktif) {
    statTotalAktif.textContent = String(klasemenData.length || 0);
  }
  if (statTotalTurnover) {
    const total = klasemenData.reduce(
      (sum, row) => sum + (row.turnover || 0),
      0
    );
    statTotalTurnover.textContent = total.toLocaleString("id-ID");
  }
  if (statEventTitle) {
    statEventTitle.textContent = eventConfig?.title || "Belum diatur";
  }
}

// ====== SAVE FORMS ======
async function saveHadiah(e) {
  e.preventDefault();
  try {
    let targetId = hadiahConfig?.id;
    const payload = {
      main: hMain.value,
      others: hOthers.value,
      notes: hNotes.value,
      updatedAt: Date.now(),
    };
    if (targetId) {
      await setDoc(doc(db, "hadiah", targetId), payload, { merge: true });
    } else {
      const res = await addDoc(collection(db, "hadiah"), payload);
      targetId = res.id;
    }
    hadiahConfig = { id: targetId, ...payload };
    hadiahMessage.textContent = "Hadiah tersimpan.";
    setTimeout(() => (hadiahMessage.textContent = ""), 2000);
  } catch (e) {
    console.error(e);
    hadiahMessage.textContent = "Gagal menyimpan hadiah.";
  }
}

async function saveEvent(e) {
  e.preventDefault();
  try:
    let targetId = eventConfig?.id;
    const payload = {
      title: eTitle.value,
      period: ePeriod.value,
      description: eDescription.value,
      notes: eNotes.value,
      updatedAt: Date.now(),
    };
    if (targetId) {
      await setDoc(doc(db, "eventConfig", targetId), payload, { merge: true });
    } else {
      const res = await addDoc(collection(db, "eventConfig"), payload);
      targetId = res.id;
    }
    eventConfig = { id: targetId, ...payload };
    eventMessage.textContent = "Event tersimpan.";
    refreshDashboard();
    setTimeout(() => (eventMessage.textContent = ""), 2000);
  } catch (e) {
    console.error(e);
    eventMessage.textContent = "Gagal menyimpan event.";
  }
}

function renderAdminTable(list) {
  if (!adminTableBody) return;
  adminTableBody.innerHTML = "";
  list.forEach((adm, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${adm.username || "-"}</td>
      <td>${adm.note || "-"}</td>
      <td>
        <button class="btn small subtle" data-edit="${adm.id}">Edit</button>
        <button class="btn small danger" data-del="${adm.id}">Hapus</button>
      </td>
    `;
    adminTableBody.appendChild(tr);
  });

  adminTableBody.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-edit");
      const adm = list.find((x) => x.id === id);
      if (!adm) return;
      aId.value = adm.id;
      aUsername.value = adm.username || "";
      aPassword.value = "";
      aNote.value = adm.note || "";
    });
  });

  adminTableBody.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-del");
      if (!confirm("Hapus admin ini?")) return;
      await deleteDoc(doc(db, "admins", id));
      adminMessage.textContent = "Admin dihapus.";
      await loadAdmins();
      setTimeout(() => (adminMessage.textContent = ""), 2000);
    });
  });
}

async function saveAdmin(e) {
  e.preventDefault();
  try {
    const id = aId.value || null;
    const username = aUsername.value.trim();
    const password = aPassword.value;
    const note = aNote.value;

    if (!username) {
      adminMessage.textContent = "Username wajib diisi.";
      return;
    }

    let payload = { username, note, updatedAt: Date.now() };
    if (password) {
      payload.password = password;
    }

    if (id) {
      await setDoc(doc(db, "admins", id), payload, { merge: true });
      adminMessage.textContent = "Admin diperbarui.";
    } else {
      payload.createdAt = Date.now();
      await addDoc(collection(db, "admins"), payload);
      adminMessage.textContent = "Admin ditambahkan.";
    }

    aId.value = "";
    aUsername.value = "";
    aPassword.value = "";
    aNote.value = "";

    await loadAdmins();
    setTimeout(() => (adminMessage.textContent = ""), 2000);
  } catch (e) {
    console.error(e);
    adminMessage.textContent = "Gagal menyimpan admin.";
  }
}

// ====== INIT ======
function setupListeners() {
  loginForm.addEventListener("submit", doLogin);
  logoutButton.addEventListener("click", doLogout);

  menuButtons.forEach((btn) => {
    btn.addEventListener("click", () =>
      switchSection(btn.dataset.section || "dashboard")
    );
  });

  hadiahForm.addEventListener("submit", saveHadiah);
  eventForm.addEventListener("submit", saveEvent);
  adminForm.addEventListener("submit", saveAdmin);
}

async function initialLoad() {
  await Promise.all([loadKlasemen(), loadHadiah(), loadEventConfig(), loadAdmins()]);
}

document.addEventListener("DOMContentLoaded", async () => {
  setupListeners();
  restoreSession();
  await initialLoad(); // kalau error, cuma di-console, tidak pop up alert
});
