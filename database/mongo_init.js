/**
 * MongoDB Initialization Script
 * Run automatically by Docker or manually: mongosh cancer_diagnosis < mongo_init.js
 */

// Switch to the cancer_diagnosis database
db = db.getSiblingDB('cancer_diagnosis');

// ─── Create Collections with Validation ───────────────────────────────────────

db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'email', 'passwordHash', 'role'],
      properties: {
        name:         { bsonType: 'string', description: 'Full name' },
        email:        { bsonType: 'string', description: 'Unique email address' },
        passwordHash: { bsonType: 'string', description: 'bcrypt hash' },
        role:         { bsonType: 'string', enum: ['admin', 'physician', 'auditor'] },
        isActive:     { bsonType: 'bool' },
        lastLogin:    { bsonType: ['date', 'null'] },
      },
    },
  },
});

db.createCollection('cases');
db.createCollection('inferenceresults');

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Users
db.users.createIndex({ email: 1 }, { unique: true, name: 'idx_users_email' });
db.users.createIndex({ role: 1 }, { name: 'idx_users_role' });

// Cases
db.cases.createIndex({ physicianId: 1 }, { name: 'idx_cases_physician' });
db.cases.createIndex({ status: 1 }, { name: 'idx_cases_status' });
db.cases.createIndex({ patientUUID: 1 }, { unique: true, name: 'idx_cases_patient_uuid' });
db.cases.createIndex({ createdAt: -1 }, { name: 'idx_cases_created' });

// Inference Results
db.inferenceresults.createIndex({ caseId: 1 }, { unique: true, name: 'idx_results_case' });
db.inferenceresults.createIndex({ diagnosis: 1 }, { name: 'idx_results_diagnosis' });

// ─── Seed: Default Admin User ─────────────────────────────────────────────────
// Password: admin123  (bcrypt hash below, rounds=12)
// CHANGE THIS IN PRODUCTION!

const adminExists = db.users.findOne({ email: 'admin@hospital.com' });
if (!adminExists) {
  db.users.insertOne({
    name:         'System Administrator',
    email:        'admin@hospital.com',
    // bcrypt hash of 'admin123' with salt rounds=12 — verified correct
    passwordHash: '$2a$12$0thiJ7fIm8tJHZBXO82UOebdzvskjzEg1LGdeFwlBEJh8iKTaJ4Xq',
    role:         'admin',
    isActive:     true,
    lastLogin:    null,
    createdAt:    new Date(),
    updatedAt:    new Date(),
  });
  print('✅ Default admin user created: admin@hospital.com / admin123');
}

// ─── Seed: Sample Physician ───────────────────────────────────────────────────
// Password: physician123
const physicianExists = db.users.findOne({ email: 'dr.smith@hospital.com' });
if (!physicianExists) {
  db.users.insertOne({
    name:         'Dr. Sarah Smith',
    email:        'dr.smith@hospital.com',
    passwordHash: '$2a$12$QuF2T7FuyV.vrIN5dK3i.OqslagIGOdpYiwF2H7mpKUAl7OD/8w0G', // physician123 — verified correct
    role:         'physician',
    isActive:     true,
    lastLogin:    null,
    createdAt:    new Date(),
    updatedAt:    new Date(),
  });
  print('✅ Sample physician created: dr.smith@hospital.com / physician123');
}

// ─── Seed: Sample Auditor ─────────────────────────────────────────────────────
const auditorExists = db.users.findOne({ email: 'auditor@hospital.com' });
if (!auditorExists) {
  db.users.insertOne({
    name:         'Research Auditor',
    email:        'auditor@hospital.com',
    passwordHash: '$2a$12$o4NPWaaI5NH4q1bFS24/ZOI0vL2xzuxeJlKTeVN49v1f1v1kiRImC', // auditor123 — verified correct
    role:         'auditor',
    isActive:     true,
    lastLogin:    null,
    createdAt:    new Date(),
    updatedAt:    new Date(),
  });
  print('\u2705 Sample auditor created: auditor@hospital.com / auditor123');
}

print('✅ MongoDB initialization complete!');
print('   Collections: users, cases, inferenceresults');
print('   Indexes created successfully');
