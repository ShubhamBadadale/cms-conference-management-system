const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

const auth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [users] = await db.query(
      `SELECT id, name, email, role, institution, is_active
       FROM Users
       WHERE id = ?`,
      [decoded.id]
    );

    if (users.length === 0 || !users[0].is_active) {
      return res.status(401).json({ message: 'Account is inactive or unavailable' });
    }

    req.user = users[0];
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied: insufficient role' });
  }
  next();
};

module.exports = { auth, authorize };
