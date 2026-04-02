const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes — Core
app.use('/api/auth',        require('./routes/authRoutes'));
app.use('/api/conferences', require('./routes/conferenceRoutes'));
app.use('/api/papers',      require('./routes/paperRoutes'));
app.use('/api/reviews',     require('./routes/reviewRoutes'));
app.use('/api/admin',       require('./routes/adminRoutes'));
app.use('/api/coordinator', require('./routes/coordinatorRoutes'));
app.use('/api/user',        require('./routes/userRoutes'));

// Routes — Advanced DBMS Features
app.use('/api/conflicts',   require('./routes/conflictRoutes'));   // Feature 1: COI
app.use('/api/bids',        require('./routes/biddingRoutes'));    // Feature 2: Bidding
app.use('/api/versions',    require('./routes/versionRoutes'));    // Feature 4: Versioning
app.use('/api/discussions', require('./routes/discussionRoutes')); // Feature 5: Discussions
app.use('/api/analytics',   require('./routes/analyticsRoutes')); // Features 7 & 8: Analytics

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'CMS Backend Running — Advanced Features Active' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`CMS Server running on port ${PORT}`));
