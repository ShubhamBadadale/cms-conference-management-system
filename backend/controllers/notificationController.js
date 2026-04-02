const db = require('../config/db');

const getMyNotifications = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM Notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const markAsRead = async (req, res) => {
  try {
    await db.query("UPDATE Notifications SET status = 'read' WHERE user_id = ?", [req.user.id]);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getMyNotifications, markAsRead };
