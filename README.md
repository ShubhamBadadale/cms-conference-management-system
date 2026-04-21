# ConferMS

ConferMS is a full-stack conference management system built with React, Node.js, Express, MySQL, and optional MongoDB analytics. This branch includes the advanced-features upgrade: paper version history, reviewer expertise, reviewer suggestions, soft-delete/archive controls, queued decision emails, plagiarism screening, and proceedings generation.

## Project Layout

```text
cms/
|-- schema.sql
|-- sql/
|   |-- advanced_features_migration.sql
|   |-- dbms_showcase.sql
|   `-- dbms_lab_queries.sql
|-- backend/
|   |-- config/
|   |-- controllers/
|   |-- middleware/
|   |-- routes/
|   |-- services/
|   |-- templates/
|   |-- uploads/
|   |-- server.js
|   |-- worker.js
|   `-- .env.example
|-- frontend/
|   |-- public/
|   `-- src/
`-- mongodb/
```

## Advanced Features

- Paper versioning with `PaperVersions` while keeping `Papers.file_path` and `Papers.version` as the latest pointer.
- Normalized `PaperKeywords` and reviewer-managed `ReviewerExpertise`.
- Admin reviewer suggestions ranked by keyword overlap, expertise weight, and workload.
- Simulated plagiarism screening with `flagged_for_review` workflow support.
- Soft-delete/archive controls on users, conferences, and papers through `is_active`.
- Queued HTML decision emails processed by a separate worker.
- Proceedings PDF download that merges the latest active version of accepted papers.

## Database Setup

Run the base schema:

```bash
mysql -u root -p < schema.sql
```

If you are upgrading an existing database, run the migration as well:

```bash
mysql -u root -p cms_db < sql/advanced_features_migration.sql
```

The DBMS showcase script still matters for this repo because the backend already uses procedures and views defined there:

```bash
mysql -u root -p cms_db < sql/dbms_showcase.sql
mysql -u root -p cms_db < sql/dbms_lab_queries.sql
```

## Backend Setup

```bash
cd backend
npm install
copy .env.example .env
```

Important environment variables:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=cms_db
DB_PORT=3306
JWT_SECRET=change_this_secret
JWT_EXPIRE=7d
MONGO_URI=mongodb://127.0.0.1:27017
MONGO_DB_NAME=cms_nosql_showcase
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
SMTP_FROM="ConferMS <no-reply@example.com>"
APP_BASE_URL=http://localhost:3000
EMAIL_CRON_SCHEDULE=*/2 * * * *
EMAIL_BATCH_SIZE=10
EMAIL_MAX_ATTEMPTS=3
PLAGIARISM_FLAG_THRESHOLD=75
```

Start the API:

```bash
npm run dev
```

Start the email worker:

```bash
npm run dev:worker
```

Run both together:

```bash
npm run dev:all
```

## Frontend Setup

```bash
cd frontend
npm install
npm start
```

The frontend expects the backend at `http://localhost:5000` through the existing React proxy.

## Default Admin

The schema seeds one admin account:

- Email: `admin@cms.com`
- Password hash corresponds to `admin123`

## API Additions

New or changed endpoints in the advanced upgrade:

- `GET /api/papers/:id/versions`
- `GET /api/papers/:id/download?version=<n>`
- `GET /api/reviews/expertise`
- `PUT /api/reviews/expertise`
- `GET /api/admin/papers/:paper_id/reviewer-suggestions`
- `PATCH /api/admin/users/:id/active`
- `PATCH /api/admin/conferences/:id/active`
- `PATCH /api/admin/papers/:id/active`
- `GET /api/admin/conferences/:conference_id/proceedings/download`

Paper submit and resubmit responses now include:

- `status`
- `version`
- `plagiarism`

## Workflow Notes

- Public and author flows ignore inactive conferences and papers.
- Admin screens keep archived records visible and allow reactivation.
- Decision notifications still create in-app notifications and now also enqueue emails.
- Proceedings merge the latest active paper version for accepted papers only.

## MongoDB Analytics

Optional NoSQL analytics are still available through:

```bash
GET /api/nosql/analytics
```

Seed and inspect the MongoDB showcase with:

```bash
mongosh mongodb/cms_mongodb_showcase.js
```
