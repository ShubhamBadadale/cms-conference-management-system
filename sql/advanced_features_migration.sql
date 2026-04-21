USE cms_db;

ALTER TABLE Users
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE Conferences
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE Papers
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  MODIFY COLUMN status ENUM('submitted','under_review','revision','accepted','rejected','flagged_for_review') DEFAULT 'submitted';

UPDATE Users SET is_active = TRUE WHERE is_active IS NULL;
UPDATE Conferences SET is_active = TRUE WHERE is_active IS NULL;
UPDATE Papers SET is_active = TRUE WHERE is_active IS NULL;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_prepare_reviewer_expertise_keyword_table$$
CREATE PROCEDURE sp_prepare_reviewer_expertise_keyword_table()
BEGIN
  IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = 'ReviewerExpertise'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'ReviewerExpertise'
        AND column_name = 'keyword'
    ) THEN
    RENAME TABLE ReviewerExpertise TO ReviewerExpertiseLegacy;
  END IF;
END$$

CALL sp_prepare_reviewer_expertise_keyword_table()$$
DROP PROCEDURE IF EXISTS sp_prepare_reviewer_expertise_keyword_table$$

DELIMITER ;

CREATE TABLE IF NOT EXISTS PaperKeywords (
  paper_id INT NOT NULL,
  keyword VARCHAR(80) NOT NULL,
  PRIMARY KEY (paper_id, keyword),
  INDEX idx_paper_keywords_keyword (keyword),
  FOREIGN KEY (paper_id) REFERENCES Papers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ReviewerExpertise (
  reviewer_id INT NOT NULL,
  keyword VARCHAR(80) NOT NULL,
  expertise_level ENUM('basic', 'intermediate', 'expert') NOT NULL DEFAULT 'intermediate',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (reviewer_id, keyword),
  INDEX idx_reviewer_expertise_keyword (keyword),
  FOREIGN KEY (reviewer_id) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS PaperVersions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  paper_id INT NOT NULL,
  version_number INT NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  original_filename VARCHAR(255),
  mime_type VARCHAR(100),
  file_size BIGINT,
  plagiarism_score DECIMAL(5,2),
  plagiarism_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  plagiarism_notes VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_paper_versions (paper_id, version_number),
  FOREIGN KEY (paper_id) REFERENCES Papers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS EmailQueue (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  paper_id INT NULL,
  user_id INT NULL,
  email_type VARCHAR(50) NOT NULL,
  recipient_email VARCHAR(150) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  payload_json JSON NOT NULL,
  status ENUM('pending','processing','sent','failed') NOT NULL DEFAULT 'pending',
  attempt_count INT NOT NULL DEFAULT 0,
  last_error TEXT NULL,
  scheduled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email_queue_status_schedule (status, scheduled_at),
  FOREIGN KEY (paper_id) REFERENCES Papers(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE SET NULL
);

INSERT IGNORE INTO PaperVersions (
  paper_id,
  version_number,
  file_path,
  original_filename,
  mime_type,
  is_active
)
SELECT
  p.id,
  COALESCE(NULLIF(p.version, 0), 1),
  p.file_path,
  p.file_path,
  'application/pdf',
  TRUE
FROM Papers p
WHERE p.file_path IS NOT NULL;

INSERT IGNORE INTO PaperKeywords (paper_id, keyword)
WITH RECURSIVE split_keywords AS (
  SELECT
    id AS paper_id,
    LOWER(TRIM(SUBSTRING_INDEX(COALESCE(keywords, ''), ',', 1))) AS keyword,
    CASE
      WHEN INSTR(COALESCE(keywords, ''), ',') > 0
        THEN SUBSTRING(COALESCE(keywords, ''), INSTR(COALESCE(keywords, ''), ',') + 1)
      ELSE ''
    END AS rest
  FROM Papers
  WHERE COALESCE(keywords, '') <> ''

  UNION ALL

  SELECT
    paper_id,
    LOWER(TRIM(SUBSTRING_INDEX(rest, ',', 1))) AS keyword,
    CASE
      WHEN INSTR(rest, ',') > 0 THEN SUBSTRING(rest, INSTR(rest, ',') + 1)
      ELSE ''
    END AS rest
  FROM split_keywords
  WHERE rest <> ''
)
SELECT paper_id, keyword
FROM split_keywords
WHERE keyword <> '';
