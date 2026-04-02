-- =============================================================================
-- ConferMS Advanced DBMS Features Migration
-- Run AFTER the base schema.sql has been executed
-- File: database/migration_advanced.sql
-- =============================================================================

USE cms_db;

-- =============================================================================
-- FEATURE 1: Conflict of Interest (COI) System
-- =============================================================================
CREATE TABLE IF NOT EXISTS Conflicts (
  conflict_id   INT AUTO_INCREMENT PRIMARY KEY,
  paper_id      INT NOT NULL,
  reviewer_id   INT NOT NULL,
  reason        TEXT,
  declared_by   ENUM('reviewer', 'admin') DEFAULT 'reviewer',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (paper_id)    REFERENCES Papers(id)   ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES Users(id)    ON DELETE CASCADE,
  UNIQUE KEY unique_conflict (paper_id, reviewer_id)
);

-- =============================================================================
-- FEATURE 2: Reviewer Bidding System
-- =============================================================================
CREATE TABLE IF NOT EXISTS Bids (
  bid_id      INT AUTO_INCREMENT PRIMARY KEY,
  paper_id    INT NOT NULL,
  reviewer_id INT NOT NULL,
  bid_level   ENUM('interested', 'neutral', 'not_interested') NOT NULL DEFAULT 'neutral',
  bid_date    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (paper_id)    REFERENCES Papers(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES Users(id)  ON DELETE CASCADE,
  UNIQUE KEY unique_bid (paper_id, reviewer_id)
);

-- =============================================================================
-- FEATURE 3: Double Blind Review — SQL View (hides author identity)
-- =============================================================================
CREATE OR REPLACE VIEW reviewer_papers AS
  SELECT
    p.id          AS paper_id,
    p.title,
    p.abstract,
    p.keywords,
    p.conference_id,
    p.status,
    p.version,
    c.title       AS conference_title
  FROM Papers p
  JOIN Conferences c ON p.conference_id = c.id;

-- =============================================================================
-- FEATURE 4: Paper Versioning Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS Paper_Versions (
  version_id     INT AUTO_INCREMENT PRIMARY KEY,
  paper_id       INT NOT NULL,
  version_number INT NOT NULL,
  file_path      VARCHAR(500) NOT NULL,
  upload_date    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  uploaded_by    INT,                              -- author user id
  FOREIGN KEY (paper_id)    REFERENCES Papers(id)  ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES Users(id)   ON DELETE SET NULL,
  UNIQUE KEY unique_paper_version (paper_id, version_number)
);

-- =============================================================================
-- FEATURE 5: Review Discussion System
-- =============================================================================
CREATE TABLE IF NOT EXISTS Review_Discussions (
  discussion_id INT AUTO_INCREMENT PRIMARY KEY,
  paper_id      INT NOT NULL,
  reviewer_id   INT NOT NULL,
  message       TEXT NOT NULL,
  posted_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (paper_id)    REFERENCES Papers(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES Users(id)  ON DELETE CASCADE
);

-- =============================================================================
-- FEATURE 6: Decision Tracking Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS Decisions (
  decision_id   INT AUTO_INCREMENT PRIMARY KEY,
  paper_id      INT NOT NULL,
  decision_type ENUM('accepted', 'rejected', 'revision') NOT NULL,
  comment       TEXT,
  decided_by    INT NOT NULL,               -- admin user id
  decided_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (paper_id)   REFERENCES Papers(id) ON DELETE CASCADE,
  FOREIGN KEY (decided_by) REFERENCES Users(id)  ON DELETE CASCADE
);

-- =============================================================================
-- FEATURE 7: Reviewer Workload — Monitoring View
-- =============================================================================
CREATE OR REPLACE VIEW reviewer_workload AS
  SELECT
    u.id          AS reviewer_id,
    u.name        AS reviewer_name,
    u.email,
    u.institution,
    COUNT(ra.id)  AS assigned_papers,
    COALESCE(SUM(CASE WHEN rev.id IS NOT NULL THEN 1 ELSE 0 END), 0) AS reviewed_papers
  FROM Users u
  LEFT JOIN ReviewerAssignments ra  ON u.id = ra.reviewer_id
  LEFT JOIN Reviews            rev  ON u.id = rev.reviewer_id AND ra.paper_id = rev.paper_id
  WHERE u.role = 'reviewer'
  GROUP BY u.id, u.name, u.email, u.institution;

-- =============================================================================
-- FEATURE 8: Analytics View — Paper Review Summary
-- =============================================================================
CREATE OR REPLACE VIEW paper_review_summary AS
  SELECT
    p.id                              AS paper_id,
    p.title,
    p.status,
    p.conference_id,
    c.title                           AS conference_title,
    u.name                            AS author_name,
    COUNT(r.id)                       AS total_reviews,
    ROUND(AVG(r.total_score), 2)      AS average_score,
    MAX(r.total_score)                AS highest_score,
    MIN(r.total_score)                AS lowest_score
  FROM Papers p
  LEFT JOIN Reviews     r ON p.id = r.paper_id
  LEFT JOIN Users       u ON p.author_id = u.id
  LEFT JOIN Conferences c ON p.conference_id = c.id
  GROUP BY p.id, p.title, p.status, p.conference_id, c.title, u.name;

-- =============================================================================
-- Useful standalone workload query (Feature 7 alternative raw SQL)
-- =============================================================================
-- SELECT reviewer_id, COUNT(*) AS assigned_papers
-- FROM ReviewerAssignments
-- GROUP BY reviewer_id;
-- =============================================================================
