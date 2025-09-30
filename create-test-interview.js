const mongoose = require('mongoose');
const VideoInterview = require('./backend/models/VideoInterview');

const MONGODB_URI = 'mongodb://localhost:27017/hireaiproject';

async function createTestInterview() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Create a test interview with the ID from your error
    const testInterview = new VideoInterview({
      _id: new mongoose.Types.ObjectId(),
      applicationId: new mongoose.Types.ObjectId(),
      recruiterId: new mongoose.Types.ObjectId(),
      candidateId: new mongoose.Types.ObjectId(),
      jobId: new mongoose.Types.ObjectId(),
      scheduledDate: new Date(),
      duration: 60,
      status: 'scheduled',
      roomId: 'f77cbfe9-7d51-426b-8cf4-5ad5e5be5c10'
    });
    
    await testInterview.save();
    console.log('✅ Test interview created with roomId:', testInterview.roomId);
    
    // Verify it was created
    const found = await VideoInterview.findOne({ roomId: 'f77cbfe9-7d51-426b-8cf4-5ad5e5be5c10' });
    console.log('✅ Interview found:', found ? 'Yes' : 'No');
    
    await mongoose.disconnect();
    console.log('✅ Test completed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createTestInterview();