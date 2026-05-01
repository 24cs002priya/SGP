/**
 * utils.js — Shared utility functions
 */

/** ── Toast Notifications ── */
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const icons = {
    success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    info:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `${icons[type] || icons.info} <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/** ── Modal helpers ── */
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

/** ── Page / nav routing ── */
function goTo(page) {
  // Hide all page-content divs
  document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) pageEl.classList.add('active');

  const navEl = document.getElementById(`nav-${page}`);
  if (navEl) navEl.classList.add('active');

  // 🔥 ADD THIS
  if (page === 'profile') {
    loadProfile();
  }
}

/** ── Auth helpers ── */
function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem('user')); }
  catch { return null; }
}

function logout() {
  localStorage.clear();
  window.location.href = 'login.html';
}

/** ── Guard: must be logged in ── */
function requireAuth(role) {
  const token = localStorage.getItem('token');
  const user  = getCurrentUser();
  if (!token || !user) {
    window.location.href = 'login.html';
    return false;
  }
  if (role && user.role !== role) {
    window.location.href = user.role === 'coordinator' ? 'coordinator.html' : 'student.html';
    return false;
  }
  return true;
}

/** ── Date formatting ── */
function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** ── Greeting by time ── */
function getGreeting(name) {
  const h = new Date().getHours();
  const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${g}, ${name.split(' ')[0]}!`;
}

/** ── Status badge HTML ── */
function badgeHtml(status) {
  const map = {
    applied:     'badge-applied',
    shortlisted: 'badge-shortlisted',
    interview:   'badge-interview',
    selected:    'badge-selected',
    rejected:    'badge-rejected',
    withdrawn:   'badge-withdrawn',
  };
  return `<span class="badge ${map[status] || 'badge-applied'}">${status}</span>`;
}

/** ── Avatar initials ── */
function avatarInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name[0].toUpperCase();
}

/** ── Debounce ── */
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

window.showToast  = showToast;
window.openModal  = openModal;
window.closeModal = closeModal;
window.goTo       = goTo;
window.logout     = logout;
window.requireAuth = requireAuth;
window.getCurrentUser = getCurrentUser;
window.fmtDate    = fmtDate;
window.getGreeting = getGreeting;
window.badgeHtml  = badgeHtml;
window.avatarInitials = avatarInitials;
window.debounce   = debounce;
