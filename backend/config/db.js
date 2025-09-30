const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not defined in environment variables!");
    }

    console.log("🔄 Backend: Attempting to connect to MongoDB...");
    console.log(
      "📍 Backend: Connection URI:",
      process.env.MONGODB_URI.replace(
        /\/\/.*@/,
        "//***:***@" // mask credentials in logs
      )
    );

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // 30 seconds timeout for server selection
      socketTimeoutMS: 60000, // 60 seconds socket timeout
      connectTimeoutMS: 30000, // 30 seconds connection timeout
      maxPoolSize: 10,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
      retryWrites: true,
      retryReads: true,
      heartbeatFrequencyMS: 10000, // Send heartbeat every 10 seconds
      family: 4, // Use IPv4
    });

    console.log("✅ Backend: MongoDB connected successfully");
    console.log(`🏠 Backend: Database host: ${conn.connection.host}`);
    console.log(`📊 Backend: Database name: ${conn.connection.name}`);
  } catch (err) {
    console.error("❌ Backend: MongoDB connection failed:", err.message);
    console.error("🔍 Backend: Error details:", {
      name: err.name,
      code: err.code,
      codeName: err.codeName,
    });

    // retry after 5s instead of killing the server immediately
    setTimeout(connectDB, 5000);
  }
};

module.exports = connectDB;
