-- DBMS Showcase Layer for ConferMS
-- Run after schema.sql:
--   mysql -u root -p cms_db < sql/dbms_showcase.sql
--
-- This script keeps the existing application tables compatible while adding
-- normalized relations, indexes, views, triggers, stored routines, transactions,
-- audit trails, warehouse-style summaries, and distributed/security metadata.

USE cms_db;

-- ---------------------------------------------------------------------------
-- 1. Normalized extension tables: 1NF/2NF/3NF/BCNF, MVD handling, EER concepts
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS Institutions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'India',
  institution_type ENUM('university', 'industry', 'research_lab', 'government', 'other') DEFAULT 'university',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_institutions_name (name)
);

CREATE TABLE IF NOT EXISTS Topics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  parent_topic_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_topics_name (name),
  CONSTRAINT fk_topics_parent
    FOREIGN KEY (parent_topic_id) REFERENCES Topics(id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ConferenceTopics (
  conference_id INT NOT NULL,
  topic_id INT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (conference_id, topic_id),
  CONSTRAINT fk_conference_topics_conference
    FOREIGN KEY (conference_id) REFERENCES Conferences(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_conference_topics_topic
    FOREIGN KEY (topic_id) REFERENCES Topics(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS PaperAuthors (
  paper_id INT NOT NULL,
  user_id INT NOT NULL,
  author_order INT NOT NULL,
  is_corresponding BOOLEAN DEFAULT FALSE,
  affiliation VARCHAR(200),
  contribution_note VARCHAR(255),
  PRIMARY KEY (paper_id, user_id),
  UNIQUE KEY uq_paper_authors_order (paper_id, author_order),
  CONSTRAINT chk_paper_authors_order CHECK (author_order > 0),
  CONSTRAINT fk_paper_authors_paper
    FOREIGN KEY (paper_id) REFERENCES Papers(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_paper_authors_user
    FOREIGN KEY (user_id) REFERENCES Users(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS PaperKeywords (
  paper_id INT NOT NULL,
  keyword VARCHAR(80) NOT NULL,
  PRIMARY KEY (paper_id, keyword),
  CONSTRAINT chk_paper_keywords_value CHECK (TRIM(keyword) <> ''),
  CONSTRAINT fk_paper_keywords_paper
    FOREIGN KEY (paper_id) REFERENCES Papers(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ReviewerExpertise (
  reviewer_id INT NOT NULL,
  topic_id INT NOT NULL,
  expertise_level ENUM('basic', 'intermediate', 'expert') DEFAULT 'intermediate',
  years_experience DECIMAL(4,1) DEFAULT 0,
  PRIMARY KEY (reviewer_id, topic_id),
  CONSTRAINT chk_reviewer_experience CHECK (years_experience >= 0),
  CONSTRAINT fk_reviewer_expertise_user
    FOREIGN KEY (reviewer_id) REFERENCES Users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_reviewer_expertise_topic
    FOREIGN KEY (topic_id) REFERENCES Topics(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ConferenceCommittee (
  conference_id INT NOT NULL,
  user_id INT NOT NULL,
  committee_role ENUM('chair', 'co_chair', 'technical_program_member', 'publication_chair', 'coordinator') NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (conference_id, user_id, committee_role),
  CONSTRAINT fk_committee_conference
    FOREIGN KEY (conference_id) REFERENCES Conferences(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_committee_user
    FOREIGN KEY (user_id) REFERENCES Users(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ReviewCriteria (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(30) NOT NULL,
  criterion_name VARCHAR(100) NOT NULL,
  max_score TINYINT NOT NULL DEFAULT 10,
  weight DECIMAL(5,2) NOT NULL DEFAULT 0.25,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE KEY uq_review_criteria_code (code),
  CONSTRAINT chk_review_criteria_score CHECK (max_score BETWEEN 1 AND 10),
  CONSTRAINT chk_review_criteria_weight CHECK (weight >= 0)
);

CREATE TABLE IF NOT EXISTS ReviewCriteriaScores (
  review_id INT NOT NULL,
  criterion_id INT NOT NULL,
  score DECIMAL(5,2) NOT NULL,
  remarks VARCHAR(255),
  PRIMARY KEY (review_id, criterion_id),
  CONSTRAINT chk_review_criteria_scores_score CHECK (score BETWEEN 0 AND 10),
  CONSTRAINT fk_criteria_scores_review
    FOREIGN KEY (review_id) REFERENCES Reviews(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_criteria_scores_criterion
    FOREIGN KEY (criterion_id) REFERENCES ReviewCriteria(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS PaperFiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  paper_id INT NOT NULL,
  version INT NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_hash CHAR(64),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE KEY uq_paper_files_version (paper_id, version),
  CONSTRAINT chk_paper_files_version CHECK (version > 0),
  CONSTRAINT fk_paper_files_paper
    FOREIGN KEY (paper_id) REFERENCES Papers(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS PaperStatusHistory (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  paper_id INT NOT NULL,
  old_status ENUM('submitted','under_review','revision','accepted','rejected') NULL,
  new_status ENUM('submitted','under_review','revision','accepted','rejected') NOT NULL,
  changed_by INT NULL,
  reason VARCHAR(255),
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_status_history_paper
    FOREIGN KEY (paper_id) REFERENCES Papers(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_status_history_user
    FOREIGN KEY (changed_by) REFERENCES Users(id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS AuditLog (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  entity_type VARCHAR(80) NOT NULL,
  entity_id INT NOT NULL,
  action VARCHAR(80) NOT NULL,
  details JSON,
  actor_user_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_entity (entity_type, entity_id, created_at),
  CONSTRAINT fk_audit_actor
    FOREIGN KEY (actor_user_id) REFERENCES Users(id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ConferenceRooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conference_id INT NOT NULL,
  room_name VARCHAR(100) NOT NULL,
  capacity INT NOT NULL,
  location VARCHAR(200),
  UNIQUE KEY uq_conference_room (conference_id, room_name),
  CONSTRAINT chk_room_capacity CHECK (capacity > 0),
  CONSTRAINT fk_rooms_conference
    FOREIGN KEY (conference_id) REFERENCES Conferences(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ConferenceSessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conference_id INT NOT NULL,
  room_id INT NULL,
  topic_id INT NULL,
  session_title VARCHAR(200) NOT NULL,
  session_type ENUM('technical', 'keynote', 'workshop', 'poster', 'panel') DEFAULT 'technical',
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  chair_id INT NULL,
  CONSTRAINT chk_session_time CHECK (ends_at > starts_at),
  CONSTRAINT fk_sessions_conference
    FOREIGN KEY (conference_id) REFERENCES Conferences(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_sessions_room
    FOREIGN KEY (room_id) REFERENCES ConferenceRooms(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_sessions_topic
    FOREIGN KEY (topic_id) REFERENCES Topics(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_sessions_chair
    FOREIGN KEY (chair_id) REFERENCES Users(id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS SessionPapers (
  session_id INT NOT NULL,
  paper_id INT NOT NULL,
  presentation_order INT NOT NULL,
  allocated_minutes INT DEFAULT 15,
  PRIMARY KEY (session_id, paper_id),
  UNIQUE KEY uq_session_paper_order (session_id, presentation_order),
  CONSTRAINT chk_session_order CHECK (presentation_order > 0),
  CONSTRAINT chk_session_minutes CHECK (allocated_minutes > 0),
  CONSTRAINT fk_session_papers_session
    FOREIGN KEY (session_id) REFERENCES ConferenceSessions(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_session_papers_paper
    FOREIGN KEY (paper_id) REFERENCES Papers(id)
    ON DELETE CASCADE
);

-- Distributed database metadata: site catalog, fragments/shards, replication log.
CREATE TABLE IF NOT EXISTS Sites (
  site_code VARCHAR(20) PRIMARY KEY,
  site_name VARCHAR(100) NOT NULL,
  region VARCHAR(100) NOT NULL,
  endpoint_url VARCHAR(255),
  site_type ENUM('primary', 'read_replica', 'analytics', 'backup') DEFAULT 'read_replica',
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS ConferenceSites (
  conference_id INT NOT NULL,
  site_code VARCHAR(20) NOT NULL,
  fragment_type ENUM('horizontal', 'vertical', 'replicated') DEFAULT 'replicated',
  shard_key VARCHAR(80) DEFAULT 'conference_id',
  PRIMARY KEY (conference_id, site_code),
  CONSTRAINT fk_conference_sites_conference
    FOREIGN KEY (conference_id) REFERENCES Conferences(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_conference_sites_site
    FOREIGN KEY (site_code) REFERENCES Sites(site_code)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ReplicationLog (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  source_site VARCHAR(20) NOT NULL,
  target_site VARCHAR(20) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id INT NOT NULL,
  operation ENUM('insert', 'update', 'delete', 'snapshot') NOT NULL,
  status ENUM('queued', 'sent', 'applied', 'failed') DEFAULT 'queued',
  occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  applied_at TIMESTAMP NULL,
  CONSTRAINT fk_replication_source
    FOREIGN KEY (source_site) REFERENCES Sites(site_code),
  CONSTRAINT fk_replication_target
    FOREIGN KEY (target_site) REFERENCES Sites(site_code)
);

-- Warehouse snapshot table for OLAP-style reporting over OLTP data.
CREATE TABLE IF NOT EXISTS ConferenceMetricSnapshots (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  conference_id INT NOT NULL,
  total_papers INT NOT NULL DEFAULT 0,
  accepted_papers INT NOT NULL DEFAULT 0,
  rejected_papers INT NOT NULL DEFAULT 0,
  revision_papers INT NOT NULL DEFAULT 0,
  under_review_papers INT NOT NULL DEFAULT 0,
  avg_review_score DECIMAL(5,2),
  avg_presentation_score DECIMAL(5,2),
  snapshot_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_metric_snapshots_conference
    FOREIGN KEY (conference_id) REFERENCES Conferences(id)
    ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- 2. Seed lookup rows and backfill normalized tables from the existing schema
-- ---------------------------------------------------------------------------

INSERT IGNORE INTO Institutions (name)
SELECT DISTINCT TRIM(institution)
FROM Users
WHERE institution IS NOT NULL AND TRIM(institution) <> '';

INSERT IGNORE INTO ReviewCriteria (code, criterion_name, max_score, weight) VALUES
('ORIG', 'Originality', 10, 0.25),
('TECH', 'Technical Quality', 10, 0.25),
('CLAR', 'Clarity', 10, 0.25),
('REL', 'Relevance', 10, 0.25);

INSERT IGNORE INTO Sites (site_code, site_name, region, endpoint_url, site_type) VALUES
('MAIN', 'Primary Campus Database', 'India-West', 'mysql://primary.cms.local', 'primary'),
('READ1', 'Read Replica for Reviewers', 'India-North', 'mysql://read1.cms.local', 'read_replica'),
('OLAP', 'Analytics Warehouse Node', 'India-Central', 'mysql://olap.cms.local', 'analytics');

INSERT IGNORE INTO PaperAuthors (paper_id, user_id, author_order, is_corresponding, affiliation)
SELECT p.id, p.author_id, 1, TRUE, u.institution
FROM Papers p
JOIN Users u ON u.id = p.author_id;

INSERT IGNORE INTO PaperFiles (paper_id, version, file_path, is_active)
SELECT id, version, file_path, TRUE
FROM Papers
WHERE file_path IS NOT NULL;

INSERT IGNORE INTO PaperStatusHistory (paper_id, old_status, new_status, reason)
SELECT p.id, NULL, p.status, 'Initial history backfill'
FROM Papers p
WHERE NOT EXISTS (
  SELECT 1
  FROM PaperStatusHistory h
  WHERE h.paper_id = p.id
    AND h.old_status IS NULL
    AND h.reason = 'Initial history backfill'
);

INSERT INTO ReviewCriteriaScores (review_id, criterion_id, score)
SELECT
  r.id,
  rc.id,
  CASE rc.code
    WHEN 'ORIG' THEN r.originality_score
    WHEN 'TECH' THEN r.technical_quality_score
    WHEN 'CLAR' THEN r.clarity_score
    WHEN 'REL' THEN r.relevance_score
  END AS score
FROM Reviews r
JOIN ReviewCriteria rc ON rc.code IN ('ORIG', 'TECH', 'CLAR', 'REL')
WHERE r.originality_score IS NOT NULL
  AND r.technical_quality_score IS NOT NULL
  AND r.clarity_score IS NOT NULL
  AND r.relevance_score IS NOT NULL
ON DUPLICATE KEY UPDATE score = VALUES(score);

-- ---------------------------------------------------------------------------
-- 3. Indexes: single-level/composite/full-text indexes for query optimization
-- ---------------------------------------------------------------------------

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_add_index_if_missing$$
CREATE PROCEDURE sp_add_index_if_missing(
  IN p_table_name VARCHAR(64),
  IN p_index_name VARCHAR(64),
  IN p_ddl TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = p_table_name
      AND index_name = p_index_name
  ) THEN
    SET @ddl = p_ddl;
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$

DELIMITER ;

CALL sp_add_index_if_missing('Conferences', 'idx_conferences_status_deadline',
  'CREATE INDEX idx_conferences_status_deadline ON Conferences(status, submission_deadline)');
CALL sp_add_index_if_missing('Papers', 'idx_papers_conference_status_created',
  'CREATE INDEX idx_papers_conference_status_created ON Papers(conference_id, status, created_at)');
CALL sp_add_index_if_missing('Papers', 'idx_papers_author_status',
  'CREATE INDEX idx_papers_author_status ON Papers(author_id, status)');
CALL sp_add_index_if_missing('Papers', 'idx_papers_fulltext',
  'CREATE FULLTEXT INDEX idx_papers_fulltext ON Papers(title, abstract, keywords)');
CALL sp_add_index_if_missing('Reviews', 'uq_reviews_paper_reviewer',
  'CREATE UNIQUE INDEX uq_reviews_paper_reviewer ON Reviews(paper_id, reviewer_id)');
CALL sp_add_index_if_missing('Reviews', 'idx_reviews_reviewer_date',
  'CREATE INDEX idx_reviews_reviewer_date ON Reviews(reviewer_id, review_date)');
CALL sp_add_index_if_missing('PresentationScores', 'uq_presentation_paper_coordinator',
  'CREATE UNIQUE INDEX uq_presentation_paper_coordinator ON PresentationScores(paper_id, coordinator_id)');
CALL sp_add_index_if_missing('Certificates', 'uq_certificates_paper_user',
  'CREATE UNIQUE INDEX uq_certificates_paper_user ON Certificates(paper_id, user_id)');
CALL sp_add_index_if_missing('Notifications', 'idx_notifications_user_status_created',
  'CREATE INDEX idx_notifications_user_status_created ON Notifications(user_id, status, created_at)');

DROP PROCEDURE IF EXISTS sp_add_index_if_missing;

-- ---------------------------------------------------------------------------
-- 4. Stored functions: single-row SQL logic and reusable computed attributes
-- ---------------------------------------------------------------------------

DELIMITER $$

DROP FUNCTION IF EXISTS fn_paper_review_average$$
CREATE FUNCTION fn_paper_review_average(p_paper_id INT)
RETURNS DECIMAL(5,2)
READS SQL DATA
BEGIN
  DECLARE v_avg DECIMAL(5,2);

  SELECT ROUND(AVG(total_score), 2)
  INTO v_avg
  FROM Reviews
  WHERE paper_id = p_paper_id;

  RETURN COALESCE(v_avg, 0.00);
END$$

DROP FUNCTION IF EXISTS fn_days_until_deadline$$
CREATE FUNCTION fn_days_until_deadline(p_conference_id INT)
RETURNS INT
READS SQL DATA
BEGIN
  DECLARE v_days INT;

  SELECT DATEDIFF(submission_deadline, CURRENT_DATE())
  INTO v_days
  FROM Conferences
  WHERE id = p_conference_id;

  RETURN v_days;
END$$

DROP FUNCTION IF EXISTS fn_acceptance_band$$
CREATE FUNCTION fn_acceptance_band(p_score DECIMAL(5,2))
RETURNS VARCHAR(30)
DETERMINISTIC
BEGIN
  RETURN CASE
    WHEN p_score >= 8.50 THEN 'Strong Accept'
    WHEN p_score >= 7.00 THEN 'Accept'
    WHEN p_score >= 5.00 THEN 'Borderline'
    WHEN p_score > 0 THEN 'Reject'
    ELSE 'Not Reviewed'
  END;
END$$

DROP FUNCTION IF EXISTS fn_final_weighted_score$$
CREATE FUNCTION fn_final_weighted_score(p_paper_id INT)
RETURNS DECIMAL(5,2)
READS SQL DATA
BEGIN
  DECLARE v_review_avg DECIMAL(5,2);
  DECLARE v_presentation_avg DECIMAL(5,2);

  SELECT ROUND(AVG(total_score), 2)
  INTO v_review_avg
  FROM Reviews
  WHERE paper_id = p_paper_id;

  SELECT ROUND(AVG(total_score), 2)
  INTO v_presentation_avg
  FROM PresentationScores
  WHERE paper_id = p_paper_id;

  RETURN ROUND((COALESCE(v_review_avg, 0) * 0.70) + (COALESCE(v_presentation_avg, 0) * 0.30), 2);
END$$

-- ---------------------------------------------------------------------------
-- 5. Triggers: derived data, constraints, audit/recovery trail
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_papers_after_insert$$
CREATE TRIGGER trg_papers_after_insert
AFTER INSERT ON Papers
FOR EACH ROW
BEGIN
  INSERT IGNORE INTO PaperAuthors (paper_id, user_id, author_order, is_corresponding)
  VALUES (NEW.id, NEW.author_id, 1, TRUE);

  IF NEW.file_path IS NOT NULL THEN
    INSERT IGNORE INTO PaperFiles (paper_id, version, file_path, is_active)
    VALUES (NEW.id, NEW.version, NEW.file_path, TRUE);
  END IF;

  INSERT INTO PaperStatusHistory (paper_id, old_status, new_status, reason)
  VALUES (NEW.id, NULL, NEW.status, 'Paper submitted');

  INSERT INTO AuditLog (entity_type, entity_id, action, details, actor_user_id)
  VALUES (
    'Paper',
    NEW.id,
    'INSERT',
    JSON_OBJECT('title', NEW.title, 'status', NEW.status, 'version', NEW.version),
    NEW.author_id
  );
END$$

DROP TRIGGER IF EXISTS trg_papers_after_update$$
CREATE TRIGGER trg_papers_after_update
AFTER UPDATE ON Papers
FOR EACH ROW
BEGIN
  IF NOT (OLD.status <=> NEW.status) THEN
    INSERT INTO PaperStatusHistory (paper_id, old_status, new_status, reason)
    VALUES (NEW.id, OLD.status, NEW.status, 'Status updated');
  END IF;

  IF (NOT (OLD.version <=> NEW.version) OR NOT (OLD.file_path <=> NEW.file_path))
     AND NEW.file_path IS NOT NULL THEN
    INSERT IGNORE INTO PaperFiles (paper_id, version, file_path, is_active)
    VALUES (NEW.id, NEW.version, NEW.file_path, TRUE);
  END IF;

  IF NOT (OLD.status <=> NEW.status)
     OR NOT (OLD.version <=> NEW.version)
     OR NOT (OLD.file_path <=> NEW.file_path) THEN
    INSERT INTO AuditLog (entity_type, entity_id, action, details, actor_user_id)
    VALUES (
      'Paper',
      NEW.id,
      'UPDATE',
      JSON_OBJECT(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'old_version', OLD.version,
        'new_version', NEW.version
      ),
      NEW.author_id
    );
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_reviews_before_insert$$
CREATE TRIGGER trg_reviews_before_insert
BEFORE INSERT ON Reviews
FOR EACH ROW
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM Users
    WHERE id = NEW.reviewer_id AND role = 'reviewer'
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Only users with reviewer role can submit reviews';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM ReviewerAssignments
    WHERE paper_id = NEW.paper_id AND reviewer_id = NEW.reviewer_id
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Reviewer must be assigned before submitting a review';
  END IF;

  IF NEW.originality_score IS NULL
     OR NEW.technical_quality_score IS NULL
     OR NEW.clarity_score IS NULL
     OR NEW.relevance_score IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'All review criteria scores are required';
  END IF;

  SET NEW.total_score = ROUND((
    NEW.originality_score +
    NEW.technical_quality_score +
    NEW.clarity_score +
    NEW.relevance_score
  ) / 4, 2);
END$$

DROP TRIGGER IF EXISTS trg_reviews_before_update$$
CREATE TRIGGER trg_reviews_before_update
BEFORE UPDATE ON Reviews
FOR EACH ROW
BEGIN
  IF NEW.originality_score IS NULL
     OR NEW.technical_quality_score IS NULL
     OR NEW.clarity_score IS NULL
     OR NEW.relevance_score IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'All review criteria scores are required';
  END IF;

  SET NEW.total_score = ROUND((
    NEW.originality_score +
    NEW.technical_quality_score +
    NEW.clarity_score +
    NEW.relevance_score
  ) / 4, 2);
END$$

DROP TRIGGER IF EXISTS trg_reviews_after_insert$$
CREATE TRIGGER trg_reviews_after_insert
AFTER INSERT ON Reviews
FOR EACH ROW
BEGIN
  INSERT INTO ReviewCriteriaScores (review_id, criterion_id, score)
  SELECT NEW.id, rc.id,
    CASE rc.code
      WHEN 'ORIG' THEN NEW.originality_score
      WHEN 'TECH' THEN NEW.technical_quality_score
      WHEN 'CLAR' THEN NEW.clarity_score
      WHEN 'REL' THEN NEW.relevance_score
    END
  FROM ReviewCriteria rc
  WHERE rc.code IN ('ORIG', 'TECH', 'CLAR', 'REL')
  ON DUPLICATE KEY UPDATE score = VALUES(score);

  INSERT INTO AuditLog (entity_type, entity_id, action, details, actor_user_id)
  VALUES (
    'Review',
    NEW.id,
    'INSERT',
    JSON_OBJECT('paper_id', NEW.paper_id, 'total_score', NEW.total_score),
    NEW.reviewer_id
  );
END$$

DROP TRIGGER IF EXISTS trg_reviews_after_update$$
CREATE TRIGGER trg_reviews_after_update
AFTER UPDATE ON Reviews
FOR EACH ROW
BEGIN
  INSERT INTO ReviewCriteriaScores (review_id, criterion_id, score)
  SELECT NEW.id, rc.id,
    CASE rc.code
      WHEN 'ORIG' THEN NEW.originality_score
      WHEN 'TECH' THEN NEW.technical_quality_score
      WHEN 'CLAR' THEN NEW.clarity_score
      WHEN 'REL' THEN NEW.relevance_score
    END
  FROM ReviewCriteria rc
  WHERE rc.code IN ('ORIG', 'TECH', 'CLAR', 'REL')
  ON DUPLICATE KEY UPDATE score = VALUES(score);

  INSERT INTO AuditLog (entity_type, entity_id, action, details, actor_user_id)
  VALUES (
    'Review',
    NEW.id,
    'UPDATE',
    JSON_OBJECT('old_total_score', OLD.total_score, 'new_total_score', NEW.total_score),
    NEW.reviewer_id
  );
END$$

DROP TRIGGER IF EXISTS trg_presentation_before_insert$$
CREATE TRIGGER trg_presentation_before_insert
BEFORE INSERT ON PresentationScores
FOR EACH ROW
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM Users
    WHERE id = NEW.coordinator_id AND role = 'coordinator'
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Only coordinators can score presentations';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM Papers
    WHERE id = NEW.paper_id AND status = 'accepted'
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Only accepted papers can receive presentation scores';
  END IF;

  SET NEW.total_score = ROUND((
    NEW.presentation_quality +
    NEW.communication +
    NEW.content_clarity +
    NEW.audience_engagement
  ) / 4, 2);
END$$

DROP TRIGGER IF EXISTS trg_presentation_before_update$$
CREATE TRIGGER trg_presentation_before_update
BEFORE UPDATE ON PresentationScores
FOR EACH ROW
BEGIN
  SET NEW.total_score = ROUND((
    NEW.presentation_quality +
    NEW.communication +
    NEW.content_clarity +
    NEW.audience_engagement
  ) / 4, 2);
END$$

DROP TRIGGER IF EXISTS trg_certificates_before_insert$$
CREATE TRIGGER trg_certificates_before_insert
BEFORE INSERT ON Certificates
FOR EACH ROW
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM Papers p
    WHERE p.id = NEW.paper_id
      AND p.status = 'accepted'
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Certificates can be generated only for accepted papers';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM PaperAuthors pa
    WHERE pa.paper_id = NEW.paper_id
      AND pa.user_id = NEW.user_id
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Certificate user must be an author of the accepted paper';
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_certificates_after_insert$$
CREATE TRIGGER trg_certificates_after_insert
AFTER INSERT ON Certificates
FOR EACH ROW
BEGIN
  INSERT INTO AuditLog (entity_type, entity_id, action, details, actor_user_id)
  VALUES (
    'Certificate',
    NEW.id,
    'INSERT',
    JSON_OBJECT('paper_id', NEW.paper_id, 'certificate_path', NEW.certificate_path),
    NEW.user_id
  );
END$$

-- ---------------------------------------------------------------------------
-- 6. Stored procedures: TCL/ACID, locks, cursors, complex computations
-- ---------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS sp_assign_reviewer_atomic$$
CREATE PROCEDURE sp_assign_reviewer_atomic(
  IN p_paper_id INT,
  IN p_reviewer_id INT,
  IN p_admin_id INT
)
BEGIN
  DECLARE v_paper_count INT DEFAULT 0;
  DECLARE v_reviewer_count INT DEFAULT 0;
  DECLARE v_existing_count INT DEFAULT 0;
  DECLARE v_paper_title VARCHAR(255);

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT COUNT(*) INTO v_paper_count
  FROM Papers
  WHERE id = p_paper_id;

  IF v_paper_count = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Paper not found';
  END IF;

  SELECT title INTO v_paper_title
  FROM Papers
  WHERE id = p_paper_id
  FOR UPDATE;

  SELECT COUNT(*) INTO v_reviewer_count
  FROM Users
  WHERE id = p_reviewer_id AND role = 'reviewer';

  IF v_reviewer_count = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid reviewer';
  END IF;

  SELECT COUNT(*) INTO v_existing_count
  FROM ReviewerAssignments
  WHERE paper_id = p_paper_id AND reviewer_id = p_reviewer_id;

  IF v_existing_count > 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Reviewer already assigned';
  END IF;

  INSERT INTO ReviewerAssignments (paper_id, reviewer_id)
  VALUES (p_paper_id, p_reviewer_id);

  UPDATE Papers
  SET status = 'under_review'
  WHERE id = p_paper_id AND status = 'submitted';

  INSERT INTO Notifications (user_id, message)
  VALUES (p_reviewer_id, CONCAT('You have been assigned to review: "', v_paper_title, '"'));

  INSERT INTO AuditLog (entity_type, entity_id, action, details, actor_user_id)
  VALUES (
    'ReviewerAssignment',
    p_paper_id,
    'INSERT',
    JSON_OBJECT('reviewer_id', p_reviewer_id),
    p_admin_id
  );

  COMMIT;
END$$

DROP PROCEDURE IF EXISTS sp_submit_review_atomic$$
CREATE PROCEDURE sp_submit_review_atomic(
  IN p_paper_id INT,
  IN p_reviewer_id INT,
  IN p_originality_score TINYINT,
  IN p_technical_quality_score TINYINT,
  IN p_clarity_score TINYINT,
  IN p_relevance_score TINYINT,
  IN p_comments TEXT
)
BEGIN
  DECLARE v_paper_count INT DEFAULT 0;
  DECLARE v_author_id INT;
  DECLARE v_paper_title VARCHAR(255);

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT COUNT(*) INTO v_paper_count
  FROM Papers
  WHERE id = p_paper_id;

  IF v_paper_count = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Paper not found';
  END IF;

  SELECT author_id, title
  INTO v_author_id, v_paper_title
  FROM Papers
  WHERE id = p_paper_id
  FOR UPDATE;

  INSERT INTO Reviews (
    paper_id,
    reviewer_id,
    originality_score,
    technical_quality_score,
    clarity_score,
    relevance_score,
    comments,
    review_date
  )
  VALUES (
    p_paper_id,
    p_reviewer_id,
    p_originality_score,
    p_technical_quality_score,
    p_clarity_score,
    p_relevance_score,
    p_comments,
    CURRENT_TIMESTAMP
  )
  ON DUPLICATE KEY UPDATE
    originality_score = VALUES(originality_score),
    technical_quality_score = VALUES(technical_quality_score),
    clarity_score = VALUES(clarity_score),
    relevance_score = VALUES(relevance_score),
    comments = VALUES(comments),
    review_date = CURRENT_TIMESTAMP;

  UPDATE Papers
  SET status = 'under_review'
  WHERE id = p_paper_id AND status = 'submitted';

  INSERT INTO Notifications (user_id, message)
  VALUES (v_author_id, CONCAT('Your paper "', v_paper_title, '" has received a review.'));

  COMMIT;
END$$

DROP PROCEDURE IF EXISTS sp_make_paper_decision_atomic$$
CREATE PROCEDURE sp_make_paper_decision_atomic(
  IN p_paper_id INT,
  IN p_status VARCHAR(20),
  IN p_admin_id INT
)
BEGIN
  DECLARE v_paper_count INT DEFAULT 0;
  DECLARE v_author_id INT;
  DECLARE v_paper_title VARCHAR(255);
  DECLARE v_message TEXT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF p_status NOT IN ('accepted', 'rejected', 'revision') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid decision status';
  END IF;

  START TRANSACTION;

  SELECT COUNT(*) INTO v_paper_count
  FROM Papers
  WHERE id = p_paper_id;

  IF v_paper_count = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Paper not found';
  END IF;

  SELECT author_id, title
  INTO v_author_id, v_paper_title
  FROM Papers
  WHERE id = p_paper_id
  FOR UPDATE;

  UPDATE Papers
  SET status = p_status
  WHERE id = p_paper_id;

  SET v_message = CASE p_status
    WHEN 'accepted' THEN CONCAT('Congratulations! Your paper "', v_paper_title, '" has been ACCEPTED.')
    WHEN 'rejected' THEN CONCAT('We regret to inform you that your paper "', v_paper_title, '" has been REJECTED.')
    ELSE CONCAT('Your paper "', v_paper_title, '" requires REVISION. Please check reviewer comments.')
  END;

  INSERT INTO Notifications (user_id, message)
  VALUES (v_author_id, v_message);

  INSERT INTO AuditLog (entity_type, entity_id, action, details, actor_user_id)
  VALUES (
    'Paper',
    p_paper_id,
    'DECISION',
    JSON_OBJECT('decision', p_status, 'avg_review_score', fn_paper_review_average(p_paper_id)),
    p_admin_id
  );

  COMMIT;
END$$

DROP PROCEDURE IF EXISTS sp_reviewer_workload_cursor$$
CREATE PROCEDURE sp_reviewer_workload_cursor(IN p_conference_id INT)
BEGIN
  DECLARE v_done BOOLEAN DEFAULT FALSE;
  DECLARE v_reviewer_id INT;
  DECLARE v_reviewer_name VARCHAR(100);
  DECLARE v_assigned_count INT;
  DECLARE v_completed_count INT;

  DECLARE reviewer_cursor CURSOR FOR
    SELECT id, name
    FROM Users
    WHERE role = 'reviewer'
    ORDER BY name;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;

  DROP TEMPORARY TABLE IF EXISTS tmp_reviewer_workload;
  CREATE TEMPORARY TABLE tmp_reviewer_workload (
    reviewer_id INT PRIMARY KEY,
    reviewer_name VARCHAR(100),
    assigned_count INT,
    completed_count INT,
    pending_count INT
  );

  OPEN reviewer_cursor;

  read_loop: LOOP
    FETCH reviewer_cursor INTO v_reviewer_id, v_reviewer_name;

    IF v_done THEN
      LEAVE read_loop;
    END IF;

    SELECT COUNT(*)
    INTO v_assigned_count
    FROM ReviewerAssignments ra
    JOIN Papers p ON p.id = ra.paper_id
    WHERE ra.reviewer_id = v_reviewer_id
      AND (p_conference_id IS NULL OR p.conference_id = p_conference_id);

    SELECT COUNT(*)
    INTO v_completed_count
    FROM Reviews r
    JOIN Papers p ON p.id = r.paper_id
    WHERE r.reviewer_id = v_reviewer_id
      AND (p_conference_id IS NULL OR p.conference_id = p_conference_id);

    INSERT INTO tmp_reviewer_workload
    VALUES (
      v_reviewer_id,
      v_reviewer_name,
      v_assigned_count,
      v_completed_count,
      v_assigned_count - v_completed_count
    );
  END LOOP;

  CLOSE reviewer_cursor;

  SELECT *
  FROM tmp_reviewer_workload
  ORDER BY pending_count DESC, assigned_count DESC, reviewer_name;
END$$

DROP PROCEDURE IF EXISTS sp_refresh_conference_metric_snapshots$$
CREATE PROCEDURE sp_refresh_conference_metric_snapshots()
BEGIN
  INSERT INTO ConferenceMetricSnapshots (
    conference_id,
    total_papers,
    accepted_papers,
    rejected_papers,
    revision_papers,
    under_review_papers,
    avg_review_score,
    avg_presentation_score
  )
  SELECT
    c.id,
    COUNT(DISTINCT p.id) AS total_papers,
    SUM(CASE WHEN p.status = 'accepted' THEN 1 ELSE 0 END) AS accepted_papers,
    SUM(CASE WHEN p.status = 'rejected' THEN 1 ELSE 0 END) AS rejected_papers,
    SUM(CASE WHEN p.status = 'revision' THEN 1 ELSE 0 END) AS revision_papers,
    SUM(CASE WHEN p.status = 'under_review' THEN 1 ELSE 0 END) AS under_review_papers,
    ROUND(AVG(review_summary.avg_review_score), 2) AS avg_review_score,
    ROUND(AVG(presentation_summary.avg_presentation_score), 2) AS avg_presentation_score
  FROM Conferences c
  LEFT JOIN Papers p ON p.conference_id = c.id
  LEFT JOIN (
    SELECT paper_id, AVG(total_score) AS avg_review_score
    FROM Reviews
    GROUP BY paper_id
  ) review_summary ON review_summary.paper_id = p.id
  LEFT JOIN (
    SELECT paper_id, AVG(total_score) AS avg_presentation_score
    FROM PresentationScores
    GROUP BY paper_id
  ) presentation_summary ON presentation_summary.paper_id = p.id
  GROUP BY c.id;
END$$

DELIMITER ;

-- ---------------------------------------------------------------------------
-- 7. Views: relational algebra mappings, joins, grouping, OLAP-style reporting
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW vw_conference_catalog AS
SELECT
  c.id AS conference_id,
  c.title,
  c.venue,
  c.status,
  c.submission_deadline,
  fn_days_until_deadline(c.id) AS days_until_deadline,
  u.name AS created_by_name,
  GROUP_CONCAT(DISTINCT t.name ORDER BY t.name SEPARATOR ', ') AS normalized_topics
FROM Conferences c
LEFT JOIN Users u ON u.id = c.created_by
LEFT JOIN ConferenceTopics ct ON ct.conference_id = c.id
LEFT JOIN Topics t ON t.id = ct.topic_id
GROUP BY
  c.id,
  c.title,
  c.venue,
  c.status,
  c.submission_deadline,
  u.name;

CREATE OR REPLACE VIEW vw_paper_review_summary AS
SELECT
  p.id AS paper_id,
  p.title AS paper_title,
  p.status,
  p.version,
  c.id AS conference_id,
  c.title AS conference_title,
  u.id AS author_id,
  u.name AS author_name,
  COUNT(r.id) AS review_count,
  ROUND(AVG(r.total_score), 2) AS avg_review_score,
  MIN(r.total_score) AS min_review_score,
  MAX(r.total_score) AS max_review_score,
  fn_acceptance_band(fn_paper_review_average(p.id)) AS recommendation_band
FROM Papers p
JOIN Conferences c ON c.id = p.conference_id
JOIN Users u ON u.id = p.author_id
LEFT JOIN Reviews r ON r.paper_id = p.id
GROUP BY
  p.id,
  p.title,
  p.status,
  p.version,
  c.id,
  c.title,
  u.id,
  u.name;

CREATE OR REPLACE VIEW vw_reviewer_workload AS
SELECT
  u.id AS reviewer_id,
  u.name AS reviewer_name,
  u.email,
  COUNT(DISTINCT ra.paper_id) AS assigned_count,
  COUNT(DISTINCT r.paper_id) AS completed_count,
  COUNT(DISTINCT ra.paper_id) - COUNT(DISTINCT r.paper_id) AS pending_count,
  ROUND(AVG(r.total_score), 2) AS avg_score_given
FROM Users u
LEFT JOIN ReviewerAssignments ra ON ra.reviewer_id = u.id
LEFT JOIN Reviews r ON r.reviewer_id = u.id AND r.paper_id = ra.paper_id
WHERE u.role = 'reviewer'
GROUP BY u.id, u.name, u.email;

CREATE OR REPLACE VIEW vw_author_submission_history AS
SELECT
  u.id AS author_id,
  u.name AS author_name,
  COUNT(p.id) AS total_submissions,
  SUM(CASE WHEN p.status = 'accepted' THEN 1 ELSE 0 END) AS accepted_count,
  SUM(CASE WHEN p.status = 'revision' THEN 1 ELSE 0 END) AS revision_count,
  SUM(CASE WHEN p.status = 'rejected' THEN 1 ELSE 0 END) AS rejected_count,
  MAX(p.created_at) AS latest_submission_at
FROM Users u
LEFT JOIN Papers p ON p.author_id = u.id
WHERE u.role = 'author'
GROUP BY u.id, u.name;

CREATE OR REPLACE VIEW vw_accepted_paper_rankings AS
SELECT
  ranked.conference_id,
  ranked.conference_title,
  ranked.paper_id,
  ranked.paper_title,
  ranked.author_name,
  ranked.avg_review_score,
  ranked.avg_presentation_score,
  ranked.final_weighted_score,
  RANK() OVER (
    PARTITION BY ranked.conference_id
    ORDER BY ranked.final_weighted_score DESC, ranked.avg_review_score DESC
  ) AS conference_rank
FROM (
  SELECT
    c.id AS conference_id,
    c.title AS conference_title,
    p.id AS paper_id,
    p.title AS paper_title,
    u.name AS author_name,
    ROUND(AVG(r.total_score), 2) AS avg_review_score,
    ROUND(AVG(ps.total_score), 2) AS avg_presentation_score,
    fn_final_weighted_score(p.id) AS final_weighted_score
  FROM Papers p
  JOIN Conferences c ON c.id = p.conference_id
  JOIN Users u ON u.id = p.author_id
  LEFT JOIN Reviews r ON r.paper_id = p.id
  LEFT JOIN PresentationScores ps ON ps.paper_id = p.id
  WHERE p.status = 'accepted'
  GROUP BY c.id, c.title, p.id, p.title, u.name
) ranked;

CREATE OR REPLACE VIEW vw_conference_metrics_olap AS
SELECT
  c.id AS conference_id,
  c.title AS conference_title,
  COUNT(DISTINCT p.id) AS total_papers,
  COUNT(DISTINCT CASE WHEN p.status = 'accepted' THEN p.id END) AS accepted_papers,
  COUNT(DISTINCT CASE WHEN p.status = 'rejected' THEN p.id END) AS rejected_papers,
  COUNT(DISTINCT CASE WHEN p.status = 'revision' THEN p.id END) AS revision_papers,
  COUNT(DISTINCT CASE WHEN p.status = 'under_review' THEN p.id END) AS under_review_papers,
  COALESCE(MAX(reviewer_summary.active_reviewers), 0) AS active_reviewers,
  ROUND(AVG(review_summary.avg_review_score), 2) AS avg_review_score,
  ROUND(AVG(presentation_summary.avg_presentation_score), 2) AS avg_presentation_score
FROM Conferences c
LEFT JOIN Papers p ON p.conference_id = c.id
LEFT JOIN (
  SELECT p2.conference_id, COUNT(DISTINCT ra.reviewer_id) AS active_reviewers
  FROM Papers p2
  JOIN ReviewerAssignments ra ON ra.paper_id = p2.id
  GROUP BY p2.conference_id
) reviewer_summary ON reviewer_summary.conference_id = c.id
LEFT JOIN (
  SELECT paper_id, AVG(total_score) AS avg_review_score
  FROM Reviews
  GROUP BY paper_id
) review_summary ON review_summary.paper_id = p.id
LEFT JOIN (
  SELECT paper_id, AVG(total_score) AS avg_presentation_score
  FROM PresentationScores
  GROUP BY paper_id
) presentation_summary ON presentation_summary.paper_id = p.id
GROUP BY c.id, c.title;

CREATE OR REPLACE VIEW vw_data_warehouse_fact_paper AS
SELECT
  p.id AS paper_id,
  p.conference_id,
  DATE(p.created_at) AS submission_date,
  YEAR(p.created_at) AS submission_year,
  QUARTER(p.created_at) AS submission_quarter,
  MONTH(p.created_at) AS submission_month,
  p.status,
  p.version,
  COUNT(DISTINCT ra.reviewer_id) AS reviewers_assigned,
  COUNT(DISTINCT r.id) AS reviews_completed,
  fn_paper_review_average(p.id) AS avg_review_score,
  fn_final_weighted_score(p.id) AS final_weighted_score
FROM Papers p
LEFT JOIN ReviewerAssignments ra ON ra.paper_id = p.id
LEFT JOIN Reviews r ON r.paper_id = p.id
GROUP BY
  p.id,
  p.conference_id,
  DATE(p.created_at),
  YEAR(p.created_at),
  QUARTER(p.created_at),
  MONTH(p.created_at),
  p.status,
  p.version;

-- Updatable view for the view-update experiment.
CREATE OR REPLACE VIEW vw_updatable_draft_conferences AS
SELECT id, title, description, venue, submission_deadline, status
FROM Conferences
WHERE status = 'draft'
WITH CHECK OPTION;

-- Multi-table view for demonstrating restrictions on non-updatable views.
CREATE OR REPLACE VIEW vw_non_updatable_submission_detail AS
SELECT
  p.id AS paper_id,
  p.title AS paper_title,
  p.status AS paper_status,
  u.name AS author_name,
  c.title AS conference_title,
  COUNT(r.id) AS review_count
FROM Papers p
JOIN Users u ON u.id = p.author_id
JOIN Conferences c ON c.id = p.conference_id
LEFT JOIN Reviews r ON r.paper_id = p.id
GROUP BY p.id, p.title, p.status, u.name, c.title;

-- ---------------------------------------------------------------------------
-- 8. Optional DCL reference
-- ---------------------------------------------------------------------------
-- Run these as a privileged DBA user if your MySQL account allows role creation.
--
-- CREATE ROLE IF NOT EXISTS cms_readonly_role;
-- CREATE ROLE IF NOT EXISTS cms_reviewer_role;
-- CREATE ROLE IF NOT EXISTS cms_admin_role;
--
-- GRANT SELECT ON cms_db.vw_conference_catalog TO cms_readonly_role;
-- GRANT SELECT ON cms_db.vw_paper_review_summary TO cms_reviewer_role;
-- GRANT SELECT, INSERT, UPDATE ON cms_db.Reviews TO cms_reviewer_role;
-- GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON cms_db.* TO cms_admin_role;
--
-- CREATE USER IF NOT EXISTS 'cms_demo_reader'@'localhost' IDENTIFIED BY 'ChangeMe#123';
-- GRANT cms_readonly_role TO 'cms_demo_reader'@'localhost';
-- SET DEFAULT ROLE cms_readonly_role TO 'cms_demo_reader'@'localhost';
