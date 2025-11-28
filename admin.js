// admin.js - Panel admin Ceriabet + Firebase Firestore
// File ini memakai Firebase JS v10 modular (via CDN) dan langsung terhubung ke project kamu.

// ------------------ FIREBASE CONFIG ------------------
// GANTI BAGIAN INI dengan config dari menu:
// Firebase Console → Project settings → Your apps → Web app → "Use a <script> tag" → config
const firebaseConfig = {
  apiKey: "REPLACE_WITH_YOUR_API_KEY",
  authDomain: "klasemencrb.firebaseapp.com",
  projectId: "klasemencrb",
  storageBucket: "klasemencrb.firebasestorage.app",
  messagingSenderId: "736086806127",
  appId: "1:736086806127:web:3db31d6cbf75640b82bf59",
  measurementId: "G-44RRGY8T9"
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

// Helpers
const fmtRupiah = (n) => {
  if (typeof n !== 'number' || isNaN(n)) return '-';
  return 'Rp ' + n.toLocaleString('id-ID');
};

const parseNumber = (val) => {
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9-]/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
};

// State
let klasemenRows = []; // {id,userId,winloss,turnover,keterangan,status,brand}
let admins = [];
let hadiahConfig = null;
let eventConfig = null;
let currentAdmin = null;

// Elements
const byId = (id) => document.getElementById(id);

// Login elements
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
  admin: document.getElementById('section-admin')
};

// Sidebar menu
const menuButtons = Array.from(document.querySelectorAll('.menu-item'));

// Klasemen elements
const klasemenTableBody = document.querySelector('#klasemen-table tbody');
const klasemenCount = byId('klasemen-count');
const formModePill = byId('form-mode-pill');
const klasemenForm = byId('klasemen-form');
const formMessage = byId('form-message');
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
const adminIdInput = byId('admin-id');
const aUsername = byId('a-username');
const aPassword = byId('a-password');
const aNote = byId('a-note');
const adminMessage = byId('admin-message');

// ---------- INIT FLOW ----------

async function ensureDefaultAdmin() {
  const q = query(collection(db, 'admins'), where('username', '==', 'admin'));
  const snap = await getDocs(q);
  if (snap.empty) {
    await addDoc(collection(db, 'admins'), {
      username: 'admin',
      password: 'johan1',
      note: 'Admin default pertama. Segera ubah password di Pengaturan Admin.',
      createdAt: Date.now()
    });
    console.log('Default admin created: admin / johan1');
  }
}

async function loadAllData() {
  await Promise.all([
    loadKlasemen(),
    loadHadiah(),
    loadEventConfig(),
    loadAdmins()
  ]);
  refreshDashboardStats();
}

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
      currentAdmin = data;
      applyAdminUI();
      return;
    }
  } catch {}
  showLogin();
}

function showLogin() {
  loginOverlay.classList.add('show');
  panelLayout.classList.add('hidden');
}

function hideLogin() {
  loginOverlay.classList.remove('show');
  panelLayout.classList.remove('hidden');
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
    el.classList.toggle('hidden', name !== sectionName);
  }
  menuButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.section === sectionName);
  });
}

// ---------- KLASEMEN CRUD ----------

async function loadKlasemen() {
  klasemenRows = [];
  const snap = await getDocs(collection(db, 'klasemen'));
  snap.forEach((d) => {
    const data = d.data();
    klasemenRows.push({
      id: d.id,
      userId: data.userId || '',
      winloss: data.winloss || 0,
      turnover: data.turnover || 0,
      keterangan: data.keterangan || '',
      status: data.status || 'AKTIF',
      brand: data.brand || 'CERIABET'
    });
  });

  // sort by turnover desc
  klasemenRows.sort((a, b) => b.turnover - a.turnover);
  renderKlasemenTable();
}

function renderKlasemenTable() {
  klasemenTableBody.innerHTML = '';
  klasemenRows.forEach((row, idx) => {
    const tr = document.createElement('tr');

    const posTd = document.createElement('td');
    posTd.textContent = idx + 1;

    const userTd = document.createElement('td');
    userTd.textContent = row.userId;

    const wTd = document.createElement('td');
    wTd.textContent = fmtRupiah(row.winloss);

    const tTd = document.createElement('td');
    tTd.textContent = fmtRupiah(row.turnover);

    const ketTd = document.createElement('td');
    ketTd.textContent = row.keterangan || '-';

    const statusTd = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = 'badge ' + (row.status === 'AKTIF' ? 'badge-aktif' : 'badge-nonaktif');
    badge.textContent = row.status;
    statusTd.appendChild(badge);

    const brandTd = document.createElement('td');
    brandTd.textContent = row.brand || 'CERIABET';

    const aksiTd = document.createElement('td');
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.className = 'btn small subtle';
    editBtn.addEventListener('click', () => populateFormForEdit(row.id));

    const delBtn = document.createElement('button');
    delBtn.textContent = 'Hapus';
    delBtn.className = 'btn small danger';
    delBtn.addEventListener('click', () => deleteRow(row.id));

    aksiTd.appendChild(editBtn);
    aksiTd.appendChild(delBtn);

    tr.append(posTd, userTd, wTd, tTd, ketTd, statusTd, brandTd, aksiTd);
    klasemenTableBody.appendChild(tr);
  });

  klasemenCount.textContent = `Total entri: ${klasemenRows.length}`;
  refreshDashboardStats();
}

async function saveRowToFirestore(row, existingId = null) {
  if (existingId) {
    await setDoc(doc(db, 'klasemen', existingId), row, { merge: true });
    return existingId;
  } else {
    const ref = await addDoc(collection(db, 'klasemen'), row);
    return ref.id;
  }
}

async function deleteRow(id) {
  if (!confirm('Yakin hapus entri ini dari klasemen?')) return;
  try {
    await deleteDoc(doc(db, 'klasemen', id));
    klasemenRows = klasemenRows.filter((r) => r.id !== id);
    renderKlasemenTable();
  } catch (err) {
    console.error('Delete error:', err);
    alert('Gagal menghapus data.');
  }
}

function populateFormForEdit(id) {
  const row = klasemenRows.find((r) => r.id === id);
  if (!row) return;
  byId('row-id').value = row.id;
  byId('f-userId').value = row.userId;
  byId('f-winloss').value = row.winloss;
  byId('f-turnover').value = row.turnover;
  byId('f-keterangan').value = row.keterangan || '';
  byId('f-status').value = row.status || 'AKTIF';
  byId('f-brand').value = row.brand || 'CERIABET';
  formModePill.textContent = 'Mode: Edit Data';
  formMessage.textContent = '';
}

function resetKlasemenForm() {
  klasemenForm.reset();
  byId('row-id').value = '';
  byId('f-brand').value = 'CERIABET';
  byId('f-status').value = 'AKTIF';
  formModePill.textContent = 'Mode: Tambah Baru';
  formMessage.textContent = '';
}

async function handleKlasemenSubmit(e) {
  e.preventDefault();
  if (!currentAdmin) {
    alert('Harus login sebagai admin.');
    return;
  }

  const id = byId('row-id').value || null;
  const userId = byId('f-userId').value.trim();
  const winloss = parseNumber(byId('f-winloss').value);
  const turnover = parseNumber(byId('f-turnover').value);
  const keterangan = byId('f-keterangan').value.trim();
  const status = byId('f-status').value;
  const brand = byId('f-brand').value || 'CERIABET';

  if (!userId) {
    alert('User ID wajib diisi.');
    return;
  }

  const row = {
    userId,
    winloss,
    turnover,
    keterangan,
    status,
    brand
  };

  try {
    const savedId = await saveRowToFirestore(row, id);
    if (id) {
      const idx = klasemenRows.findIndex((r) => r.id === id);
      if (idx >= 0) klasemenRows[idx] = { id: savedId, ...row };
      formMessage.textContent = 'Data klasemen berhasil diperbarui.';
    } else {
      klasemenRows.push({ id: savedId, ...row });
      formMessage.textContent = 'Data klasemen berhasil ditambahkan.';
    }
    resetKlasemenForm();
    // resort
    klasemenRows.sort((a, b) => b.turnover - a.turnover);
    renderKlasemenTable();
  } catch (err) {
    console.error('Save klasemen error:', err);
    alert('Gagal menyimpan data klasemen.');
  }
}

// Dummy data
async function addDummyRows() {
  const dummy = [
    { userId: 'CB00123', winloss: 350000000, turnover: 3500000000, keterangan: 'Live Casino', status: 'AKTIF', brand: 'CERIABET' },
    { userId: 'CB00456', winloss: 120000000, turnover: 2900000000, keterangan: 'Pragmatic Slot', status: 'AKTIF', brand: 'CERIABET' },
    { userId: 'CB00789', winloss: -90000000, turnover: 2400000000, keterangan: 'Mix Slot + Casino', status: 'AKTIF', brand: 'CERIABET' }
  ];

  for (const row of dummy) {
    const id = await saveRowToFirestore(row, null);
    klasemenRows.push({ id, ...row });
  }
  klasemenRows.sort((a, b) => b.turnover - a.turnover);
  renderKlasemenTable();
}

// CSV IMPORT / EXPORT

function exportCsv() {
  if (klasemenRows.length === 0) {
    alert('Belum ada data klasemen.');
    return;
  }
  const header = ['userId', 'winloss', 'turnover', 'keterangan', 'status', 'brand'];
  const lines = [header.join(',')];
  klasemenRows.forEach((r) => {
    const row = [
      r.userId,
      r.winloss,
      r.turnover,
      (r.keterangan || '').replace(/,/g, ';'),
      r.status,
      r.brand
    ];
    lines.push(row.join(','));
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'klasemen-ceriabet.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadTemplate() {
  const header = 'userId,winloss,turnover,keterangan,status,brand\n';
  const sample = 'CB01234,250000000,3000000000,Live Casino,AKTIF,CERIABET\n';
  const blob = new Blob([header + sample], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'template-klasemen-ceriabet.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function handleCsvImport(evt) {
  const file = evt.target.files[0];
  if (!file) return;

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) {
    alert('File CSV kosong.');
    return;
  }

  const newRows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 6) continue;
    const [userId, winlossStr, turnoverStr, keterangan, status, brand] = cols;
    newRows.push({
      userId: userId.trim(),
      winloss: parseNumber(winlossStr),
      turnover: parseNumber(turnoverStr),
      keterangan: (keterangan || '').trim(),
      status: (status || 'AKTIF').trim().toUpperCase() === 'TIDAK AKTIF' ? 'TIDAK AKTIF' : 'AKTIF',
      brand: (brand || 'CERIABET').trim() || 'CERIABET'
    });
  }

  if (newRows.length === 0) {
    alert('Tidak ada baris valid di CSV.');
    return;
  }

  if (!confirm(`Import ${newRows.length} baris dan timpa data klasemen lama?`)) return;

  try {
    // Hapus semua data lama
    const snap = await getDocs(collection(db, 'klasemen'));
    const batchDeletes = [];
    for (const d of snap.docs) {
      batchDeletes.push(deleteDoc(doc(db, 'klasemen', d.id)));
    }
    await Promise.all(batchDeletes);

    // Tambah baru
    klasemenRows = [];
    for (const r of newRows) {
      const id = await saveRowToFirestore(r, null);
      klasemenRows.push({ id, ...r });
    }

    klasemenRows.sort((a, b) => b.turnover - a.turnover);
    renderKlasemenTable();
    alert('Import CSV berhasil.');
  } catch (err) {
    console.error('CSV import error:', err);
    alert('Gagal import CSV.');
  } finally {
    evt.target.value = '';
  }
}

// ---------- HADIAH CONFIG ----------

async function loadHadiah() {
  const snap = await getDocs(collection(db, 'hadiah_panel'));
  if (snap.empty) {
    hadiahConfig = null;
    return;
  }
  const d = snap.docs[0];
  hadiahConfig = { id: d.id, ...d.data() };
  hadiahMain.value = hadiahConfig.main || '';
  hadiahOthers.value = hadiahConfig.others || '';
  hadiahNotes.value = hadiahConfig.notes || '';
}

async function handleHadiahSubmit(e) {
  e.preventDefault();
  const main = hadiahMain.value.trim();
  const others = hadiahOthers.value.trim();
  const notes = hadiahNotes.value.trim();

  try {
    if (hadiahConfig && hadiahConfig.id) {
      await setDoc(
        doc(db, 'hadiah_panel', hadiahConfig.id),
        { main, others, notes, updatedAt: Date.now() },
        { merge: true }
      );
    } else {
      const ref = await addDoc(collection(db, 'hadiah_panel'), {
        main,
        others,
        notes,
        createdAt: Date.now()
      });
      hadiahConfig = { id: ref.id, main, others, notes };
    }
    hadiahMessage.textContent = 'Konfigurasi hadiah tersimpan.';
  } catch (err) {
    console.error('Hadiah save error:', err);
    alert('Gagal menyimpan konfigurasi hadiah.');
  }
}

function resetHadiahForm() {
  if (!hadiahConfig) {
    hadiahForm.reset();
  } else {
    hadiahMain.value = hadiahConfig.main || '';
    hadiahOthers.value = hadiahConfig.others || '';
    hadiahNotes.value = hadiahConfig.notes || '';
  }
  hadiahMessage.textContent = '';
}

// ---------- EVENT CONFIG ----------

async function loadEventConfig() {
  const snap = await getDocs(collection(db, 'config'));
  if (snap.empty) {
    eventConfig = null;
    return;
  }
  const d = snap.docs[0];
  eventConfig = { id: d.id, ...d.data() };
  eTitle.value = eventConfig.title || '';
  ePeriod.value = eventConfig.period || '';
  eDescription.value = eventConfig.description || '';
  eNotes.value = eventConfig.notes || '';
  statEventTitle.textContent = eventConfig.title || '-';
}

async function handleEventSubmit(e) {
  e.preventDefault();
  const title = eTitle.value.trim();
  const period = ePeriod.value.trim();
  const description = eDescription.value.trim();
  const notes = eNotes.value.trim();

  try {
    if (eventConfig && eventConfig.id) {
      await setDoc(
        doc(db, 'config', eventConfig.id),
        { title, period, description, notes, updatedAt: Date.now() },
        { merge: true }
      );
    } else {
      const ref = await addDoc(collection(db, 'config'), {
        title,
        period,
        description,
        notes,
        createdAt: Date.now()
      });
      eventConfig = { id: ref.id, title, period, description, notes };
    }
    eventMessage.textContent = 'Konfigurasi event tersimpan.';
    statEventTitle.textContent = title || '-';
  } catch (err) {
    console.error('Event save error:', err);
    alert('Gagal menyimpan konfigurasi event.');
  }
}

function resetEventForm() {
  if (!eventConfig) {
    eventForm.reset();
  } else {
    eTitle.value = eventConfig.title || '';
    ePeriod.value = eventConfig.period || '';
    eDescription.value = eventConfig.description || '';
    eNotes.value = eventConfig.notes || '';
  }
  eventMessage.textContent = '';
}

// ---------- ADMIN SETTINGS ----------

async function loadAdmins() {
  admins = [];
  const snap = await getDocs(collection(db, 'admins'));
  snap.forEach((d) => {
    const data = d.data();
    admins.push({
      id: d.id,
      username: data.username,
      password: data.password,
      note: data.note || ''
    });
  });
  renderAdminTable();
}

function renderAdminTable() {
  adminTableBody.innerHTML = '';
  admins.forEach((a) => {
    const tr = document.createElement('tr');
    const uTd = document.createElement('td');
    uTd.textContent = a.username;
    const noteTd = document.createElement('td');
    noteTd.textContent = a.note || '-';
    const aksiTd = document.createElement('td');
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.className = 'btn small subtle';
    editBtn.addEventListener('click', () => populateAdminForm(a.id));
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Hapus';
    delBtn.className = 'btn small danger';
    delBtn.addEventListener('click', () => deleteAdmin(a.id));
    aksiTd.append(editBtn, delBtn);
    tr.append(uTd, noteTd, aksiTd);
    adminTableBody.appendChild(tr);
  });
}

function populateAdminForm(id) {
  const a = admins.find((x) => x.id === id);
  if (!a) return;
  adminIdInput.value = a.id;
  aUsername.value = a.username;
  aPassword.value = a.password;
  aNote.value = a.note || '';
  adminMessage.textContent = '';
}

function resetAdminForm() {
  adminForm.reset();
  adminIdInput.value = '';
  adminMessage.textContent = '';
}

async function deleteAdmin(id) {
  const target = admins.find((a) => a.id === id);
  if (!target) return;
  if (target.username === 'admin') {
    alert('Admin default tidak boleh dihapus. Silakan ganti password saja.');
    return;
  }
  if (!confirm(`Hapus admin ${target.username}?`)) return;
  try {
    await deleteDoc(doc(db, 'admins', id));
    admins = admins.filter((a) => a.id !== id);
    renderAdminTable();
  } catch (err) {
    console.error('Delete admin error:', err);
    alert('Gagal menghapus admin.');
  }
}

async function handleAdminSubmit(e) {
  e.preventDefault();
  const id = adminIdInput.value || null;
  const username = aUsername.value.trim();
  const password = aPassword.value;
  const note = aNote.value.trim();

  if (!username || !password) {
    alert('Username dan password wajib diisi.');
    return;
  }

  try {
    if (id) {
      await setDoc(
        doc(db, 'admins', id),
        { username, password, note, updatedAt: Date.now() },
        { merge: true }
      );
      const idx = admins.findIndex((a) => a.id === id);
      if (idx >= 0) admins[idx] = { id, username, password, note };
      adminMessage.textContent = 'Data admin diperbarui.';
    } else {
      // Cek duplikat username
      const exists = admins.some((a) => a.username === username);
      if (exists) {
        alert('Username sudah digunakan.');
        return;
      }
      const ref = await addDoc(collection(db, 'admins'), {
        username,
        password,
        note,
        createdAt: Date.now()
      });
      admins.push({ id: ref.id, username, password, note });
      adminMessage.textContent = 'Admin baru ditambahkan.';
    }
    renderAdminTable();
    resetAdminForm();
  } catch (err) {
    console.error('Save admin error:', err);
    alert('Gagal menyimpan admin.');
  }
}

// ---------- DASHBOARD STATS ----------

function refreshDashboardStats() {
  const aktif = klasemenRows.filter((r) => r.status === 'AKTIF');
  statTotalAktif.textContent = aktif.length.toString();
  const totalTurnover = klasemenRows.reduce((sum, r) => sum + (r.turnover || 0), 0);
  statTotalTurnover.textContent = fmtRupiah(totalTurnover);
  if (eventConfig && eventConfig.title) {
    statEventTitle.textContent = eventConfig.title;
  } else {
    statEventTitle.textContent = '-';
  }
}

// ---------- EVENT LISTENERS ----------

function setupEventListeners() {
  loginButton.addEventListener('click', handleLogin);
  loginPassword.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
  logoutButton.addEventListener('click', handleLogout);

  menuButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.section;
      switchSection(target);
    });
  });

  // Klasemen
  klasemenForm.addEventListener('submit', handleKlasemenSubmit);
  byId('btn-reset-form').addEventListener('click', resetKlasemenForm);
  byId('btn-add-dummy').addEventListener('click', addDummyRows);
  byId('btn-export-csv').addEventListener('click', exportCsv);
  byId('btn-download-template').addEventListener('click', downloadTemplate);
  csvInput.addEventListener('change', handleCsvImport);

  // Hadiah
  hadiahForm.addEventListener('submit', handleHadiahSubmit);
  byId('btn-hadiah-reset').addEventListener('click', resetHadiahForm);

  // Event
  eventForm.addEventListener('submit', handleEventSubmit);
  byId('btn-event-reset').addEventListener('click', resetEventForm);

  // Admin
  adminForm.addEventListener('submit', handleAdminSubmit);
  byId('btn-admin-reset').addEventListener('click', resetAdminForm);
}
