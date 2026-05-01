# Intellecta — Internship Portal
## System Architecture & Developer Guide

---

## 1. PROJECT FILE STRUCTURE

```
internship-portal/
│
├── backend/                          ← Node.js + Express API
│   ├── server.js                     ← Entry point, mounts all routes
│   ├── package.json
│   ├── .env                          ← MONGO_URI, JWT_SECRET, PORT
│   │
│   ├── config/
│   │   └── seed.js                   ← Demo data seeder (node config/seed.js)
│   │
│   ├── models/                       ← Mongoose Schemas
│   │   ├── User.js                   ← Student + Coordinator schema
│   │   ├── Company.js                ← Company schema
│   │   ├── Internship.js             ← Internship schema
│   │   └── Application.js            ← Application + Offer Letter schema
│   │
│   ├── routes/                       ← Express routers
│   │   ├── auth.routes.js            ← /api/auth/* (login, register, me)
│   │   ├── user.routes.js            ← /api/users/* (profile, password)
│   │   ├── company.routes.js         ← /api/companies/* (CRUD)
│   │   ├── internship.routes.js      ← /api/internships/* (CRUD)
│   │   ├── application.routes.js     ← /api/applications/* (apply, upload)
│   │   └── coordinator.routes.js     ← /api/coordinator/* (aggregation views)
│   │
│   ├── middleware/
│   │   ├── auth.middleware.js        ← JWT verify + RBAC authorize()
│   │   └── upload.middleware.js      ← Multer (PDF/image upload, 5MB)
│   │
│   └── uploads/
│       └── offer-letters/            ← Uploaded offer letter files
│
└── frontend/                         ← Vanilla HTML/CSS/JS
    ├── css/
    │   └── main.css                  ← Full glassmorphism design system
    │
    ├── js/
    │   ├── api.js                    ← Centralised fetch wrapper (API.get/post/put)
    │   ├── utils.js                  ← Toast, modal, routing, date helpers
    │   ├── student.js                ← All student page logic
    │   └── coordinator.js            ← All coordinator page logic
    │
    └── pages/
        ├── login.html                ← Login + Register (role selector)
        ├── student.html              ← Student SPA (dashboard/companies/internships/apps/profile)
        └── coordinator.html          ← Coordinator SPA (dashboard/companies/internships/apps/students)
```

---

## 2. DATABASE SCHEMA DESIGN

### User Schema (`models/User.js`)
```
_id, name, email, password (bcrypt), role (student|coordinator),
rollNumber (sparse unique), department, semester (1-8),
phone, avatar, isActive, createdAt, updatedAt
```

### Company Schema (`models/Company.js`)
```
_id, name (unique), description, industry, website,
location, logo, addedBy → User._id, isActive, timestamps
```

### Internship Schema (`models/Internship.js`)
```
_id, title, company → Company._id, description,
stipend, duration, type (remote|on-site|hybrid),
skills[], openings, deadline, isActive,
addedBy → User._id, timestamps
```

### Application Schema (`models/Application.js`)  ← Core linking model
```
_id,
student      → User._id        (ref)
internship   → Internship._id  (ref)
company      → Company._id     (ref, denormalized for fast queries)
status       (applied|shortlisted|interview|selected|rejected|withdrawn)
coverLetter  (text)
offerLetter  { filename, path, mimetype, uploadedAt }
hasOfferLetter  (Boolean, denormalized flag — key for coordinator queries)
coordinatorNotes, appliedAt, timestamps

Indexes:
  { student, internship } — unique compound (prevents duplicate applications)
  { company, hasOfferLetter }  — coordinator filter queries
  { student }               — student's own applications
```

---

## 3. REST API ENDPOINT REFERENCE

### Authentication
| Method | Endpoint              | Role | Description                    |
|--------|-----------------------|------|-------------------------------|
| POST   | /api/auth/register    | Any  | Register student or coordinator |
| POST   | /api/auth/login       | Any  | Login, returns JWT token       |
| GET    | /api/auth/me          | Any  | Get current user from token    |

### User Profile
| Method | Endpoint                     | Role | Description              |
|--------|------------------------------|------|--------------------------|
| GET    | /api/users/profile           | Any  | Get own profile          |
| PUT    | /api/users/profile           | Any  | Update profile fields    |
| PUT    | /api/users/change-password   | Any  | Change own password      |

### Companies
| Method | Endpoint             | Role        | Description              |
|--------|----------------------|-------------|--------------------------|
| GET    | /api/companies       | Any         | List all companies       |
| GET    | /api/companies/:id   | Any         | Get company by ID        |
| POST   | /api/companies       | Coordinator | Create company           |
| PUT    | /api/companies/:id   | Coordinator | Update company           |
| DELETE | /api/companies/:id   | Coordinator | Soft-delete company      |

### Internships
| Method | Endpoint               | Role        | Description                       |
|--------|------------------------|-------------|-----------------------------------|
| GET    | /api/internships       | Any         | List all (filter by ?company=id)  |
| GET    | /api/internships/:id   | Any         | Get internship by ID              |
| POST   | /api/internships       | Coordinator | Create internship                 |
| PUT    | /api/internships/:id   | Coordinator | Update internship                 |
| DELETE | /api/internships/:id   | Coordinator | Soft-delete internship            |

### Applications
| Method | Endpoint                              | Role        | Description                    |
|--------|---------------------------------------|-------------|-------------------------------|
| POST   | /api/applications                     | Student     | Apply to an internship         |
| GET    | /api/applications/my                  | Student     | Get own applications           |
| GET    | /api/applications/:id                 | Any (scoped)| Get single application         |
| PUT    | /api/applications/:id/offer-letter    | Student     | Upload offer letter (multer)   |
| PUT    | /api/applications/:id/status          | Coordinator | Update application status      |

### Coordinator — Aggregation Endpoints
| Method | Endpoint                                    | Role        | Description                          |
|--------|---------------------------------------------|-------------|--------------------------------------|
| GET    | /api/coordinator/dashboard-stats            | Coordinator | Summary counts for dashboard         |
| GET    | /api/coordinator/students-yet-to-apply      | Coordinator | Students with 0 applications         |
| GET    | /api/coordinator/students-without-offer     | Coordinator | Applied but no offer letter          |
| GET    | /api/coordinator/students-with-offer        | Coordinator | Students who uploaded offer letters  |
| GET    | /api/coordinator/company-wise-students      | Coordinator | Per-company student lists            |
| GET    | /api/coordinator/student-wise-applications  | Coordinator | Per-student application lists        |
| GET    | /api/coordinator/all-applications           | Coordinator | Full list with filters (?company, ?status, ?hasOfferLetter) |
| GET    | /api/coordinator/all-students               | Coordinator | All registered students              |

---

## 4. CORE AGGREGATION LOGIC

### A) Students Yet to Apply
```javascript
// Step 1: collect all student IDs that have at least one application
const appliedIds = await Application.distinct('student');

// Step 2: find students NOT in that set
const result = await User.find({
  role: 'student',
  isActive: true,
  _id: { $nin: appliedIds }   // ← key operator
});
```

### B) Students Who Applied But Have No Offer Letter
```javascript
await Application.aggregate([
  { $match: { hasOfferLetter: false } },          // fast index hit
  { $group: { _id: '$student',                    // deduplicate per student
      applicationCount: { $sum: 1 },
      companies: { $addToSet: '$company' },
      latestApplied: { $max: '$appliedAt' }
  }},
  { $lookup: { from:'users', localField:'_id', foreignField:'_id', as:'studentInfo' }},
  { $unwind: '$studentInfo' },
  { $match: { 'studentInfo.isActive': true }},
  // project clean output...
]);
```

### C) Company-wise Student Lists
```javascript
await Application.aggregate([
  { $group: {
      _id: '$company',
      totalApplications: { $sum: 1 },
      studentsWithOffer: { $sum: { $cond: ['$hasOfferLetter', 1, 0] }},
      studentIds: { $addToSet: '$student' }
  }},
  { $lookup: { from:'companies', localField:'_id', foreignField:'_id', as:'companyInfo' }},
  { $lookup: { from:'users', localField:'studentIds', foreignField:'_id', as:'students' }},
  // project company name + student array...
  { $sort: { totalApplications: -1 }}
]);
```

### Why `hasOfferLetter` is Denormalized
The boolean flag is stored directly on the Application document (not derived from offerLetter.path).
This means coordinator filter queries hit a simple index scan instead of computing null-checks on nested objects — significantly faster at scale.

---

## 5. AUTHENTICATION & RBAC FLOW

```
  Client                        Server
    |                             |
    |  POST /api/auth/login       |
    |  { email, password }        |
    |─────────────────────────── >|
    |                             |  1. Find user by email
    |                             |  2. bcrypt.compare(password, hash)
    |                             |  3. jwt.sign({ id }, SECRET, { expiresIn:'7d' })
    |  { token, user }            |
    |< ────────────────────────── |
    |                             |
    |  GET /api/coordinator/*     |
    |  Authorization: Bearer JWT  |
    |─────────────────────────── >|
    |                             |  protect middleware:
    |                             |   → jwt.verify(token)
    |                             |   → User.findById(decoded.id)
    |                             |   → attach req.user
    |                             |
    |                             |  authorize('coordinator') middleware:
    |                             |   → if req.user.role !== 'coordinator'
    |                             |     → 403 Forbidden
    |                             |
    |  { data }  OR  403          |
    |< ────────────────────────── |
```

### RBAC Implementation
```javascript
// Protect (verify token)
const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  const decoded = jwt.verify(token, JWT_SECRET);
  req.user = await User.findById(decoded.id);
  next();
};

// Authorize (role check)
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ message: 'Access denied' });
  next();
};

// Usage on routes:
router.post('/companies', protect, authorize('coordinator'), handler);
router.post('/applications', protect, authorize('student'), handler);
router.get('/applications/my', protect, authorize('student'), handler);
```

---

## 6. FRONTEND SPA ROUTING

All three HTML files are Single-Page Applications using a simple show/hide pattern:

```javascript
function goTo(page) {
  // Hide all pages
  document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
  // Show target page
  document.getElementById(`page-${page}`).classList.add('active');
  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`nav-${page}`)?.classList.add('active');
}
```

Role-based redirect is enforced on every page load:
```javascript
function requireAuth(role) {
  const token = localStorage.getItem('token');
  const user  = JSON.parse(localStorage.getItem('user'));
  if (!token || !user) { window.location.href = 'login.html'; return; }
  if (user.role !== role) {
    window.location.href = user.role === 'coordinator' ? 'coordinator.html' : 'student.html';
  }
}
// Called at top of student.js and coordinator.js DOMContentLoaded
```

---

## 7. QUICK START

```bash
# 1. Install dependencies
cd backend && npm install

# 2. Configure environment
cp .env.example .env   # edit MONGO_URI and JWT_SECRET

# 3. Seed demo data
node config/seed.js

# 4. Start server
npm run dev   # nodemon for development
npm start     # production

# 5. Open frontend
# Navigate to http://localhost:5000
# Or open frontend/pages/login.html directly

# Demo credentials:
# Coordinator: coordinator@college.edu / password123
# Student:     aarav@student.edu / password123
```

---

## 8. UI DESIGN SYSTEM

**Aesthetic:** Glassmorphism · Soft lavender-white · Matching reference image  
**Fonts:** Instrument Serif (headings) + Figtree (body)  
**Color Palette:**
- Background: `#ededf4`
- Glass card: `rgba(255,255,255,0.52)` + `backdrop-filter: blur(18px)`
- Lavender accent: `#9b8de0` / `#c4b8f0`
- Green accent: `#c6e97e` (offer letters / success states)
- Blue accent: `#bbd4f7` (applications)
- Pink accent: `#f7c5c5` (warnings / rejection)
- Ink: `#1a1730`
