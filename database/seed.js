/**
 * Seed script — run with: node database/seed.js
 * Creates default users using the Mongoose model (bcrypt hashing included).
 */
require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cancer_diagnosis';

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  passwordHash: String,
  role: { type: String, enum: ['admin', 'physician', 'auditor'] },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date, default: null },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

const SEED_USERS = [
  { name: 'System Administrator', email: 'admin@hospital.com',       password: 'admin123',      role: 'admin'     },
  { name: 'Dr. Sarah Smith',       email: 'dr.smith@hospital.com',    password: 'physician123',  role: 'physician' },
  { name: 'Research Auditor',      email: 'auditor@hospital.com',     password: 'auditor123',    role: 'auditor'   },
];

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB:', MONGODB_URI);

  for (const u of SEED_USERS) {
    const exists = await User.findOne({ email: u.email });
    if (exists) {
      console.log(`   ⚠  User already exists: ${u.email}`);
      continue;
    }
    const passwordHash = await bcrypt.hash(u.password, 12);
    await User.create({ name: u.name, email: u.email, passwordHash, role: u.role });
    console.log(`   ✅ Created ${u.role}: ${u.email} / ${u.password}`);
  }

  // Create indexes
  await User.collection.createIndex({ email: 1 }, { unique: true });
  console.log('\n✅ Indexes ensured.');
  console.log('\nDemo login credentials:');
  console.log('  Admin    → admin@hospital.com      / admin123');
  console.log('  Physician→ dr.smith@hospital.com   / physician123');
  console.log('  Auditor  → auditor@hospital.com    / auditor123');

  await mongoose.disconnect();
  console.log('\n✅ Done! Database seeded successfully.');
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
