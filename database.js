const mongoose = require('mongoose');

async function connectDB() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/batter_shop';
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected successfully');

    // Auto-seed admin user
    const bcrypt = require('bcryptjs');
    const User = require('./models/User');
    const adminPassword = bcrypt.hashSync('admin123', 10);
    const existing = await User.findOne({ email: 'admin@battershop.com' });
    if (!existing) {
      await User.create({ name: 'Admin', email: 'admin@battershop.com', phone: '9999999999', password: adminPassword, role: 'admin' });
      console.log('✅ Auto-created Admin: admin@battershop.com / admin123');
    }
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

module.exports = { connectDB };
