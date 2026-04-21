-- Conference Management System - MySQL Schema
-- Run this file to initialize the database
-- Optional DBMS syllabus showcase:
--   mysql -u root -p cms_db < sql/dbms_showcase.sql
--   mysql -u root -p cms_db < sql/dbms_lab_queries.sql

CREATE DATABASE IF NOT EXISTS cms_db;
USE cms_db;

-- Users Table
CREATE TABLE IF NOT EXISTS Users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('pending', 'author', 'reviewer', 'admin', 'coordinator') NOT NULL DEFAULT 'pending',
  institution VARCHAR(200),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conferences Table
CREATE TABLE IF NOT EXISTS Conferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  topics TEXT,
  venue VARCHAR(255),
  submission_deadline DATE,
  status ENUM('draft', 'published', 'closed') DEFAULT 'draft',
  created_by INT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES Users(id) ON DELETE SET NULL
);

-- Papers Table
CREATE TABLE IF NOT EXISTS Papers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  abstract TEXT,
  keywords VARCHAR(500),
  file_path VARCHAR(500),
  author_id INT NOT NULL,
  conference_id INT NOT NULL,
  status ENUM('submitted','under_review','revision','accepted','rejected','flagged_for_review') DEFAULT 'submitted',
  version INT DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (conference_id) REFERENCES Conferences(id) ON DELETE CASCADE
);

-- Reviewer Assignments Table
CREATE TABLE IF NOT EXISTS ReviewerAssignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  paper_id INT NOT NULL,
  reviewer_id INT NOT NULL,
  assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (paper_id) REFERENCES Papers(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES Users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_assignment (paper_id, reviewer_id)
);

-- Reviews Table
CREATE TABLE IF NOT EXISTS Reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  paper_id INT NOT NULL,
  reviewer_id INT NOT NULL,
  originality_score TINYINT CHECK (originality_score BETWEEN 0 AND 10),
  technical_quality_score TINYINT CHECK (technical_quality_score BETWEEN 0 AND 10),
  clarity_score TINYINT CHECK (clarity_score BETWEEN 0 AND 10),
  relevance_score TINYINT CHECK (relevance_score BETWEEN 0 AND 10),
  total_score DECIMAL(5,2),
  comments TEXT,
  review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (paper_id) REFERENCES Papers(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- Presentation Scores Table
CREATE TABLE IF NOT EXISTS PresentationScores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  paper_id INT NOT NULL,
  coordinator_id INT NOT NULL,
  presentation_quality TINYINT CHECK (presentation_quality BETWEEN 0 AND 10),
  communication TINYINT CHECK (communication BETWEEN 0 AND 10),
  content_clarity TINYINT CHECK (content_clarity BETWEEN 0 AND 10),
  audience_engagement TINYINT CHECK (audience_engagement BETWEEN 0 AND 10),
  total_score DECIMAL(5,2),
  scored_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (paper_id) REFERENCES Papers(id) ON DELETE CASCADE,
  FOREIGN KEY (coordinator_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- Certificates Table
CREATE TABLE IF NOT EXISTS Certificates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  paper_id INT NOT NULL,
  user_id INT NOT NULL,
  certificate_path VARCHAR(500),
  generated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (paper_id) REFERENCES Papers(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS Notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  message TEXT NOT NULL,
  status ENUM('unread','read') DEFAULT 'unread',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- Normalized Paper Keywords
CREATE TABLE IF NOT EXISTS PaperKeywords (
  paper_id INT NOT NULL,
  keyword VARCHAR(80) NOT NULL,
  PRIMARY KEY (paper_id, keyword),
  INDEX idx_paper_keywords_keyword (keyword),
  FOREIGN KEY (paper_id) REFERENCES Papers(id) ON DELETE CASCADE
);

-- Reviewer Expertise
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

-- Paper version history
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

-- Email queue for async notifications
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

-- Seed Admin User (password: admin123)
INSERT INTO Users (name, email, password, role, institution, is_active)
SELECT 'Admin User', 'admin@cms.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'CMS System', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM Users WHERE email = 'admin@cms.com'
);
