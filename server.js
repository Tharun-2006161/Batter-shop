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
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      await transporter.verify();
      
      const info = await transporter.sendMail({
        from: `"Batter Shop" <${process.env.SMTP_USER}>`,
        to: process.env.SMTP_USER,
        subject: 'Render Email Test',
        text: 'Email works on Render!'
      });

      res.json({ 
        success: true, 
        message: 'Email sent successfully!', 
        user: process.env.SMTP_USER,
        messageId: info.messageId 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message, 
        stack: error.stack,
        userProvided: process.env.SMTP_USER ? 'Yes' : 'No',
        passProvided: process.env.SMTP_PASS ? 'Yes' : 'No'
      });
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
