// admin.js - Panel admin Ceriabet + Firebase Firestore
// File ini memakai Firebase JS v10 modular (via CDN) dan langsung terhubung ke project kamu.

// ------------------ FIREBASE CONFIG ------------------
// Sudah diisi dengan config project "klasemencrb" kamu
const firebaseConfig = {
  apiKey: "AIzaSyDMqHZJRirWCunxOQFXc3aL5M8NIwld6WM",
  authDomain: "klasemencrb.firebaseapp.com",
  projectId: "klasemencrb",
  storageBucket: "klasemencrb.firebasestorage.app",
  messagingSenderId: "703606806172",
  appId: "1:703606806172:web:3db31d6cbf75604b02bf59",
  measurementId: "G-44RRGYR8T9"
};
// ------------------------------------------------------

// Import Firebase modules dari CDN (harus pakai type="module" di index.html)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
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
  orderBy
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ---------- UTIL & STATE ----------

const byId = (id) => document.getElementById(id);

let klasemenData = [];
let hadiahConfig = null;
let eventConfig = null;
let currentAdmin = null;

// Elements
// Login
const loginOverlay = byId('login-overlay');
const loginUsername = byId('login-username');
const loginPassword = byId('login-password');
const loginButton = byId('login-button');
const loginError = byId('login-error');

// Layout
const panelLayout = document.getElementById('panel-layout');
const welcomeText = byId('welcome-text');
const activeAdminPill = byId('active-admin-pill');
const logoutButton = byId('logout-button');

// Stats
const statTotalAktif = byId('stat-total-aktif');
const statTotalTurnover = byId('stat-total-turnover');
const statEventTitle = byId('stat-event-title');

// Sections
const sections = {
  dashboard: document.getElementById('section-dashboard'),
  klasemen: document.getElementById('section-klasemen'),
  hadiah: document.getElementById('section-hadiah'),
  event: document.getElementById('section-event'),
  admin: document.getElementById('section-admin'),
};

const menuButtons = Array.from(document.querySelectorAll('.menu-item'));

// Klasemen
const klasemenForm = byId('klasemen-form');
const klasemenMessage = byId('klasemen-message');
const klasemenTableBody = document.querySelector('#klasemen-table tbody');
const csvInput = byId('csv-input');

// Hadiah
const hadiahForm = byId('hadiah-form');
const hadiahMain = byId('h-main');
const hadiahOthers = byId('h-others');
const hadiahNotes = byId('h-notes');
const hadiahMessage = byId('hadiah-message');

// Event
const eventForm = byId('event-form');
const eTitle = byId('e-title');
const ePeriod = byId('e-period');
const eDescription = byId('e-description');
const eNotes = byId('e-notes');
const eventMessage = byId('event-message');

// Admin setting
const adminTableBody = document.querySelector('#admin-table tbody');
const adminForm = byId('admin-form');
const aId = byId('a-id');
const aUsername = byId('a-username');
const aPassword = byId('a-password');
const aNote = byId('a-note');
const adminMessage = byId('admin-message');

// ---------- HELPER UI ----------

function hideLogin() {
  if (loginOverlay) loginOverlay.classList.add('hidden');
  if (panelLayout) panelLayout.classList.remove('hidden');
}

function showLogin() {
  if (panelLayout) panelLayout.classList.add('hidden');
  if (loginOverlay) loginOverlay.classList.remove('hidden');
}

// ---------- FIRESTORE HELPERS ----------

async function fetchCollection(collName, orderField) {
  const ref = collection(db, collName);
  const q = orderField
    ? query(ref, orderBy(orderField, 'desc'))
    : ref;
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ---------- DATA LOADERS ----------

async function loadKlasemen() {
  const list = await fetchCollection('klasemen', 'turnover');
  klasemenData = list;
  renderKlasemenTable();
}

function renderKlasemenTable() {
  if (!klasemenTableBody) return;
  klasemenTableBody.innerHTML = '';
  klasemenData.forEach((row, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${row.userId || '-'}</td>
      <td>${row.nickname || '-'}</td>
      <td>${row.turnover?.toLocaleString('id-ID') || '0'}</td>
      <td>${row.hadiah || '-'}</td>
      <td>${row.notes || '-'}</td>
    `;
    klasemenTableBody.appendChild(tr);
  });
}

async function loadHadiah() {
  const list = await fetchCollection('hadiah', 'updatedAt');
  hadiahConfig = list[0] || null;
  if (!hadiahConfig) return;
  if (hadiahMain) hadiahMain.value = hadiahConfig.main || '';
  if (hadiahOthers) hadiahOthers.value = hadiahConfig.others || '';
  if (hadiahNotes) hadiahNotes.value = hadiahConfig.notes || '';
}

async function loadEventConfig() {
  const list = await fetchCollection('eventConfig', 'updatedAt');
  eventConfig = list[0] || null;
  if (!eventConfig) return;
  if (eTitle) eTitle.value = eventConfig.title || '';
  if (ePeriod) ePeriod.value = eventConfig.period || '';
  if (eDescription) eDescription.value = eventConfig.description || '';
  if (eNotes) eNotes.value = eventConfig.notes || '';
}

async function loadAdmins() {
  const list = await fetchCollection('admins', 'createdAt');
  renderAdminTable(list);
}

function renderAdminTable(list) {
  if (!adminTableBody) return;
  adminTableBody.innerHTML = '';
  list.forEach((adm, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${adm.username || '-'}</td>
      <td>${adm.note || '-'}</td>
      <td>
        <button class="btn small subtle" data-edit-admin="${adm.id}">Edit</button>
        <button class="btn small danger" data-del-admin="${adm.id}">Hapus</button>
      </td>
    `;
    adminTableBody.appendChild(tr);
  });

  adminTableBody.querySelectorAll('[data-edit-admin]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-edit-admin');
      const adm = list.find((a) => a.id === id);
      if (!adm) return;
      aId.value = adm.id;
      aUsername.value = adm.username || '';
      aPassword.value = '';
      aNote.value = adm.note || '';
    });
  });

  adminTableBody.querySelectorAll('[data-del-admin]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-del-admin');
      if (!confirm('Hapus admin ini?')) return;
      await deleteDoc(doc(db, 'admins', id));
      adminMessage.textContent = 'Admin dihapus.';
      await loadAdmins();
    });
  });
}

// ---------- ADMIN DEFAULT (DIMATIKAN) ----------

async function ensureDefaultAdmin() {
  // Tidak lagi membuat admin default dari kode.
  // Silakan kelola data admin langsung dari Firestore
  // atau lewat menu Pengaturan Admin pada panel.
  return;
}

// ---------- DASHBOARD ----------

function refreshDashboard() {
  if (statTotalAktif) {
    statTotalAktif.textContent = klasemenData.length.toString();
  }
  if (statTotalTurnover) {
    const total = klasemenData.reduce((sum, row) => sum + (row.turnover || 0), 0);
    statTotalTurnover.textContent = total.toLocaleString('id-ID');
  }
  if (statEventTitle) {
    statEventTitle.textContent = eventConfig?.title || 'Belum diatur';
  }
}

// ---------- INIT ----------

async function init() {
  try {
    await ensureDefaultAdmin();
    await loadAllData();
    setupEventListeners();
    restoreLoginSession();
  } catch (err) {
    console.error('Init error:', err);
    alert('Gagal init panel. Cek console log untuk detail.');
  }
}

async function loadAllData() {
  await Promise.all([
    loadKlasemen(),
    loadHadiah(),
    loadEventConfig(),
    loadAdmins()
  ]);
  refreshDashboard();
}

document.addEventListener('DOMContentLoaded', init);

// ---------- LOGIN LOGIC ----------

function restoreLoginSession() {
  try {
    const raw = localStorage.getItem('ceriabet_admin');
    if (!raw) {
      showLogin();
      return;
    }
    const data = JSON.parse(raw);
    if (data && data.username) {
      currentAdmin = { id: data.id, username: data.username, note: data.note || '' };
      applyAdminUI();
    } else {
      showLogin();
    }
  } catch (err) {
    console.error('Restore login error:', err);
    showLogin();
  }
}

async function handleLogin() {
  const username = loginUsername.value.trim();
  const password = loginPassword.value;

  loginError.textContent = '';

  if (!username || !password) {
    loginError.textContent = 'Isi username dan password.';
    return;
  }

  try {
    const q = query(collection(db, 'admins'), where('username', '==', username));
    const snap = await getDocs(q);
    if (snap.empty) {
      loginError.textContent = 'Username tidak ditemukan.';
      return;
    }
    const docRef = snap.docs[0];
    const data = docRef.data();
    if (data.password !== password) {
      loginError.textContent = 'Password salah.';
      return;
    }

    currentAdmin = { id: docRef.id, username: data.username, note: data.note || '' };
    localStorage.setItem('ceriabet_admin', JSON.stringify(currentAdmin));
    applyAdminUI();
  } catch (err) {
    console.error('Login error:', err);
    loginError.textContent = 'Gagal login. Coba lagi.';
  }
}

function applyAdminUI() {
  hideLogin();
  welcomeText.textContent = `Selamat datang, ${currentAdmin.username}.`;
  activeAdminPill.textContent = `Admin: ${currentAdmin.username}`;
  switchSection('dashboard');
}

function handleLogout() {
  localStorage.removeItem('ceriabet_admin');
  currentAdmin = null;
  showLogin();
}

// ---------- NAV SECTIONS ----------

function switchSection(sectionName) {
  for (const [name, el] of Object.entries(sections)) {
    if (!el) continue;
    const btn = menuButtons.find((b) => b.dataset.section === name);
    if (name === sectionName) {
      el.classList.remove('hidden');
      if (btn) btn.classList.add('active');
    } else {
      el.classList.add('hidden');
      if (btn) btn.classList.remove('active');
    }
  }
}

// ---------- KALSEMEN HANDLERS, HADIAH, EVENT, ADMIN, EXPORT, IMPORT ----------
// (bagian ini sama seperti di file kamu sebelumnya, tidak diubah)
