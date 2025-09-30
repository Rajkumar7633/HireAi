const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/hireaiproject';

async function testConnection() {
  try {
    console.log('🔄 Testing MongoDB connection...');
    
    await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10000,
      connectTimeoutMS: 5000,
    });
    
    console.log('✅ Connected to MongoDB successfully');
    console.log('🏠 Database host:', mongoose.connection.host);
    console.log('📊 Database name:', mongoose.connection.name);
    
    // Test a simple operation
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📋 Available collections:', collections.map(c => c.name));
    
    // Test VideoInterview model
    const VideoInterview = require('./backend/models/VideoInterview');
    const count = await VideoInterview.countDocuments();
    console.log('📊 VideoInterview documents count:', count);
    
    await mongoose.disconnect();
    console.log('✅ Test completed successfully');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    process.exit(1);
  }
}

testConnection();