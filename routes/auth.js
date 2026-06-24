const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { authenticate } = require('../middleware');

const router = express.Router();

// Register - creates user directly (no email verification)
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password) return res.status(400).json({ error: 'Name, email, phone, and password are required.' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(409).json({ error: 'This email is already registered. Please login instead.' });

    const existingPhone = await User.findOne({ phone });
    if (existingPhone) return res.status(409).json({ error: 'This phone number is already registered. Please login instead.' });

    const hashed = bcrypt.hashSync(password, 10);
    await User.create({ 
      name, email, phone, password: hashed, 
      role: 'customer', 
      is_verified: true
    });

    res.status(201).json({ message: 'Registration successful! You can now login.' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed.' });
  }
});



// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

    const user = await User.findOne({ email });
    if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid email or password.' });

    // Prevent concurrent logins
    if (user.current_token) {
      try {
        jwt.verify(user.current_token, process.env.JWT_SECRET);
        return res.status(403).json({ error: 'This account is currently logged in on another device. Please logout there first.' });
      } catch (err) {
        // Token is expired or invalid, safe to overwrite
      }
    }

    const token = jwt.sign({ id: user._id, email: user.email, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '12h' });
    user.current_token = token;
    await user.save();

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

router.post('/logout', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) {
      user.current_token = null;
      await user.save();
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed.' });
  }
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



module.exports = router;


