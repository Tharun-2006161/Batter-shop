const jwt = require('jsonwebtoken');

// Authenticate JWT token
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

// Check if user is admin
function isAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }
  next();
}

// Check if booking is open (9 PM to next day 1:30 PM)
function isBookingOpen(req, res, next) {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTime = hours * 60 + minutes; // Convert to minutes

  // Booking window: 21:00 (9 PM) to next day 13:30 (1:30 PM)
  // In minutes: 21*60=1260 to 13*60+30=810 (next day)
  const openTime = 21 * 60;      // 9:00 PM = 1260 minutes
  const closeTime = 13 * 60 + 30; // 1:30 PM = 810 minutes

  // Booking is open if:
  // - Current time >= 9:00 PM (1260+) OR
  // - Current time <= 1:30 PM (0-810)
  const isOpen = currentTime >= openTime || currentTime <= closeTime;

  if (!isOpen) {
    return res.status(403).json({
      error: 'Booking is closed.',
      message: 'Orders are accepted only between 9:00 PM and 1:30 PM next day.',
      currentTime: `${hours}:${minutes.toString().padStart(2, '0')}`,
      bookingWindow: '9:00 PM - 1:30 PM'
    });
  }
  next();
}

module.exports = { authenticate, isAdmin, isBookingOpen };
