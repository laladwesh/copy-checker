// scripts/seedUsers.js
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User      = require('./models/User');

async function seed() {
  // 1) connect to DB
  await connectDB();

  // 2) define your users
  const users = [
    { email: 'guptaavinash302@gmail.com', role: 'admin' },
    { email: 'laladwesh@gmail.com',      role: 'examiner' },
    {
      email: 'testgupta85@gmail.com',
      role: 'student',
      batch: 'Batch-2',
      gender: 'Male'
    }
  ];

  // 3) remove any existing with those emails
  await User.deleteMany({
    email: { $in: users.map(u => u.email) }
  });

  // 4) insert new ones
  await User.insertMany(users);

  console.log('✅ Seeded users:', users.map(u => `${u.email} (${u.role})`).join(', '));
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
