/**
 * student.js — All logic for the Student dashboard
 */

// ── State ──────────────────────────────────────────────
let allInternships  = [];
let myApplications  = [];
let pendingApplyId  = null;   // internship id waiting for apply
let pendingUploadId = null;   // application id waiting for upload

// ── Boot ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth('student')) return;

  const user = getCurrentUser();

  // Set greeting & avatar
  document.getElementById('greetingText').textContent = getGreeting(user.name);
  document.getElementById('userAvatar').textContent   = avatarInitials(user.name);

  // Load all data in parallel
  await Promise.all([loadMyApplications(), loadInternships(), loadCompanies()]);
  renderDashboard();
  loadProfile();
});

// ── Data loaders ───────────────────────────────────────
async function loadMyApplications() {
  const res = await API.get('/applications/my');
  if (res.success) myApplications = res.data;
}

async function loadInternships() {
  const res = await API.get('/internships');
  if (res.success) allInternships = res.data;
}

async function loadCompanies() {
  const res = await API.get('/companies');
  if (!res.success) return;
  const grid = document.getElementById('companiesGrid');
  if (!grid) return;
  grid.innerHTML = res.data.map(c => `
    <div class="glass-sm company-card" onclick="filterByCompany('${c._id}')">
      <div class="company-logo">${c.name[0]}</div>
      <div class="company-name">${c.name}</div>
      <div class="company-meta">${c.industry || ''} ${c.location ? '· ' + c.location : ''}</div>
    </div>
  `).join('') || emptyState('No companies listed yet.');
}

// ── Dashboard render ───────────────────────────────────
function renderDashboard() {
  const total      = myApplications.length;
  const offers     = myApplications.filter(a => a.hasOfferLetter).length;
  const shortlisted= myApplications.filter(a => a.status === 'shortlisted').length;
  const pending    = myApplications.filter(a => a.status === 'applied').length;

  document.getElementById('statApplications').innerHTML =
    `${total} <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`;
  document.getElementById('cardTotal').textContent = total;
  document.getElementById('cardOffers').textContent       = offers;
  document.getElementById('cardShortlisted').textContent  = shortlisted;
  document.getElementById('cardPending').textContent      = pending;

  // Recent applications (last 3)
  const recEl = document.getElementById('recentApps');
  const recent = [...myApplications].slice(0, 4);
  recEl.innerHTML = recent.length ? recent.map(a => `
    <div class="internship-item" style="margin-bottom:8px;">
      <div class="int-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
      </div>
      <div class="int-info">
        <div class="int-title">${a.internship?.title || 'Position'}</div>
        <div class="int-company">${a.company?.name || ''} · ${fmtDate(a.appliedAt)}</div>
      </div>
      ${badgeHtml(a.status)}
    </div>
  `).join('') : emptyState('No applications yet. Start exploring!');

  // Featured internships (first 3)
  const featEl = document.getElementById('featuredInternships');
  featEl.innerHTML = allInternships.slice(0, 3).map(int => internshipItemHtml(int)).join('') || emptyState('No internships listed yet.');

  // Also render full lists
  renderInternshipsList();
  renderApplicationsTable();
}

// ── Internships page ───────────────────────────────────
function renderInternshipsList(filter = 'all') {
  const list = document.getElementById('internshipsList');
  if (!list) return;
  const filtered = filter === 'all' ? allInternships : allInternships.filter(i => i.type === filter);
  list.innerHTML = filtered.length
    ? filtered.map(i => internshipItemHtml(i, true)).join('')
    : emptyState('No internships found.');
}

function filterInternships(type, btn) {
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderInternshipsList(type);
}

function filterByCompany(companyId) {
  goTo('internships');
  const filtered = allInternships.filter(i => i.company?._id === companyId);
  const list = document.getElementById('internshipsList');
  list.innerHTML = filtered.length
    ? filtered.map(i => internshipItemHtml(i, true)).join('')
    : emptyState('No internships for this company.');
}

function internshipItemHtml(int, showApplyBtn = true) {
  const alreadyApplied = myApplications.some(a => a.internship?._id === int._id);
  const deadline = int.deadline ? `Deadline: ${fmtDate(int.deadline)}` : '';
  const typeChip = `<span class="chip">${int.type}</span>`;
  const stipChip = int.stipend ? `<span class="chip">${int.stipend}</span>` : '';
  const durChip  = int.duration ? `<span class="chip">${int.duration}</span>` : '';

  const applyBtn = showApplyBtn
    ? alreadyApplied
      ? `<span class="badge badge-applied" style="font-size:11px;">Applied</span>`
      : `<button class="btn-primary" style="padding:7px 14px;font-size:12px;" onclick="openApplyModal('${int._id}', '${escHtml(int.title)}', '${escHtml(int.company?.name || '')}')">Apply</button>`
    : '';

  return `
    <div class="internship-item">
      <div class="int-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
      </div>
      <div class="int-info">
        <div class="int-title">${escHtml(int.title)}</div>
        <div class="int-company">${escHtml(int.company?.name || '')} ${int.company?.location ? '· ' + int.company.location : ''}</div>
        <div class="int-meta">${typeChip}${stipChip}${durChip}</div>
        ${deadline ? `<div style="font-size:11px;color:var(--text-muted);margin-top:4px;">${deadline}</div>` : ''}
      </div>
      ${applyBtn}
    </div>
  `;
}

// ── Apply flow ─────────────────────────────────────────
function openApplyModal(internshipId, title, company) {
  pendingApplyId = internshipId;
  document.getElementById('applyModalTitle').textContent = `${title} at ${company}`;
  document.getElementById('coverLetter').value = '';
  openModal('applyModal');
}

async function submitApplication() {
  if (!pendingApplyId) return;
  const coverLetter = document.getElementById('coverLetter').value.trim();

  const res = await API.post('/applications', { internshipId: pendingApplyId, coverLetter });
  closeModal('applyModal');
  if (res.success) {
    showToast('Application submitted successfully!', 'success');
    await loadMyApplications();
    renderDashboard();
  } else {
    showToast(res.message || 'Failed to submit application.', 'error');
  }
}

// ── Applications table ─────────────────────────────────
function renderApplicationsTable() {
  const tbody = document.getElementById('appsTbody');
  if (!tbody) return;

  if (!myApplications.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted);">No applications yet. Browse internships to get started!</td></tr>`;
    return;
  }

  tbody.innerHTML = myApplications.map(a => `
    <tr>
      <td>
        <div style="font-weight:600;">${escHtml(a.company?.name || '—')}</div>
        <div style="font-size:11px;color:var(--text-muted);">${escHtml(a.company?.industry || '')}</div>
      </td>
      <td>${escHtml(a.internship?.title || '—')}</td>
      <td>${fmtDate(a.appliedAt)}</td>
      <td>${badgeHtml(a.status)}</td>
      <td>
        ${a.hasOfferLetter
          ? `<span style="color:#4a7a10;font-size:12px;font-weight:600;">✓ Uploaded</span>`
          : `<span style="color:var(--text-muted);font-size:12px;">Not uploaded</span>`
        }
      </td>
      <td>
        ${!a.hasOfferLetter
          ? `<button class="btn-secondary" style="font-size:11px;padding:5px 10px;" onclick="openUploadModal('${a._id}')">Upload Offer</button>`
          : `<a href="${window.API_BASE.replace('/api','')}${a.offerLetter?.path}" target="_blank" style="font-size:12px;color:var(--accent-lavender-deep);text-decoration:none;font-weight:500;">View Letter</a>`
        }
      </td>
    </tr>
  `).join('');
}

// ── Offer Letter upload ────────────────────────────────
function openUploadModal(applicationId) {
  pendingUploadId = applicationId;
  document.getElementById('filePreview').style.display = 'none';
  document.getElementById('offerFile').value = '';
  openModal('uploadModal');
}

function previewFile(input) {
  const preview = document.getElementById('filePreview');
  if (input.files && input.files[0]) {
    preview.textContent = `📎 ${input.files[0].name} (${(input.files[0].size / 1024).toFixed(1)} KB)`;
    preview.style.display = 'block';
  }
}

async function uploadOfferLetter() {
  if (!pendingUploadId) return;
  const fileInput = document.getElementById('offerFile');
  if (!fileInput.files || !fileInput.files[0]) {
    showToast('Please select a file first.', 'error'); return;
  }
  const formData = new FormData();
  formData.append('offerLetter', fileInput.files[0]);

  const res = await API.putFormData(`/applications/${pendingUploadId}/offer-letter`, formData);
  closeModal('uploadModal');
  if (res.success) {
    showToast('Offer letter uploaded successfully!', 'success');
    await loadMyApplications();
    renderDashboard();
  } else {
    showToast(res.message || 'Upload failed.', 'error');
  }
}

// Drag & drop on upload zone
document.addEventListener('DOMContentLoaded', () => {
  const zone = document.getElementById('uploadZone');
  if (!zone) return;
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) {
      document.getElementById('offerFile').files = e.dataTransfer.files;
      previewFile({ files: e.dataTransfer.files });
    }
  });
});

// ── Profile ────────────────────────────────────────────
function loadProfile() {
  const user = getCurrentUser();
  if (!user) return;
  document.getElementById('pName').value  = user.name || '';
  document.getElementById('pEmail').value = user.email || '';
  document.getElementById('pPhone').value = user.phone || '';
  document.getElementById('pRoll').value  = user.rollNumber || '';
  document.getElementById('pSem').value   = user.semester || '';

  // NEW: Display current resume if it exists
  const resumeContainer = document.getElementById('currentResume');
  if (resumeContainer) {
    if (user.resume && user.resume.path) {
      resumeContainer.innerHTML = `Current Resume: <a href="${window.API_BASE.replace('/api','')}${user.resume.path}" target="_blank" style="color:var(--accent-lavender-deep);font-weight:600;text-decoration:none;">📄 ${escHtml(user.resume.filename)}</a>`;
    } else {
      resumeContainer.innerHTML = `<span style="color:var(--text-muted);">No resume uploaded yet.</span>`;
    }
  }
}

async function updateProfile() {
  const name     = document.getElementById('pName').value.trim();
  const phone    = document.getElementById('pPhone').value.trim();
  const semester = document.getElementById('pSem').value;

  const res = await API.put('/users/profile', { name, phone, semester: parseInt(semester) || undefined });
  if (res.success) {
    localStorage.setItem('user', JSON.stringify(res.data));
    document.getElementById('greetingText').textContent = getGreeting(res.data.name);
    document.getElementById('userAvatar').textContent   = avatarInitials(res.data.name);
    showToast('Profile updated!', 'success');
  } else {
    showToast(res.message || 'Update failed.', 'error');
  }
}

async function uploadResume() {
  const fileInput = document.getElementById('pResume');
  if (!fileInput.files || !fileInput.files[0]) {
    showToast('Please select a PDF file first.', 'error'); return;
  }
  
  const formData = new FormData();
  formData.append('resume', fileInput.files[0]);

  // Use API.putFormData since we are sending a file
  const res = await API.putFormData('/users/profile/resume', formData);
  
  if (res.success) {
    localStorage.setItem('user', JSON.stringify(res.data)); // Update local storage
    showToast('Resume uploaded successfully!', 'success');
    fileInput.value = ''; // Clear input
  } else {
    showToast(res.message || 'Failed to upload resume.', 'error');
  }
}

// Ensure you export it at the bottom of the file:
window.uploadResume = uploadResume;

async function changePassword() {
  const cur  = document.getElementById('curPwd').value;
  const nw   = document.getElementById('newPwd').value;
  const conf = document.getElementById('confPwd').value;

  if (!cur || !nw || !conf) { showToast('Please fill all password fields.', 'error'); return; }
  if (nw !== conf)           { showToast('New passwords do not match.', 'error');      return; }
  if (nw.length < 6)         { showToast('Password must be at least 6 characters.', 'error'); return; }

  const res = await API.put('/users/change-password', { currentPassword: cur, newPassword: nw });
  if (res.success) {
    showToast('Password changed successfully!', 'success');
    document.getElementById('curPwd').value = '';
    document.getElementById('newPwd').value      = '';
    document.getElementById('confPwd').value  = '';
  } else {
    showToast(res.message || 'Failed to change password.', 'error');
  }
}

// ── Global search ──────────────────────────────────────
document.getElementById('globalSearch')?.addEventListener('input', debounce((e) => {
  const q = e.target.value.toLowerCase().trim();
  if (!q) { renderInternshipsList(); return; }
  goTo('internships');
  const list = document.getElementById('internshipsList');
  const filtered = allInternships.filter(i =>
    i.title.toLowerCase().includes(q) ||
    i.company?.name.toLowerCase().includes(q) ||
    (i.skills || []).join(' ').toLowerCase().includes(q)
  );
  list.innerHTML = filtered.length
    ? filtered.map(i => internshipItemHtml(i, true)).join('')
    : emptyState('No results found.');
}));

// ── Helpers ────────────────────────────────────────────
function emptyState(msg) {
  return `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><p>${msg}</p></div>`;
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Export for inline onclick
window.openApplyModal    = openApplyModal;
window.submitApplication = submitApplication;
window.openUploadModal   = openUploadModal;
window.previewFile       = previewFile;
window.uploadOfferLetter = uploadOfferLetter;
window.filterInternships = filterInternships;
window.filterByCompany   = filterByCompany;
window.updateProfile     = updateProfile;
window.changePassword    = changePassword;
