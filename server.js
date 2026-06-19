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

  // --- DEBUG ROUTE FOR RENDER EMAIL TESTING ---
  app.get('/test-email', async (req, res) => {
    try {
      const { sendRegistrationOTP } = require('./email');
      const testOtp = '123456';
      const result = await sendRegistrationOTP(process.env.SMTP_USER, testOtp);
      if (result) {
        res.json({ success: true, message: 'Test email sent!', to: process.env.SMTP_USER });
      } else {
        res.status(500).json({ success: false, error: 'All email attempts failed. Check server logs.' });
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  // ------------------------------------------

  app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`\n🍚 Batter Shop Server running on http://localhost:${PORT}`);
    console.log(`📋 Admin panel: http://localhost:${PORT}/#admin-login`);
    console.log(`🕐 Booking hours: 8:00 PM - 2:00 PM\n`);
  });
}

start().catch(err => { console.error('Failed to start:', err); process.exit(1); });
