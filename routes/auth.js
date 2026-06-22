const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { authenticate } = require('../middleware');
const { sendConfirmationEmail } = require('../email');

const router = express.Router();

// Register - creates unverified user and sends confirmation email
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password) return res.status(400).json({ error: 'Name, email, phone, and password are required.' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      // If user exists but is not verified, resend the confirmation email
      if (!existingEmail.is_verified) {
        const token = crypto.randomBytes(32).toString('hex');
        existingEmail.confirmationToken = token;
        existingEmail.confirmationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
        await existingEmail.save();

        await sendConfirmationEmail(email, token, req.headers.host);
        return res.status(200).json({ 
          message: 'A confirmation email has been sent to your inbox. Please check your email and click the link to verify your account.',
          requires_confirmation: true
        });
      }
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const existingPhone = await User.findOne({ phone });
    if (existingPhone) return res.status(409).json({ error: 'Phone number already registered.' });

    // Generate confirmation token
    const confirmationToken = crypto.randomBytes(32).toString('hex');
    const hashed = bcrypt.hashSync(password, 10);

    const user = await User.create({ 
      name, email, phone, password: hashed, 
      role: 'customer', 
      is_verified: false,
      confirmationToken: confirmationToken,
      confirmationExpires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    });

    // Send confirmation email
    const emailSent = await sendConfirmationEmail(email, confirmationToken, req.headers.host);

    if (emailSent) {
      res.status(201).json({ 
        message: 'Registration started! A confirmation email has been sent to your inbox. Please check your email and click the link to verify your account.',
        requires_confirmation: true
      });
    } else {
      res.status(201).json({ 
        message: 'Account created, but we could not send the confirmation email. Please try logging in later or contact support.',
        requires_confirmation: true
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

// Confirm email - handles the link click from the email
router.get('/confirm-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.send(getConfirmationPage(false, 'Invalid confirmation link.'));
    }

    const user = await User.findOne({
      confirmationToken: token,
      confirmationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.send(getConfirmationPage(false, 'This confirmation link is invalid or has expired. Please register again.'));
    }

    // Verify the user
    user.is_verified = true;
    user.confirmationToken = undefined;
    user.confirmationExpires = undefined;
    await user.save();

    console.log(`✅ User ${user.email} confirmed their email successfully.`);
    return res.send(getConfirmationPage(true, `Welcome, ${user.name}! Your account is now verified.`));
  } catch (error) {
    console.error('Email confirmation error:', error);
    return res.send(getConfirmationPage(false, 'Something went wrong. Please try again.'));
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

    const user = await User.findOne({ email });
    if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid email or password.' });

    // Block unverified users
    if (!user.is_verified) {
      return res.status(403).json({ 
        error: 'Please verify your email address before logging in. Check your inbox for the confirmation link.',
        requires_confirmation: true, 
        email 
      });
    }

    const token = jwt.sign({ id: user._id, email: user.email, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Login successful!', token, user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed.' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, created_at: user.createdAt } });
  } catch (error) { res.status(500).json({ error: 'Failed to fetch profile.' }); }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal that the user doesn't exist
      return res.json({ message: 'If that email is registered, we have sent a reset link.' });
    }

    const token = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const { sendPasswordResetEmail } = require('../email');
    await sendPasswordResetEmail(user.email, token, req.headers.host);

    res.json({ message: 'If that email is registered, we have sent a reset link.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request.' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and new password are required.' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ error: 'Password reset token is invalid or has expired.' });

    user.password = bcrypt.hashSync(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password has been successfully reset. You can now login.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to process request.' });
  }
});

// Resend confirmation email
router.post('/resend-confirmation', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const user = await User.findOne({ email, is_verified: false });
    if (!user) {
      return res.json({ message: 'If that email is registered and unverified, we have sent a new confirmation link.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.confirmationToken = token;
    user.confirmationExpires = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    await sendConfirmationEmail(email, token, req.headers.host);
    res.json({ message: 'A new confirmation email has been sent. Please check your inbox.' });
  } catch (error) {
    console.error('Resend confirmation error:', error);
    res.status(500).json({ error: 'Failed to resend confirmation email.' });
  }
});

module.exports = router;

// Helper: Generate the HTML page shown when user clicks the confirmation link
function getConfirmationPage(success, message) {
  const statusIcon = success ? '✅' : '❌';
  const statusColor = success ? '#2ed573' : '#ff4757';
  const statusTitle = success ? 'Successfully Registered!' : 'Verification Failed';
  const buttonText = success ? 'Go to Batter Shop →' : 'Try Again →';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${statusTitle} - Batter Shop</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
      padding: 20px;
    }
    .container {
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 24px;
      padding: 50px 40px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      animation: slideUp 0.6s ease-out;
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .status-icon {
      font-size: 72px;
      margin-bottom: 20px;
      display: block;
      animation: bounce 0.8s ease-out 0.3s both;
    }
    @keyframes bounce {
      0% { transform: scale(0); }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }
    .status-circle {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: ${statusColor}22;
      border: 3px solid ${statusColor};
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      animation: popIn 0.5s ease-out 0.2s both;
    }
    @keyframes popIn {
      from { transform: scale(0) rotate(-180deg); }
      to { transform: scale(1) rotate(0); }
    }
    h1 {
      color: white;
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 12px;
    }
    .message {
      color: rgba(255,255,255,0.7);
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 32px;
    }
    .btn {
      display: inline-block;
      padding: 14px 36px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 600;
      font-size: 16px;
      letter-spacing: 0.5px;
      transition: all 0.3s ease;
      box-shadow: 0 4px 20px rgba(102,126,234,0.4);
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(102,126,234,0.6);
    }
    .brand {
      margin-top: 40px;
      color: rgba(255,255,255,0.3);
      font-size: 13px;
    }
    .brand span { color: rgba(255,255,255,0.5); font-weight: 600; }
    .confetti { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; overflow: hidden; z-index: 0; }
    .confetti-piece {
      position: absolute;
      width: 10px;
      height: 10px;
      top: -20px;
      animation: confettiFall 3s ease-out forwards;
    }
    @keyframes confettiFall {
      0% { transform: translateY(0) rotate(0deg); opacity: 1; }
      100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
    }
  </style>
</head>
<body>
  ${success ? '<div class="confetti" id="confetti"></div>' : ''}
  <div class="container" style="position:relative;z-index:1;">
    <div class="status-circle">
      <span class="status-icon">${statusIcon}</span>
    </div>
    <h1>${statusTitle}</h1>
    <p class="message">${message}</p>
    <a href="/" class="btn">${buttonText}</a>
    <p class="brand">🍚 <span>Batter</span>Shop</p>
  </div>

  ${success ? `<script>
    // Confetti animation for success
    const colors = ['#667eea', '#764ba2', '#2ed573', '#ffa502', '#ff4757', '#1e90ff'];
    const confettiContainer = document.getElementById('confetti');
    for (let i = 0; i < 50; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = Math.random() * 100 + '%';
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = Math.random() * 2 + 's';
      piece.style.animationDuration = (2 + Math.random() * 2) + 's';
      piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      piece.style.width = (6 + Math.random() * 8) + 'px';
      piece.style.height = (6 + Math.random() * 8) + 'px';
      confettiContainer.appendChild(piece);
    }
  </script>` : ''}
</body>
</html>`;
}
