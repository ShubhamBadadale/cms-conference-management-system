# 📚 ConferMS — Conference Management System

A full-stack academic conference management system built with **React + Node.js + Express + MySQL**.  
Implements role-based access for Authors, Reviewers, Admins, and Coordinators.

---

## 🗂️ Project Structure

```
cms/
├── schema.sql                  ← MySQL database schema
├── backend/
│   ├── server.js               ← Express app entry point
│   ├── .env                    ← Environment variables
│   ├── config/
│   │   └── db.js               ← MySQL connection pool
│   ├── middleware/
│   │   ├── auth.js             ← JWT auth + role authorization
│   │   └── upload.js           ← Multer PDF upload config
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── conferenceController.js
│   │   ├── paperController.js
│   │   ├── reviewController.js
│   │   ├── adminController.js
│   │   ├── coordinatorController.js
│   │   ├── notificationController.js
│   │   └── certificateController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── conferenceRoutes.js
│   │   ├── paperRoutes.js
│   │   ├── reviewRoutes.js
│   │   ├── adminRoutes.js
│   │   ├── coordinatorRoutes.js
│   │   └── userRoutes.js       ← Notifications + certificates
│   └── uploads/
│       ├── papers/             ← Uploaded PDF papers
│       └── certificates/       ← Generated PDF certificates
└── frontend/
    ├── public/
    │   └── index.html
    └── src/
        ├── App.js              ← React Router configuration
        ├── index.js            ← React entry point
        ├── index.css           ← Global styles
        ├── context/
        │   └── AuthContext.js  ← JWT auth state
        ├── components/
        │   ├── Layout.js
        │   ├── Sidebar.js
        │   └── ProtectedRoute.js
        ├── services/
        │   └── api.js          ← Axios API calls
        └── pages/
            ├── Login.js
            ├── Register.js
            ├── AuthorDashboard.js
            ├── ReviewerDashboard.js
            ├── AdminDashboard.js
            ├── AdminSubmissions.js
            ├── AdminConferences.js
            ├── AdminUsers.js
            ├── AdminMisc.js      ← AcceptedPapers + AdminNotify
            ├── CoordinatorDashboard.js
            ├── ConferenceList.js
            ├── ConferenceDetail.js
            ├── SubmitPaper.js
            ├── MySubmissions.js
            └── NotificationsAndCerts.js
```

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js v16+
- MySQL 8.0+
- npm or yarn

---

### Step 1 — Database Setup

```bash
# Login to MySQL
mysql -u root -p

# Create and initialize the database
source /path/to/cms/schema.sql
```

Or run directly:
```bash
mysql -u root -p < schema.sql
```

This creates the `cms_db` database with all 8 tables and a default **admin user**:
- Email: `admin@cms.com`
- Password: `password`

---

### Step 2 — Backend Setup

```bash
cd backend
npm install
```

Edit `.env` with your credentials:
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=cms_db
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
MONGO_URI=mongodb://127.0.0.1:27017
MONGO_DB_NAME=cms_nosql_showcase
```

Start the backend:
```bash
npm run dev    # development (with nodemon)
# or
npm start      # production
```

Backend runs on: **http://localhost:5000**

---

### Step 3 — Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend runs on: **http://localhost:3000**  
(Proxied to backend via `"proxy": "http://localhost:5000"` in package.json)

---

## 👥 User Roles & Credentials

| Role | Email | Password | Access |
|------|-------|----------|--------|
| Admin | admin@cms.com | password | Full system control |
| Author | Register via /register | — | Submit papers |
| Reviewer | Register via /register | — | Review assigned papers |
| Coordinator | Register via /register | — | Score presentations |

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | /api/auth/register | Public, creates pending account |
| POST | /api/auth/login | Public |
| GET | /api/auth/me | Auth |

### Conferences
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | /api/conferences | Public |
| GET | /api/conferences/:id | Auth |
| GET | /api/conferences/admin/all | Admin |
| POST | /api/conferences | Admin |
| PUT | /api/conferences/:id/publish | Admin |

### Papers
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | /api/papers/submit | Author |
| GET | /api/papers/my-submissions | Author |
| POST | /api/papers/resubmit | Author |
| GET | /api/papers/all | Admin/Coordinator |
| GET | /api/papers/:id/download | Auth + permission |
| GET | /api/papers/:paper_id/reviews | Author |

### Reviews
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | /api/reviews/assigned | Reviewer |
| POST | /api/reviews/submit | Reviewer |
| GET | /api/reviews/paper/:paper_id | Admin/Coordinator |

### Admin
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | /api/admin/users | Admin |
| PATCH | /api/admin/users/:id/role | Admin |
| GET | /api/admin/reviewers | Admin |
| POST | /api/admin/assign-reviewer | Admin |
| POST | /api/admin/decision | Admin |
| GET | /api/admin/accepted-papers | Admin |
| POST | /api/admin/notify | Admin |
| POST | /api/admin/generate-certificate | Admin |
| GET | /api/admin/stats | Admin |

### Coordinator
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | /api/coordinator/schedule | Coordinator |
| POST | /api/coordinator/score | Coordinator |

### User (Shared)
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | /api/user/notifications | Auth |
| PUT | /api/user/notifications/read | Auth |
| GET | /api/user/certificates | Author |
| GET | /api/user/certificates/:paper_id/download | Author |

---

## 🗃️ Database Tables

| Table | Description |
|-------|-------------|
| Users | All user accounts with role |
| Conferences | Conference records |
| Papers | Submitted papers (PDF path + status) |
| ReviewerAssignments | Reviewer ↔ Paper mapping |
| Reviews | Review scores and comments |
| PresentationScores | Coordinator presentation ratings |
| Certificates | Generated PDF certificate records |
| Notifications | User notification messages |

---

## DBMS Showcase Scripts

For DBMS practical/demo coverage, the repo includes optional scripts that extend the same conference-management domain:

```bash
mysql -u root -p cms_db < sql/dbms_showcase.sql
mysql -u root -p cms_db < sql/dbms_lab_queries.sql
mongosh mongodb/cms_mongodb_showcase.js
```

- `sql/dbms_showcase.sql` adds normalized extension tables, indexes, views, stored functions, procedures, cursors, triggers, transaction routines, audit/recovery tables, distributed metadata, and warehouse snapshots.
- `sql/dbms_lab_queries.sql` contains ready-made SELECT, join, subquery, set operator, view, DCL, TCL, and EXPLAIN examples.
- `docs/DBMS_SHOWCASE.md` maps the DBMS syllabus concepts to the actual implementation.

### NoSQL Analytics Integration

The backend also exposes a MongoDB-backed analytics endpoint:

```bash
GET /api/nosql/analytics
```

Add these values in `backend/.env`:

```env
MONGO_URI=mongodb://127.0.0.1:27017
MONGO_DB_NAME=cms_nosql_showcase
```

How it works:

- MySQL remains the source of truth for users, papers, reviews, decisions, and certificates.
- `/api/nosql/analytics` reads `vw_conference_metrics_olap`, stores the analytics as MongoDB documents in `conferenceAnalytics`, and returns them to the Admin Dashboard.
- If MongoDB is not running, the app still works and the dashboard shows fallback analytics from MySQL.

---

## 🔄 Conference Workflow

```
1. Admin creates conference (draft)
2. Admin publishes conference
3. Authors submit papers (PDF upload)
4. Admin assigns reviewers to papers
5. Reviewers submit scored reviews
6. Admin makes Accept / Reject / Revision decision
7. Authors notified, can resubmit if revision requested
8. Coordinator scores accepted presentations
9. Admin generates PDF certificates
10. Authors download certificates
```

---

## 🔐 Security Features

- JWT tokens with expiry (7 days)
- bcrypt password hashing (salt rounds: 10)
- Role-based route protection (middleware)
- New registrations stay in `pending` until approved by admin
- File type validation (PDF only, 20MB max)
- Reviewer can only access their assigned papers

---

## 📝 Notes

- Uploaded PDFs stored in `backend/uploads/papers/`
- Generated certificates stored in `backend/uploads/certificates/`
- Admin seeded with hashed password via schema.sql
- Frontend proxy in `package.json` routes `/api` calls to backend
- All API responses include proper HTTP status codes
