-- ConferMS DBMS Lab Queries
-- Run after schema.sql and sql/dbms_showcase.sql.
-- These examples are intentionally readable for practical/viva demonstration.

USE cms_db;

-- ---------------------------------------------------------------------------
-- Experiment 3: SELECT, WHERE operators, functions, GROUP BY, HAVING, SET
-- ---------------------------------------------------------------------------

-- Conditional/logical operators, LIKE, IN, BETWEEN, NULL checks, ORDER BY.
SELECT
  p.id,
  p.title,
  p.status,
  c.title AS conference_title,
  DATE_FORMAT(p.created_at, '%d-%b-%Y') AS submitted_on
FROM Papers p
JOIN Conferences c ON c.id = p.conference_id
WHERE (p.status IN ('submitted', 'under_review', 'revision'))
  AND (p.title LIKE '%data%' OR p.keywords LIKE '%database%')
  AND p.created_at BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 1 YEAR) AND CURRENT_TIMESTAMP
  AND p.file_path IS NOT NULL
ORDER BY p.created_at DESC;

-- String, date, numeric, and aggregate functions.
SELECT
  c.id AS conference_id,
  UPPER(c.title) AS conference_name,
  COALESCE(c.venue, 'Online') AS venue,
  DATEDIFF(c.submission_deadline, CURRENT_DATE()) AS days_left,
  COUNT(p.id) AS total_papers,
  ROUND(AVG(r.total_score), 2) AS avg_review_score
FROM Conferences c
LEFT JOIN Papers p ON p.conference_id = c.id
LEFT JOIN Reviews r ON r.paper_id = p.id
GROUP BY c.id, c.title, c.venue, c.submission_deadline
HAVING COUNT(p.id) >= 0
ORDER BY days_left ASC;

-- Set operator: all research-active people from authors and reviewers.
SELECT author_id AS user_id, author_name AS user_name, 'author' AS source_role
FROM vw_paper_review_summary
UNION
SELECT reviewer_id, reviewer_name, 'reviewer'
FROM vw_reviewer_workload;

-- ---------------------------------------------------------------------------
-- Experiment 4: joins and subqueries
-- ---------------------------------------------------------------------------

-- Equijoin: papers with author and conference.
SELECT p.id, p.title, u.name AS author_name, c.title AS conference_title
FROM Papers p
JOIN Users u ON u.id = p.author_id
JOIN Conferences c ON c.id = p.conference_id;

-- Non-equijoin: sessions where room capacity is larger than scheduled papers.
SELECT
  s.session_title,
  cr.room_name,
  cr.capacity,
  COUNT(sp.paper_id) AS scheduled_papers
FROM ConferenceSessions s
JOIN ConferenceRooms cr ON cr.id = s.room_id
LEFT JOIN SessionPapers sp ON sp.session_id = s.id
GROUP BY s.id, s.session_title, cr.room_name, cr.capacity
HAVING cr.capacity > COUNT(sp.paper_id);

-- Self join: topic hierarchy.
SELECT child.name AS topic, parent.name AS parent_topic
FROM Topics child
LEFT JOIN Topics parent ON parent.id = child.parent_topic_id;

-- Outer join: all reviewers, including those without assignments.
SELECT
  u.id,
  u.name,
  COUNT(ra.paper_id) AS assigned_papers
FROM Users u
LEFT JOIN ReviewerAssignments ra ON ra.reviewer_id = u.id
WHERE u.role = 'reviewer'
GROUP BY u.id, u.name;

-- Single-row subquery: papers above the global average review score.
SELECT paper_id, paper_title, avg_review_score
FROM vw_paper_review_summary
WHERE avg_review_score > (
  SELECT AVG(total_score)
  FROM Reviews
);

-- Multiple-row subquery with IN: papers from published conferences.
SELECT id, title, status
FROM Papers
WHERE conference_id IN (
  SELECT id
  FROM Conferences
  WHERE status = 'published'
);

-- Correlated subquery with EXISTS: authors who have at least one accepted paper.
SELECT u.id, u.name, u.email
FROM Users u
WHERE u.role = 'author'
  AND EXISTS (
    SELECT 1
    FROM Papers p
    WHERE p.author_id = u.id
      AND p.status = 'accepted'
  );

-- ANY/ALL examples.
SELECT id, title
FROM Papers
WHERE id = ANY (
  SELECT paper_id
  FROM Reviews
  WHERE total_score >= 8
);

SELECT paper_id, paper_title, avg_review_score
FROM vw_paper_review_summary
WHERE avg_review_score >= ALL (
  SELECT COALESCE(avg_review_score, 0)
  FROM vw_paper_review_summary
);

-- DML with a subquery inside a transaction; ROLLBACK keeps demo data unchanged.
START TRANSACTION;
UPDATE Notifications
SET status = 'read'
WHERE user_id IN (
  SELECT id
  FROM Users
  WHERE role = 'author'
);
ROLLBACK;

-- ---------------------------------------------------------------------------
-- PL/SQL-equivalent concepts in MySQL: procedures, functions, triggers, cursor
-- ---------------------------------------------------------------------------

-- Stored function.
SELECT
  p.id,
  p.title,
  fn_paper_review_average(p.id) AS avg_review_score,
  fn_acceptance_band(fn_paper_review_average(p.id)) AS recommendation
FROM Papers p;

-- Stored procedure with a cursor.
CALL sp_reviewer_workload_cursor(NULL);

-- Transactional stored procedure examples. Replace ids with live ids.
-- CALL sp_assign_reviewer_atomic(1, 2, 1);
-- CALL sp_submit_review_atomic(1, 2, 8, 9, 7, 8, 'Strong technical contribution.');
-- CALL sp_make_paper_decision_atomic(1, 'accepted', 1);

-- Trigger evidence: these tables are populated automatically by triggers.
SELECT * FROM PaperStatusHistory ORDER BY changed_at DESC;
SELECT * FROM AuditLog ORDER BY created_at DESC;

-- ---------------------------------------------------------------------------
-- Experiment 8: views and update restrictions
-- ---------------------------------------------------------------------------

-- Updatable single-table view.
SELECT * FROM vw_updatable_draft_conferences;

-- This works only for rows that remain status='draft' because of CHECK OPTION.
-- UPDATE vw_updatable_draft_conferences
-- SET venue = 'Seminar Hall 1'
-- WHERE id = 1;

-- Multi-table aggregate view: useful for reporting, not updatable.
SELECT * FROM vw_non_updatable_submission_detail;

-- ---------------------------------------------------------------------------
-- Query processing, indexing, and optimization
-- ---------------------------------------------------------------------------

SHOW INDEX FROM Papers;

EXPLAIN
SELECT p.id, p.title, p.status
FROM Papers p
WHERE p.conference_id = 1
  AND p.status = 'under_review'
ORDER BY p.created_at DESC;

EXPLAIN
SELECT *
FROM Papers
WHERE MATCH(title, abstract, keywords) AGAINST ('database management' IN NATURAL LANGUAGE MODE);

-- ---------------------------------------------------------------------------
-- Relational algebra mapping examples
-- ---------------------------------------------------------------------------

-- Selection sigma(status='accepted')(Papers)
SELECT * FROM Papers WHERE status = 'accepted';

-- Projection pi(title,status)(Papers)
SELECT title, status FROM Papers;

-- Join Papers bowtie Users on author_id=id
SELECT p.title, u.name
FROM Papers p
JOIN Users u ON u.id = p.author_id;

-- Division-style query: reviewers who reviewed every paper assigned to them.
SELECT u.id, u.name
FROM Users u
WHERE u.role = 'reviewer'
  AND NOT EXISTS (
    SELECT 1
    FROM ReviewerAssignments ra
    WHERE ra.reviewer_id = u.id
      AND NOT EXISTS (
        SELECT 1
        FROM Reviews r
        WHERE r.reviewer_id = ra.reviewer_id
          AND r.paper_id = ra.paper_id
      )
  );

-- ---------------------------------------------------------------------------
-- DCL reference. Run as a privileged DBA user only.
-- ---------------------------------------------------------------------------
-- CREATE ROLE IF NOT EXISTS cms_readonly_role;
-- GRANT SELECT ON cms_db.vw_conference_catalog TO cms_readonly_role;
-- GRANT SELECT ON cms_db.vw_paper_review_summary TO cms_readonly_role;
-- CREATE USER IF NOT EXISTS 'cms_demo_reader'@'localhost' IDENTIFIED BY 'ChangeMe#123';
-- GRANT cms_readonly_role TO 'cms_demo_reader'@'localhost';
-- SET DEFAULT ROLE cms_readonly_role TO 'cms_demo_reader'@'localhost';

