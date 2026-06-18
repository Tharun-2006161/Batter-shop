// Page renderers
const Pages = {
  home() {
    return `<section class="hero"><div class="hero-content">
      <div class="hero-badge">🕐 Orders open 8 PM – 2:00 PM</div>
      <h1 class="hero-title">Fresh <span class="highlight">Idli & Dosa</span> Batter</h1>
      <p class="hero-subtitle">Order premium quality batter online. Pay now or later — we've got you covered.</p>
      <div class="hero-actions">
        <button class="btn btn-primary btn-lg" onclick="navigateTo('register')">Get Started</button>
        <button class="btn btn-outline btn-lg" onclick="navigateTo('login')">Login</button>
      </div>
      <div class="hero-stats">
        <div class="hero-stat"><div class="hero-stat-value">₹25</div><div class="hero-stat-label">Per Packet</div></div>
        <div class="hero-stat"><div class="hero-stat-value">Fresh</div><div class="hero-stat-label">Daily Made</div></div>
        <div class="hero-stat"><div class="hero-stat-value">24/7</div><div class="hero-stat-label">Credit System</div></div>
      </div></div></section>`;
  },

  login() {
    return `<div class="auth-page"><div class="auth-card fade-in">
      <div class="auth-header"><span class="auth-icon">🔐</span><h2 class="auth-title">Welcome Back</h2><p class="auth-subtitle">Login to your account</p></div>
      <form onsubmit="handleLogin(event)">
        <div class="form-group"><label class="form-label">Email</label><input class="form-input" type="email" id="loginEmail" required placeholder="you@example.com"></div>
        <div class="form-group">
          <div style="display:flex; justify-content:space-between;">
            <label class="form-label">Password</label>
            <span class="auth-link" style="font-size:12px; margin-bottom:5px;" onclick="navigateTo('forgot-password')">Forgot password?</span>
          </div>
          <input class="form-input" type="password" id="loginPassword" required placeholder="••••••••">
        </div>
        <button class="btn btn-primary btn-block btn-lg" type="submit">Login</button>
      </form>
      <p class="auth-footer">Don't have an account? <span class="auth-link" onclick="navigateTo('register')">Register here</span></p>
      <p class="auth-footer" style="margin-top:0.5rem"><span class="auth-link" onclick="navigateTo('admin-login')">Admin Login →</span></p>
    </div></div>`;
  },

  forgotPassword() {
    return `<div class="auth-page"><div class="auth-card fade-in">
      <div class="auth-header"><span class="auth-icon">🔑</span><h2 class="auth-title">Forgot Password</h2><p class="auth-subtitle">Enter your email to reset</p></div>
      <form onsubmit="handleForgotPassword(event)">
        <div class="form-group"><label class="form-label">Email</label><input class="form-input" type="email" id="forgotEmail" required placeholder="you@example.com"></div>
        <button class="btn btn-primary btn-block btn-lg" type="submit">Send Reset Link</button>
      </form>
      <p class="auth-footer"><span class="auth-link" onclick="navigateTo('login')">← Back to Login</span></p>
    </div></div>`;
  },

  resetPassword() {
    return `<div class="auth-page"><div class="auth-card fade-in">
      <div class="auth-header"><span class="auth-icon">🔒</span><h2 class="auth-title">Reset Password</h2><p class="auth-subtitle">Create a new password</p></div>
      <form onsubmit="handleResetPassword(event)">
        <div class="form-group"><label class="form-label">New Password</label><input class="form-input" type="password" id="resetPassword" required minlength="6" placeholder="Min 6 characters"></div>
        <button class="btn btn-primary btn-block btn-lg" type="submit">Update Password</button>
      </form>
      <p class="auth-footer"><span class="auth-link" onclick="navigateTo('login')">← Back to Login</span></p>
    </div></div>`;
  },

  register() {
    return `<div class="auth-page"><div class="auth-card fade-in">
      <div class="auth-header"><span class="auth-icon">✨</span><h2 class="auth-title">Create Account</h2><p class="auth-subtitle">Join us for fresh batter daily</p></div>
      <form onsubmit="handleRegister(event)">
        <div class="form-group"><label class="form-label">Full Name</label><input class="form-input" type="text" id="regName" required placeholder="Your name"></div>
        <div class="form-group"><label class="form-label">Email</label><input class="form-input" type="email" id="regEmail" required placeholder="you@example.com"></div>
        <div class="form-group"><label class="form-label">Password</label><input class="form-input" type="password" id="regPassword" required minlength="6" placeholder="Min 6 characters"></div>
        <button class="btn btn-primary btn-block btn-lg" type="submit">Register</button>
      </form>
      <p class="auth-footer">Already have an account? <span class="auth-link" onclick="navigateTo('login')">Login here</span></p>
    </div></div>`;
  },

  verifyOtp() {
    return `<div class="auth-page"><div class="auth-card fade-in">
      <div class="auth-header"><span class="auth-icon">🔐</span><h2 class="auth-title">Verify Email</h2><p class="auth-subtitle">We sent a 6-digit code to your email</p></div>
      <form onsubmit="handleVerifyOTP(event)">
        <div class="form-group"><label class="form-label">Enter OTP Code</label><input class="form-input" type="text" id="verifyOtpInput" required minlength="6" maxlength="6" placeholder="123456" style="text-align:center; font-size:1.5rem; letter-spacing:5px;"></div>
        <button class="btn btn-primary btn-block btn-lg" type="submit">Verify & Login</button>
      </form>
      <p class="auth-footer"><span class="auth-link" onclick="navigateTo('register')">← Back to Register</span></p>
    </div></div>`;
  },

  adminLogin() {
    return `<div class="auth-page"><div class="auth-card fade-in">
      <div class="auth-header"><span class="auth-icon">🛡️</span><h2 class="auth-title">Admin Login</h2><p class="auth-subtitle">Access the management panel</p></div>
      <form onsubmit="handleAdminLogin(event)">
        <div class="form-group"><label class="form-label">Admin Email</label><input class="form-input" type="email" id="adminEmail" required value="admin@battershop.com"></div>
        <div class="form-group"><label class="form-label">Password</label><input class="form-input" type="password" id="adminPassword" required placeholder="••••••••"></div>
        <button class="btn btn-primary btn-block btn-lg" type="submit">Login as Admin</button>
      </form>
      <p class="auth-footer"><span class="auth-link" onclick="navigateTo('login')">← Customer Login</span></p>
    </div></div>`;
  }
};
