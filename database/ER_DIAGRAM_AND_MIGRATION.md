# ConferMS — Advanced DBMS Features
## ER Diagram Description & Migration Guide

---

## Updated ER Diagram (Text Description)

### Core Entities (Existing)

```
Users(id PK, name, email, password, role, institution, created_at)
Conferences(id PK, title, description, topics, venue, submission_deadline, status, created_by FK→Users)
Papers(id PK, title, abstract, keywords, file_path, author_id FK→Users, conference_id FK→Conferences, status, version, created_at)
ReviewerAssignments(id PK, paper_id FK→Papers, reviewer_id FK→Users, assigned_date)   [UNIQUE paper_id+reviewer_id]
Reviews(id PK, paper_id FK→Papers, reviewer_id FK→Users, originality_score, technical_quality_score, clarity_score, relevance_score, total_score, comments, review_date)
PresentationScores(id PK, paper_id FK→Papers, coordinator_id FK→Users, ...)
Certificates(id PK, paper_id FK→Papers, user_id FK→Users, certificate_path, generated_date)
Notifications(id PK, user_id FK→Users, message, status, created_at)
```

### New Entities (Advanced Features)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Feature 1: Conflicts                                                        │
│  conflict_id(PK), paper_id(FK→Papers), reviewer_id(FK→Users),               │
│  reason, declared_by(ENUM), created_at                                      │
│  UNIQUE(paper_id, reviewer_id)                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  Feature 2: Bids                                                             │
│  bid_id(PK), paper_id(FK→Papers), reviewer_id(FK→Users),                    │
│  bid_level(ENUM: interested/neutral/not_interested), bid_date               │
│  UNIQUE(paper_id, reviewer_id)                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  Feature 4: Paper_Versions                                                   │
│  version_id(PK), paper_id(FK→Papers), version_number, file_path,            │
│  upload_date, uploaded_by(FK→Users)                                         │
│  UNIQUE(paper_id, version_number)                                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  Feature 5: Review_Discussions                                               │
│  discussion_id(PK), paper_id(FK→Papers), reviewer_id(FK→Users),             │
│  message(TEXT), posted_at                                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  Feature 6: Decisions                                                        │
│  decision_id(PK), paper_id(FK→Papers), decision_type(ENUM),                 │
│  comment(TEXT), decided_by(FK→Users), decided_at                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### SQL Views (Virtual Tables)

```
Feature 3: reviewer_papers VIEW
  → SELECT paper_id, title, abstract, keywords, conference_id, status, version
    FROM Papers JOIN Conferences  (NO author_id — enforces double-blind)

Feature 7: reviewer_workload VIEW
  → SELECT reviewer_id, name, email, COUNT(assigned), COUNT(reviewed)
    FROM Users LEFT JOIN ReviewerAssignments LEFT JOIN Reviews

Feature 8: paper_review_summary VIEW
  → SELECT paper_id, title, status, COUNT(reviews), AVG(total_score), MAX, MIN
    FROM Papers LEFT JOIN Reviews LEFT JOIN Users LEFT JOIN Conferences
```

---

### Entity Relationships

```
Users ──< Papers (author_id)                [1 user : many papers]
Users ──< ReviewerAssignments (reviewer_id)  [1 reviewer : many assignments]
Users ──< Reviews (reviewer_id)              [1 reviewer : many reviews]
Users ──< Conflicts (reviewer_id)            [1 reviewer : many COIs]
Users ──< Bids (reviewer_id)                 [1 reviewer : many bids]
Users ──< Review_Discussions (reviewer_id)   [1 reviewer : many messages]
Users ──< Decisions (decided_by)             [1 admin : many decisions]
Users ──< Paper_Versions (uploaded_by)       [1 user : many uploads]

Papers ──< ReviewerAssignments               [1 paper : many reviewers]
Papers ──< Reviews                           [1 paper : many reviews]
Papers ──< Conflicts                         [1 paper : many COIs]
Papers ──< Bids                              [1 paper : many bids]
Papers ──< Paper_Versions                    [1 paper : many versions]
Papers ──< Review_Discussions                [1 paper : many messages]
Papers ──< Decisions                         [1 paper : many decisions (history)]
Papers ──< Certificates                      [1 paper : 1 certificate]

Conferences ──< Papers                       [1 conference : many papers]
Conferences ──< Users (created_by)           [1 admin creates many conferences]
```

---

## Migration Steps

### Step 1 — Backup existing database

```bash
mysqldump -u root -p cms_db > cms_db_backup_$(date +%Y%m%d).sql
```

### Step 2 — Run the advanced migration script

```bash
mysql -u root -p cms_db < database/migration_advanced.sql
```

Or from MySQL CLI:
```sql
USE cms_db;
SOURCE /path/to/cms/database/migration_advanced.sql;
```

### Step 3 — Verify tables and views

```sql
USE cms_db;

-- Check new tables
SHOW TABLES;
-- Should now include: Conflicts, Bids, Paper_Versions, Review_Discussions, Decisions

-- Check new views
SHOW FULL TABLES WHERE Table_type = 'VIEW';
-- Should show: reviewer_papers, reviewer_workload, paper_review_summary

-- Test reviewer_papers view (double-blind)
SELECT * FROM reviewer_papers LIMIT 5;

-- Test reviewer_workload view
SELECT * FROM reviewer_workload;

-- Test paper_review_summary view
SELECT * FROM paper_review_summary;
```

### Step 4 — Install updated backend dependencies

```bash
cd backend
npm install
```
(No new packages needed — all features use existing mysql2/express stack)

### Step 5 — Start services

```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm start
```

### Step 6 — Verify new API endpoints

```bash
# Test COI endpoint
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/conflicts/mine

# Test bidding
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/bids/open-papers

# Test analytics (admin token)
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/analytics/reviewer-workload

# Test paper summary view
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/analytics/paper-summary
```

---

## Feature Summary

| # | Feature | New Table/View | Modified Files |
|---|---------|---------------|----------------|
| 1 | Conflict of Interest | `Conflicts` table | `adminController.js` (assignReviewer blocked on COI) |
| 2 | Reviewer Bidding | `Bids` table | New: `biddingController.js`, `biddingRoutes.js` |
| 3 | Double Blind Review | `reviewer_papers` VIEW | `reviewController.js` (uses view, no author_id) |
| 4 | Paper Versioning | `Paper_Versions` table | New: `versionController.js`, `versionRoutes.js` |
| 5 | Review Discussion | `Review_Discussions` table | New: `discussionController.js`, `discussionRoutes.js` |
| 6 | Decision Tracking | `Decisions` table | `adminController.js` (makeDecision writes to Decisions) |
| 7 | Workload Monitoring | `reviewer_workload` VIEW | `adminController.js` (limit enforced at 5 papers) |
| 8 | Analytics Views | `paper_review_summary` VIEW | New: `analyticsController.js`, `analyticsRoutes.js` |

---

## Rollback (if needed)

```sql
USE cms_db;

-- Drop new views
DROP VIEW IF EXISTS reviewer_papers;
DROP VIEW IF EXISTS reviewer_workload;
DROP VIEW IF EXISTS paper_review_summary;

-- Drop new tables (in order to respect FK constraints)
DROP TABLE IF EXISTS Review_Discussions;
DROP TABLE IF EXISTS Decisions;
DROP TABLE IF EXISTS Paper_Versions;
DROP TABLE IF EXISTS Bids;
DROP TABLE IF EXISTS Conflicts;
```
