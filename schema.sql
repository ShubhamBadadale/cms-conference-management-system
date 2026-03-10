-- Conference Management System - MySQL Schema
-- Run this file to initialize the database

CREATE DATABASE IF NOT EXISTS cms_db;
USE cms_db;

-- Users Table
CREATE TABLE IF NOT EXISTS Users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('author', 'reviewer', 'admin', 'coordinator') NOT NULL,
  institution VARCHAR(200),
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
  status ENUM('submitted','under_review','revision','accepted','rejected') DEFAULT 'submitted',
  version INT DEFAULT 1,
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

-- Seed Admin User (password: admin123)
INSERT INTO Users (name, email, password, role, institution) VALUES
('Admin User', 'admin@cms.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'CMS System');
