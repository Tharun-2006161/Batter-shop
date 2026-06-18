require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./database');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Start server after DB is ready
async function start() {
  await connectDB();

  const authRoutes = require('./routes/auth');
  const orderRoutes = require('./routes/orders');
  const adminRoutes = require('./routes/admin');

  app.use('/api/auth', authRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/admin', adminRoutes);

  app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`\n🍚 Batter Shop Server running on http://localhost:${PORT}`);
    console.log(`📋 Admin panel: http://localhost:${PORT}/#admin-login`);
    console.log(`🕐 Booking hours: 9:00 PM - 1:30 PM\n`);
  });
}

start().catch(err => { console.error('Failed to start:', err); process.exit(1); });
