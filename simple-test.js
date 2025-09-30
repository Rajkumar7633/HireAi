const mongoose = require('mongoose');

async function simpleTest() {
  try {
    // Connect with minimal options
    await mongoose.connect('mongodb://localhost:27017/hireaiproject', {
      bufferCommands: false,
    });
    
    console.log('✅ Connected successfully');
    
    // Import and test the model
    const VideoInterview = require('./backend/models/VideoInterview');
    
    // Create a simple test document
    const testDoc = new VideoInterview({
      applicationId: new mongoose.Types.ObjectId(),
      recruiterId: new mongoose.Types.ObjectId(),
      candidateId: new mongoose.Types.ObjectId(),
      jobId: new mongoose.Types.ObjectId(),
      scheduledDate: new Date(),
      duration: 60,
      roomId: 'f77cbfe9-7d51-426b-8cf4-5ad5e5be5c10'
    });
    
    await testDoc.save();
    console.log('✅ Test document created');
    
    // Try to find it
    const found = await VideoInterview.findOne({ roomId: 'f77cbfe9-7d51-426b-8cf4-5ad5e5be5c10' });
    console.log('✅ Document found:', !!found);
    
    await mongoose.disconnect();
    console.log('✅ Test completed successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

simpleTest();