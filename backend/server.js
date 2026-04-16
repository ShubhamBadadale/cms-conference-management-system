const express = require('express');
const cors = require('cors');
const path = require('path');
const { runBootstrap } = require('./config/bootstrap');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/conferences', require('./routes/conferenceRoutes'));
app.use('/api/papers', require('./routes/paperRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/coordinator', require('./routes/coordinatorRoutes'));
app.use('/api/user', require('./routes/userRoutes'));
app.use('/api/nosql', require('./routes/nosqlRoutes'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'CMS Backend Running' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await runBootstrap();
  app.listen(PORT, () => console.log(`CMS Server running on port ${PORT}`));
};

startServer();
