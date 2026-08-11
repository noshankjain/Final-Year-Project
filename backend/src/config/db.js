const mongoose = require('mongoose');

const connectDB = async () => {
  let retries = 5;
  while (retries) {
    try {
      const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cancer_diagnosis';
      await mongoose.connect(uri);
      console.log('MongoDB connected successfully');
      break;
    } catch (err) {
      console.error('MongoDB connection error:', err.message);
      retries -= 1;
      console.log(`Retries left: ${retries}`);
      if (retries === 0) {
        console.error('Failed to connect to MongoDB. Exiting...');
        process.exit(1);
      }
      await new Promise(res => setTimeout(res, 5000));
    }
  }
};

module.exports = connectDB;
