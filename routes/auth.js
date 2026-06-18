const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticate } = require('../middleware');

const router = express.Router();

const { sendRegistrationOTP } = require('../email');

router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password) return res.status(400).json({ error: 'All fields are required.' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    let user = await User.findOne({ email });
    
    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    if (user) {
      if (user.is_verified || !user.verification_otp) {
        return res.status(409).json({ error: 'Email already registered.' });
      }
      // Resend OTP for unverified user
      user.verification_otp = otp;
      user.otp_expires = otpExpires;
      user.password = bcrypt.hashSync(password, 10);
      await user.save();
    } else {
      const hashed = bcrypt.hashSync(password, 10);
      user = await User.create({ 
        name, email, phone, password: hashed, role: 'customer', 
        is_verified: false, verification_otp: otp, otp_expires: otpExpires 
      });
    }

    await sendRegistrationOTP(email, otp);
    res.status(200).json({ message: 'OTP sent to your email. Please verify to complete registration.', email });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required.' });

    const user = await User.findOne({ email, is_verified: false });
    if (!user) return res.status(400).json({ error: 'Invalid request or user already verified.' });

    if (user.verification_otp !== otp || user.otp_expires < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired OTP.' });
    }

    user.is_verified = true;
    user.verification_otp = undefined;
    user.otp_expires = undefined;
    await user.save();

    const token = jwt.sign({ id: user._id, email: user.email, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Registration verified successfully!', token, user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role } });
  } catch (error) {
    console.error('OTP Verification error:', error);
    res.status(500).json({ error: 'Verification failed.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

    const user = await User.findOne({ email });
    if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid email or password.' });

    // Block unverified users ONLY if they are part of the new OTP system
    if (!user.is_verified && user.verification_otp) {
      return res.status(403).json({ error: 'Please verify your email address before logging in.', requires_verification: true, email });
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

    const token = require('crypto').randomBytes(20).toString('hex');
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
