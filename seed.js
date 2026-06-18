require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Setting = require('./models/Setting');

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/batter_shop';
  await mongoose.connect(uri);
  console.log('🌱 Seeding database...\n');

  // Create admin
  const adminPassword = bcrypt.hashSync('admin123', 10);
  const existing = await User.findOne({ email: 'admin@battershop.com' });
  if (!existing) {
    await User.create({ name: 'Admin', email: 'admin@battershop.com', phone: '9999999999', password: adminPassword, role: 'admin' });
    console.log('✅ Admin created: admin@battershop.com / admin123');
  } else {
    console.log('ℹ️  Admin already exists.');
  }

  // Create sample customers
  const customers = [
    { name: 'Ravi Kumar', email: 'ravi@example.com', phone: '9876543210' },
    { name: 'Priya Sharma', email: 'priya@example.com', phone: '9876543211' },
  ];
  const custPass = bcrypt.hashSync('customer123', 10);
  for (const c of customers) {
    if (!(await User.findOne({ email: c.email }))) {
      await User.create({ name: c.name, email: c.email, phone: c.phone, password: custPass, role: 'customer' });
      console.log(`✅ Customer: ${c.name} (${c.email})`);
    }
  }

  // Default settings
  await Setting.findOneAndUpdate({ key: 'idli_price' }, { value: '25' }, { upsert: true });
  await Setting.findOneAndUpdate({ key: 'dosa_price' }, { value: '25' }, { upsert: true });
  console.log('✅ Default prices set (₹25 each)');

  console.log('\n📋 Customer password: customer123\n🌱 Done!\n');
  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
