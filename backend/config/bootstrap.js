const db = require('./db');

const migrateUsersRoleEnum = async () => {
  try {
    const [tables] = await db.query("SHOW TABLES LIKE 'Users'");
    if (tables.length === 0) return;

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
    console.error('Bootstrap migration failed:', err.message);
  }
};

const runBootstrap = async () => {
  await migrateUsersRoleEnum();
};

module.exports = { runBootstrap };
