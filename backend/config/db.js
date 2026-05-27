const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGODB_URI;

const connectDB = async () => {
  if (!MONGO_URI) {
    throw new Error("MONGODB_URI is not defined in environment variables");
  }

  const safeUri = MONGO_URI.replace(/\/\/.*@/, "//***:***@");
  console.log("🔄 Connecting to MongoDB:", safeUri);

  try {
    await mongoose.connect(MONGO_URI, {
      // ✅ Removed deprecated useNewUrlParser / useUnifiedTopology (auto in Mongoose 7+)
      serverSelectionTimeoutMS: 30_000,
      socketTimeoutMS: 60_000,
      connectTimeoutMS: 30_000,
      maxPoolSize: 20,         // allow more concurrent queries
      minPoolSize: 5,
      maxIdleTimeMS: 60_000,
      heartbeatFrequencyMS: 10_000,
      retryWrites: true,
      retryReads: true,
      family: 4,               // force IPv4
    });

    console.log(`✅ MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    // Retry after 5s (non-fatal on startup)
    setTimeout(connectDB, 5_000);
  }
};

// ─── Connection event listeners ───────────────────────────────────────────
mongoose.connection.on("disconnected", () => {
  console.warn("⚠️  MongoDB disconnected — attempting reconnect...");
  setTimeout(connectDB, 3_000);
});

mongoose.connection.on("reconnected", () => {
  console.log("✅ MongoDB reconnected");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB error:", err.message);
});

module.exports = connectDB;
