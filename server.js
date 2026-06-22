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

  // Temporary: Test email endpoint for debugging
  app.get('/api/test-email', async (req, res) => {
    try {
      const nodemailer = require('nodemailer');
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });

      const info = await transport.sendMail({
        from: `"Batter Shop" <${process.env.SMTP_USER}>`,
        to: process.env.SMTP_USER, // Send to self
        subject: 'Test Email from Batter Shop',
        text: 'If you received this, email is working!'
      });

      transport.close();
      res.json({ success: true, messageId: info.messageId, smtp_user: process.env.SMTP_USER ? 'SET' : 'MISSING', smtp_pass: process.env.SMTP_PASS ? 'SET' : 'MISSING' });
    } catch (error) {
      res.json({ success: false, error: error.message, code: error.code, smtp_user: process.env.SMTP_USER ? 'SET' : 'MISSING', smtp_pass: process.env.SMTP_PASS ? 'SET' : 'MISSING' });
    }
  });

  app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`\n🍚 Batter Shop Server running on http://localhost:${PORT}`);
    console.log(`📋 Admin panel: http://localhost:${PORT}/#admin-login`);
    console.log(`🕐 Booking hours: 8:00 PM - 2:00 PM\n`);
  });
}

start().catch(err => { console.error('Failed to start:', err); process.exit(1); });
