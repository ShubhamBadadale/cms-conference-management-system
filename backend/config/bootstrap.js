const db = require('./db');

const normalizeKeywords = (value = '') => {
  const uniqueKeywords = new Set();

  String(value)
    .split(',')
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean)
    .forEach((keyword) => uniqueKeywords.add(keyword));

  return Array.from(uniqueKeywords);
};

const tableExists = async (tableName) => {
  const [tables] = await db.query('SHOW TABLES LIKE ?', [tableName]);
  return tables.length > 0;
};

const columnExists = async (tableName, columnName) => {
  const [columns] = await db.query(`SHOW COLUMNS FROM ${tableName} LIKE ?`, [columnName]);
  return columns.length > 0;
};

const createAdvancedTables = async () => {
  const statements = [
    `CREATE TABLE IF NOT EXISTS PaperKeywords (
      paper_id INT NOT NULL,
      keyword VARCHAR(80) NOT NULL,
      PRIMARY KEY (paper_id, keyword),
      INDEX idx_paper_keywords_keyword (keyword),
      FOREIGN KEY (paper_id) REFERENCES Papers(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS ReviewerExpertise (
      reviewer_id INT NOT NULL,
      keyword VARCHAR(80) NOT NULL,
      expertise_level ENUM('basic', 'intermediate', 'expert') NOT NULL DEFAULT 'intermediate',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (reviewer_id, keyword),
      INDEX idx_reviewer_expertise_keyword (keyword),
      FOREIGN KEY (reviewer_id) REFERENCES Users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS PaperVersions (
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
    )`,
    `CREATE TABLE IF NOT EXISTS EmailQueue (
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
    )`,
  ];

  for (const statement of statements) {
    await db.query(statement);
  }
};

const migrateUsersRoleEnum = async () => {
  try {
    if (!(await tableExists('Users'))) return;

    const [columns] = await db.query("SHOW COLUMNS FROM Users LIKE 'role'");
    if (columns.length === 0) return;

    const roleColumn = columns[0];
    const hasPendingRole = String(roleColumn.Type).includes("'pending'");
    const hasPendingDefault = roleColumn.Default === 'pending';

    if (!hasPendingRole || !hasPendingDefault) {
      await db.query(
        "ALTER TABLE Users MODIFY COLUMN role ENUM('pending', 'author', 'reviewer', 'admin', 'coordinator') NOT NULL DEFAULT 'pending'"
      );
      console.log('Bootstrap: updated Users.role to support admin approval workflow');
    }
  } catch (err) {
    console.error('Bootstrap role migration failed:', err.message);
  }
};

const ensureSoftDeleteColumns = async () => {
  const targets = [
    { table: 'Users', column: 'is_active' },
    { table: 'Conferences', column: 'is_active' },
    { table: 'Papers', column: 'is_active' },
  ];

  for (const target of targets) {
    if (!(await tableExists(target.table))) continue;

    const hasColumn = await columnExists(target.table, target.column);
    if (!hasColumn) {
      await db.query(
        `ALTER TABLE ${target.table} ADD COLUMN ${target.column} BOOLEAN NOT NULL DEFAULT TRUE`
      );
      console.log(`Bootstrap: added ${target.table}.${target.column}`);
    }

    await db.query(`UPDATE ${target.table} SET ${target.column} = TRUE WHERE ${target.column} IS NULL`);
  }
};

const ensureFlaggedPaperStatus = async () => {
  if (!(await tableExists('Papers'))) return;

  const [columns] = await db.query("SHOW COLUMNS FROM Papers LIKE 'status'");
  if (columns.length === 0) return;

  if (!String(columns[0].Type).includes("'flagged_for_review'")) {
    await db.query(
      "ALTER TABLE Papers MODIFY COLUMN status ENUM('submitted','under_review','revision','accepted','rejected','flagged_for_review') DEFAULT 'submitted'"
    );
    console.log('Bootstrap: extended Papers.status to include flagged_for_review');
  }
};

const ensureReviewerExpertiseKeywordTable = async () => {
  if (!(await tableExists('ReviewerExpertise'))) return;

  const hasKeywordColumn = await columnExists('ReviewerExpertise', 'keyword');
  if (hasKeywordColumn) return;

  if (!(await tableExists('ReviewerExpertiseLegacy'))) {
    await db.query('RENAME TABLE ReviewerExpertise TO ReviewerExpertiseLegacy');
    console.log('Bootstrap: preserved legacy ReviewerExpertise table as ReviewerExpertiseLegacy');
  }
};

const backfillPaperVersions = async () => {
  if (!(await tableExists('PaperVersions')) || !(await tableExists('Papers'))) return;

  await db.query(
    `INSERT IGNORE INTO PaperVersions (
      paper_id,
      version_number,
      file_path,
      original_filename,
      mime_type,
      is_active
    )
    SELECT
      id,
      COALESCE(NULLIF(version, 0), 1),
      file_path,
      file_path,
      'application/pdf',
      TRUE
    FROM Papers
    WHERE file_path IS NOT NULL`
  );
};

const backfillPaperKeywords = async () => {
  if (!(await tableExists('PaperKeywords')) || !(await tableExists('Papers'))) return;

  const [papers] = await db.query(
    `SELECT id, keywords
     FROM Papers
     WHERE keywords IS NOT NULL AND TRIM(keywords) <> ''`
  );

  for (const paper of papers) {
    const keywords = normalizeKeywords(paper.keywords);

    for (const keyword of keywords) {
      await db.query(
        'INSERT IGNORE INTO PaperKeywords (paper_id, keyword) VALUES (?, ?)',
        [paper.id, keyword]
      );
    }
  }
};

const runBootstrap = async () => {
  await migrateUsersRoleEnum();
  await ensureSoftDeleteColumns();
  await ensureFlaggedPaperStatus();
  await ensureReviewerExpertiseKeywordTable();
  await createAdvancedTables();
  await backfillPaperVersions();
  await backfillPaperKeywords();
};

module.exports = { normalizeKeywords, runBootstrap };
