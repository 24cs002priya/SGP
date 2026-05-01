/**
 * coordinator.js — All logic for the Coordinator dashboard
 */

// ── State ──────────────────────────────────────────────
let allCompanies    = [];
let allInternships  = [];
let allStudents     = [];
let currentFilter   = 'all';
let studentAppMap   = {}; // <-- ADD THIS to store application counts globally
// ── Boot ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth('coordinator')) return;

  const user = getCurrentUser();
  document.getElementById('greetingText').textContent = getGreeting(user.name);
  document.getElementById('userAvatar').textContent   = avatarInitials(user.name);

  await Promise.all([
    loadDashboardStats(),
    loadCompanies(),
    loadInternships(),
    loadStudents(),
    loadRecentApps(),
  ]);
});

// ── Dashboard Stats ────────────────────────────────────
async function loadDashboardStats() {
  const res = await API.get('/coordinator/dashboard-stats');
  if (!res.success) return;
  const d = res.data;
  document.getElementById('statStudents').textContent  = d.totalStudents;
  document.getElementById('statCompanies').textContent = d.totalCompanies;
  document.getElementById('statOffers').textContent    = d.studentsWithOffers;
  document.getElementById('statYetToApply').textContent= d.studentsYetToApply;

  // Quick filter badges
  const qYet = document.getElementById('qYet');
  const qNo  = document.getElementById('qNoOffer');
  const qOff = document.getElementById('qOffer');
  if (qYet) qYet.textContent = d.studentsYetToApply;
  if (qNo)  qNo.textContent  = d.studentsWithoutOffers;
  if (qOff) qOff.textContent = d.studentsWithOffers;
  const qComp = document.getElementById('qCompanies');
  if (qComp) qComp.textContent = d.totalCompanies;
}

// ── Recent Activity ────────────────────────────────────
async function loadRecentApps() {
  const res = await API.get('/coordinator/all-applications');
  if (!res.success) return;
  const el = document.getElementById('dashRecentApps');
  const recent = res.data.slice(0, 5);
  el.innerHTML = recent.length ? recent.map(a => `
    <div class="internship-item" style="margin-bottom:8px;">
      <div class="int-icon">
        <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--accent-lavender-deep),var(--accent-green));color:white;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">
          ${avatarInitials(a.student?.name || 'U')}
        </div>
      </div>
      <div class="int-info">
        <div class="int-title">${escHtml(a.student?.name || '—')}</div>
        <div class="int-company">${escHtml(a.internship?.title || '—')} · ${escHtml(a.company?.name || '')}</div>
      </div>
      ${badgeHtml(a.status)}
    </div>
  `).join('') : `<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px;">No applications yet.</div>`;
}

// ── Companies ──────────────────────────────────────────
async function loadCompanies() {
  const res = await API.get('/companies');
  if (!res.success) return;
  allCompanies = res.data;
  renderCompaniesGrid();
  populateCompanySelects();
}

function renderCompaniesGrid() {
  const grid = document.getElementById('companiesGrid');
  if (!grid) return;
  grid.innerHTML = allCompanies.map(c => `
    <div class="glass-sm company-card">
      <div class="company-logo">${c.name[0]}</div>
      <div class="company-name">${escHtml(c.name)}</div>
      <div class="company-meta">${escHtml(c.industry || '')} ${c.location ? '· ' + c.location : ''}</div>
      <div style="margin-top:12px;display:flex;gap:8px;">
        <button class="btn-secondary" style="font-size:11px;padding:4px 10px;" onclick="filterAppsByCompany('${c._id}','${escHtml(c.name)}')">View Applications</button>
      </div>
    </div>
  `).join('') || `<div class="empty-state"><p>No companies added yet.</p></div>`;
}

function populateCompanySelects() {
  const sel = document.getElementById('iCompany');
  if (!sel) return;
  sel.innerHTML = `<option value="">Select Company</option>` +
    allCompanies.map(c => `<option value="${c._id}">${escHtml(c.name)}</option>`).join('');
}

function openAddCompanyModal() {
  ['cName','cIndustry','cLocation','cWebsite','cDesc'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  openModal('addCompanyModal');
}

async function submitCompany() {
  const name     = document.getElementById('cName').value.trim();
  const industry = document.getElementById('cIndustry').value.trim();
  const location = document.getElementById('cLocation').value.trim();
  const website  = document.getElementById('cWebsite').value.trim();
  const description = document.getElementById('cDesc').value.trim();

  if (!name) { showToast('Company name is required.', 'error'); return; }

  const res = await API.post('/companies', { name, industry, location, website, description });
  closeModal('addCompanyModal');
  if (res.success) {
    showToast(`${name} added successfully!`, 'success');
    await loadCompanies();
  } else {
    showToast(res.message || 'Failed to add company.', 'error');
  }
}

// ── Internships ────────────────────────────────────────
async function loadInternships() {
  const res = await API.get('/internships');
  if (!res.success) return;
  allInternships = res.data;
  renderInternshipsList();
}

function renderInternshipsList() {
  const list = document.getElementById('internshipsList');
  if (!list) return;
  list.innerHTML = allInternships.length
    ? allInternships.map(int => `
      <div class="internship-item">
        <div class="int-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
        </div>
        <div class="int-info">
          <div class="int-title">${escHtml(int.title)}</div>
          <div class="int-company">${escHtml(int.company?.name || '')} ${int.company?.location ? '· '+int.company.location : ''}</div>
          <div class="int-meta">
            <span class="chip">${int.type}</span>
            ${int.stipend ? `<span class="chip">${int.stipend}</span>` : ''}
            ${int.duration ? `<span class="chip">${int.duration}</span>` : ''}
            ${int.openings ? `<span class="chip">${int.openings} openings</span>` : ''}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;">
          ${int.deadline ? `<span style="font-size:11px;color:var(--text-muted);">Deadline: ${fmtDate(int.deadline)}</span>` : ''}
          <button class="btn-secondary" style="font-size:11px;padding:4px 10px;" onclick="viewInternshipApplicants('${int._id}','${escHtml(int.title)}')">View Applicants</button>
        </div>
      </div>
    `).join('')
    : `<div class="empty-state"><p>No internships added yet. Add a company first, then post internships.</p></div>`;
}

function openAddInternshipModal() {
  populateCompanySelects();
  ['iTitle','iStipend','iDuration','iSkills','iDesc'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  openModal('addInternshipModal');
}

async function submitInternship() {
  const title   = document.getElementById('iTitle').value.trim();
  const company = document.getElementById('iCompany').value;
  const stipend = document.getElementById('iStipend').value.trim();
  const duration= document.getElementById('iDuration').value.trim();
  const type    = document.getElementById('iType').value;
  const openings= parseInt(document.getElementById('iOpenings').value) || 1;
  const deadline= document.getElementById('iDeadline').value;
  const skillsRaw= document.getElementById('iSkills').value;
  const description= document.getElementById('iDesc').value.trim();
  const skills  = skillsRaw.split(',').map(s => s.trim()).filter(Boolean);

  if (!title)   { showToast('Title is required.', 'error');   return; }
  if (!company) { showToast('Please select a company.', 'error'); return; }

  const payload = { title, company, stipend, duration, type, openings, skills, description };
  if (deadline) payload.deadline = deadline;

  const res = await API.post('/internships', payload);
  closeModal('addInternshipModal');
  if (res.success) {
    showToast('Internship posted!', 'success');
    await loadInternships();
  } else {
    showToast(res.message || 'Failed to post internship.', 'error');
  }
}

// ── Students Page ──────────────────────────────────────
async function loadStudents() {
  const res = await API.get('/coordinator/all-students');
  if (!res.success) return;
  allStudents = res.data;

  // Load student-wise application data
  const appRes = await API.get('/coordinator/student-wise-applications');
  
  // Clear and populate the global map instead of a local one
  studentAppMap = {}; 
  if (appRes.success) {
    appRes.data.forEach(s => {
      studentAppMap[s.studentId] = { count: s.totalApplications, hasOffer: s.hasAnyOffer };
    });
  }

  renderStudentsTable(allStudents, studentAppMap);
}
function renderStudentsTable(students, appMap = {}) {
  const tbody = document.getElementById('studentsBody');
  if (!tbody) return;
  if (!students.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted);">No students found.</td></tr>`;
    return;
  }
  tbody.innerHTML = students.map(s => {
    const am = appMap[s._id] || { count: 0, hasOffer: false };
    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--accent-lavender-deep),var(--accent-green));color:white;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">${avatarInitials(s.name)}</div>
            <span style="font-weight:600;">${escHtml(s.name)}</span>
          </div>
        </td>
        <td>${escHtml(s.rollNumber || '—')}</td>
        <td>${s.semester ? `Sem ${s.semester}` : '—'}</td>
        <td style="font-size:12px;">${escHtml(s.email)}</td>
        <td>
          ${am.count > 0
            ? `<span style="font-weight:600;color:var(--accent-lavender-deep);">${am.count}</span>`
            : `<span style="color:var(--status-rejected);font-weight:600;font-size:11px;">None yet</span>`
          }
        </td>
        <td>
          ${am.hasOffer
            ? `<span style="color:#4a7a10;font-weight:600;font-size:12px;">✓ Submitted</span>`
            : `<span style="color:var(--text-muted);font-size:12px;">—</span>`
          }
        </td>
      </tr>
    `;
  }).join('');
}

function searchStudents(query) {
  const q = query.toLowerCase().trim();
  const filtered = q
    ? allStudents.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.rollNumber || '').toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
      )
    : allStudents;
    
  // Pass the global map so the table retains application counts while searching!
  renderStudentsTable(filtered, studentAppMap); 
}
// ── Applications Filters ───────────────────────────────
function goToFilter(filter) {
  goTo('applications');
  const tabMap = {
    'yet-to-apply': 1,
    'no-offer':     2,
    'with-offer':   3,
    'company-wise': 4,
  };
  const tabs = document.querySelectorAll('#appFilterTabs .filter-tab');
  tabs.forEach(t => t.classList.remove('active'));
  if (tabMap[filter] !== undefined) tabs[tabMap[filter]]?.classList.add('active');
  filterApps(filter, null);
}

async function filterApps(filter, btn) {
  currentFilter = filter;
  if (btn) {
    document.querySelectorAll('#appFilterTabs .filter-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
  }

  const head = document.getElementById('appHead');
  const body = document.getElementById('appBody');
  body.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-muted);">Loading...</td></tr>`;

  switch (filter) {
    case 'all':          await renderAllApplications(head, body);      break;
    case 'yet-to-apply': await renderYetToApply(head, body);           break;
    case 'no-offer':     await renderNoOffer(head, body);              break;
    case 'with-offer':   await renderWithOffer(head, body);            break;
    case 'company-wise': await renderCompanyWise(head, body);          break;
  }
}

async function renderAllApplications(head, body) {
  // 1. Added <th>Resume</th> to the headers
  head.innerHTML = `<tr><th>Student</th><th>Roll No.</th><th>Resume</th><th>Company</th><th>Role</th><th>Applied</th><th>Status</th><th>Offer Letter</th><th>Action</th></tr>`;
  
  const res = await API.get('/coordinator/all-applications');
  if (!res.success || !res.data.length) {
    body.innerHTML = emptyRow(9, 'No applications found.'); return;
  }
  
  body.innerHTML = res.data.map(a => `
    <tr>
      <td><div style="font-weight:600;">${escHtml(a.student?.name || '—')}</div><div style="font-size:11px;color:var(--text-muted);">${escHtml(a.student?.email || '')}</div></td>
      <td style="font-size:12px;">${escHtml(a.student?.rollNumber || '—')}</td>
      
      <td>
        ${a.student?.resume && a.student.resume.path
          ? `<a href="${window.API_BASE?.replace('/api','')||''}${a.student.resume.path}" target="_blank" style="color:var(--accent-lavender-deep);font-size:12px;font-weight:600;text-decoration:none;">📄 View CV</a>`
          : `<span style="color:var(--text-muted);font-size:11px;">Missing</span>`
        }
      </td>

      <td>${escHtml(a.company?.name || '—')}</td>
      <td style="font-size:12px;">${escHtml(a.internship?.title || '—')}</td>
      <td style="font-size:12px;">${fmtDate(a.appliedAt)}</td>
      <td>${badgeHtml(a.status)}</td>
      <td>${a.hasOfferLetter ? `<span style="color:#4a7a10;font-weight:600;font-size:12px;">✓ Yes</span>` : `<span style="color:var(--text-muted);font-size:12px;">No</span>`}</td>
      <td>
        <select class="form-select" style="padding:4px 8px;font-size:11px;width:120px;" onchange="updateStatus('${a._id}',this.value)">
          ${['applied','shortlisted','interview','selected','rejected'].map(s =>
            `<option value="${s}" ${a.status===s?'selected':''}>${s}</option>`
          ).join('')}
        </select>
      </td>
    </tr>
  `).join('');
}

async function renderYetToApply(head, body) {
  head.innerHTML = `<tr><th>Student</th><th>Roll No.</th><th>Semester</th><th>Email</th><th>Phone</th><th>Registered On</th></tr>`;
  const res = await API.get('/coordinator/students-yet-to-apply');
  if (!res.success || !res.data.length) {
    body.innerHTML = emptyRow(6, '🎉 All students have applied to at least one internship!'); return;
  }
  body.innerHTML = res.data.map(s => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="width:28px;height:28px;border-radius:50%;background:rgba(247,197,197,0.5);color:#a03030;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;">${avatarInitials(s.name)}</div>
          <span style="font-weight:600;">${escHtml(s.name)}</span>
        </div>
      </td>
      <td>${escHtml(s.rollNumber || '—')}</td>
      <td>${s.semester ? `Sem ${s.semester}` : '—'}</td>
      <td style="font-size:12px;">${escHtml(s.email)}</td>
      <td style="font-size:12px;">${escHtml(s.phone || '—')}</td>
      <td style="font-size:12px;">${fmtDate(s.createdAt)}</td>
    </tr>
  `).join('');
}

async function renderNoOffer(head, body) {
  // 1. Add <th>Resume</th> to the header
  head.innerHTML = `<tr><th>Student</th><th>Roll No.</th><th>Resume</th><th>Companies Applied</th><th>Applications</th><th>Latest Applied</th></tr>`;
  
  const res = await API.get('/coordinator/students-without-offer');
  if (!res.success || !res.data.length) {
    body.innerHTML = emptyRow(6, '🎉 All students who applied have submitted offer letters!'); return;
  }
  
  body.innerHTML = res.data.map(s => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="width:28px;height:28px;border-radius:50%;background:rgba(252,228,160,0.5);color:#8a6010;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;">${avatarInitials(s.name)}</div>
          <div>
            <div style="font-weight:600;">${escHtml(s.name)}</div>
            <div style="font-size:11px;color:var(--text-muted);">${escHtml(s.email)}</div>
          </div>
        </div>
      </td>
      <td>${escHtml(s.rollNumber || '—')}</td>
      
      <td>
        ${s.resume && s.resume.path
          ? `<a href="${window.API_BASE?.replace('/api','')||''}${s.resume.path}" target="_blank" style="color:var(--accent-lavender-deep);font-size:12px;font-weight:600;text-decoration:none;">📄 View CV</a>`
          : `<span style="color:var(--text-muted);font-size:11px;">Missing</span>`
        }
      </td>
      
      <td style="font-size:12px;">${(s.companiesApplied || []).join(', ') || '—'}</td>
      <td style="font-weight:600;color:var(--accent-lavender-deep);">${s.applicationCount}</td>
      <td style="font-size:12px;">${fmtDate(s.latestApplied)}</td>
    </tr>
  `).join('');
}

async function renderWithOffer(head, body) {
  head.innerHTML = `<tr><th>Student</th><th>Roll No.</th><th>Company</th><th>Role</th><th>Offer Letter</th><th>Uploaded On</th></tr>`;
  const res = await API.get('/coordinator/students-with-offer');
  if (!res.success || !res.data.length) {
    body.innerHTML = emptyRow(6, 'No offer letters submitted yet.'); return;
  }
  body.innerHTML = res.data.map(a => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="width:28px;height:28px;border-radius:50%;background:rgba(198,233,126,0.4);color:#4a7a10;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;">${avatarInitials(a.student?.name || 'U')}</div>
          <span style="font-weight:600;">${escHtml(a.student?.name || '—')}</span>
        </div>
      </td>
      <td style="font-size:12px;">${escHtml(a.student?.rollNumber || '—')}</td>
      <td>${escHtml(a.company?.name || '—')}</td>
      <td style="font-size:12px;">${escHtml(a.internship?.title || '—')}</td>
      <td>
        <a href="${window.API_BASE?.replace('/api','')||''}${a.offerLetter?.path || '#'}" target="_blank"
           style="color:var(--accent-lavender-deep);font-size:12px;font-weight:600;text-decoration:none;">
          📄 ${escHtml(a.offerLetter?.filename || 'View')}
        </a>
      </td>
      <td style="font-size:12px;">${fmtDate(a.offerLetter?.uploadedAt)}</td>
    </tr>
  `).join('');
}

async function renderCompanyWise(head, body) {
  head.innerHTML = `<tr><th>Company</th><th>Industry</th><th>Students Applied</th><th>Offer Letters</th><th>Students</th></tr>`;
  const res = await API.get('/coordinator/company-wise-students');
  if (!res.success || !res.data.length) {
    body.innerHTML = emptyRow(5, 'No application data available.'); return;
  }
  body.innerHTML = res.data.map(c => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,var(--accent-lavender),var(--accent-green));color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;">${(c.companyName||'?')[0]}</div>
          <span style="font-weight:600;">${escHtml(c.companyName || '—')}</span>
        </div>
      </td>
      <td style="font-size:12px;">${escHtml(c.industry || '—')}</td>
      <td style="font-weight:600;color:var(--accent-lavender-deep);">${c.totalUniqueStudents}</td>
      <td>
        <span style="color:#4a7a10;font-weight:600;">${c.studentsWithOffer}</span>
        <span style="color:var(--text-muted);font-size:11px;"> / ${c.totalApplications}</span>
      </td>
      <td style="font-size:12px;color:var(--text-secondary);">
        ${(c.students || []).map(s => escHtml(s.name)).slice(0,3).join(', ')}
        ${c.students?.length > 3 ? ` <span style="color:var(--text-muted);">+${c.students.length-3} more</span>` : ''}
      </td>
    </tr>
  `).join('');
}

async function filterAppsByCompany(companyId, companyName) {
  goTo('applications');
  document.querySelectorAll('#appFilterTabs .filter-tab').forEach(t => t.classList.remove('active'));
  const head = document.getElementById('appHead');
  const body = document.getElementById('appBody');
  head.innerHTML = `<tr><th>Student</th><th>Roll No.</th><th>Role</th><th>Applied</th><th>Status</th><th>Offer Letter</th></tr>`;
  body.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:16px;color:var(--text-muted);">Loading...</td></tr>`;
  const res = await API.get(`/coordinator/all-applications?company=${companyId}`);
  if (!res.success || !res.data.length) {
    body.innerHTML = emptyRow(6, `No applications for ${escHtml(companyName)}.`); return;
  }
  body.innerHTML = res.data.map(a => `
    <tr>
      <td><div style="font-weight:600;">${escHtml(a.student?.name||'—')}</div></td>
      <td>${escHtml(a.student?.rollNumber||'—')}</td>
      <td style="font-size:12px;">${escHtml(a.internship?.title||'—')}</td>
      <td style="font-size:12px;">${fmtDate(a.appliedAt)}</td>
      <td>${badgeHtml(a.status)}</td>
      <td>${a.hasOfferLetter ? `<span style="color:#4a7a10;font-weight:600;font-size:12px;">✓ Yes</span>` : `<span style="color:var(--text-muted);font-size:12px;">No</span>`}</td>
    </tr>
  `).join('');
}

async function viewInternshipApplicants(internshipId, title) {
  goTo('applications');
  document.querySelectorAll('#appFilterTabs .filter-tab').forEach(t => t.classList.remove('active'));
  const head = document.getElementById('appHead');
  const body = document.getElementById('appBody');
  head.innerHTML = `<tr><th colspan="6" style="color:var(--accent-lavender-deep);">Applicants for: ${escHtml(title)}</th></tr><tr><th>Student</th><th>Roll No.</th><th>Applied</th><th>Status</th><th>Offer Letter</th><th>Action</th></tr>`;
  body.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:16px;">Loading...</td></tr>`;

  const res = await API.get(`/coordinator/all-applications`);
  if (!res.success) return;
  const filtered = res.data.filter(a => a.internship?._id === internshipId);
  if (!filtered.length) { body.innerHTML = emptyRow(6, 'No applicants yet.'); return; }
  body.innerHTML = filtered.map(a => `
    <tr>
      <td><div style="font-weight:600;">${escHtml(a.student?.name||'—')}</div></td>
      <td>${escHtml(a.student?.rollNumber||'—')}</td>
      <td style="font-size:12px;">${fmtDate(a.appliedAt)}</td>
      <td>${badgeHtml(a.status)}</td>
      <td>${a.hasOfferLetter ? `<span style="color:#4a7a10;font-weight:600;font-size:12px;">✓ Yes</span>` : `<span style="color:var(--text-muted);font-size:12px;">No</span>`}</td>
      <td>
        <select class="form-select" style="padding:4px 8px;font-size:11px;width:120px;" onchange="updateStatus('${a._id}',this.value)">
          ${['applied','shortlisted','interview','selected','rejected'].map(s =>
            `<option value="${s}" ${a.status===s?'selected':''}>${s}</option>`
          ).join('')}
        </select>
      </td>
    </tr>
  `).join('');
}

async function updateStatus(appId, status) {
  const res = await API.put(`/applications/${appId}/status`, { status });
  if (res.success) showToast(`Status updated to "${status}"`, 'success');
  else showToast(res.message || 'Update failed.', 'error');
}

// ── Profile ────────────────────────────────────────────
function loadProfile() {
  const user = getCurrentUser();
  if (!user) return;
  document.getElementById('pName').value  = user.name || '';
  document.getElementById('pEmail').value = user.email || '';
  document.getElementById('pPhone').value = user.phone || '';
 // document.getElementById('pRoll').value  = user.rollNumber || '';
 // document.getElementById('pSem').value   = user.semester || '';

  // // NEW: Display current resume if it exists
  // const resumeContainer = document.getElementById('currentResume');
  // if (resumeContainer) {
  //   if (user.resume && user.resume.path) {
  //     resumeContainer.innerHTML = `Current Resume: <a href="${window.API_BASE.replace('/api','')}${user.resume.path}" target="_blank" style="color:var(--accent-lavender-deep);font-weight:600;text-decoration:none;">📄 ${escHtml(user.resume.filename)}</a>`;
  //   } else {
  //     resumeContainer.innerHTML = `<span style="color:var(--text-muted);">No resume uploaded yet.</span>`;
  //   }
  // }
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
// ── Global search ──────────────────────────────────────
document.getElementById('globalSearch')?.addEventListener('input', debounce((e) => {
  const q = e.target.value.toLowerCase().trim();
  goTo('students'); // Switch to students tab whenever typing
  
  if (!q) {
    // If the search bar is cleared, reset the table
    renderStudentsTable(allStudents, studentAppMap);
    return;
  }
  
  searchStudents(q);
}));
// ── Helpers ────────────────────────────────────────────
function emptyRow(cols, msg) {
  return `<tr><td colspan="${cols}" style="text-align:center;padding:40px;color:var(--text-muted);font-size:13px;">${msg}</td></tr>`;
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Export to global
window.openAddCompanyModal    = openAddCompanyModal;
window.openAddInternshipModal = openAddInternshipModal;
window.submitCompany          = submitCompany;
window.submitInternship       = submitInternship;
window.filterApps             = filterApps;
window.filterAppsByCompany    = filterAppsByCompany;
window.viewInternshipApplicants = viewInternshipApplicants;
window.updateStatus           = updateStatus;
window.searchStudents         = searchStudents;
window.goToFilter             = goToFilter;
