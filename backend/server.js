const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const dotenv = require("dotenv");
dotenv.config({ path: "./.env" });

// ✅ import after dotenv is loaded
const connectDB = require("./config/db");
connectDB();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

global.io = io;

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Join user to their personal room for notifications
  socket.on("join_user_room", (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined their notification room`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Create uploads folders if not exist
const uploadsDir = path.join(__dirname, "../uploads");
const subDirs = ["resumes", "general"];

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
subDirs.forEach((dir) => {
  const fullPath = path.join(uploadsDir, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath);
  }
});

// Stripe webhook must be registered BEFORE JSON parser to keep raw body
const billingController = require("./controllers/billingController");
app.post(
  "/api/billing/webhook",
  express.raw({ type: "application/json" }),
  billingController.webhook
);

// Middleware
app.use(express.json()); // for parsing application/json
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Basic security headers (kept permissive to avoid breaking existing behavior)
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");
  // Safer referrer information
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  // Disable MIME sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Very permissive CSP (kept broad to avoid breaking existing behavior)
  const csp = [
    "default-src 'self'" ,
    "img-src 'self' data: blob: https://res.cloudinary.com", // allow Cloudinary + data URLs
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // keep permissive to avoid breaking existing scripts
    "style-src 'self' 'unsafe-inline'",
    "connect-src 'self' *",
  ].join("; ");
  res.setHeader("Content-Security-Policy", csp);
  next();
});

// Serve static files
app.use("/uploads", express.static(uploadsDir));

// Basic test route
app.get("/", (req, res) => {
  res.json({ message: "Server is running!", timestamp: new Date() });
});

// API Routes
app.use("/api/billing", require("./routes/billing"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/resume", require("./routes/resume"));
app.use("/api/job-description", require("./routes/jobDescription"));
app.use("/api/match", require("./routes/match"));
app.use("/api/user", require("./routes/user"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/history", require("./routes/history"));
app.use("/api/analytics", require("./routes/analytics"));
app.use("/api/notifications", require("./routes/notification"));
app.use("/api/structured-resume", require("./routes/structuredResume"));
app.use("/api/ats", require("./routes/ats"));
app.use("/api/applications", require("./routes/jobApplication"));
app.use("/api/upload", require("./routes/upload"));
app.use("/api/conversations", require("./routes/conversation"));
app.use("/api/tests", require("./routes/test"));
app.use("/api/ai-screening", require("./routes/aiScreening"));
app.use("/api/video-interviews", require("./routes/videoInterview"));
app.use("/api/candidates", require("./routes/candidates"));
app.use("/api/skills", require("./routes/skills"));

// Simplified server startup
const PORT = process.env.PORT || 5001;

console.log(`🚀 Attempting to start server on port ${PORT}...`);

server.listen(PORT, (err) => {
  if (err) {
    console.error("❌ Server failed to start:", err);
    return;
  }
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Access your server at: http://localhost:${PORT}`);
  console.log(`📝 Test endpoint: http://localhost:${PORT}/`);
  console.log(`🔌 Socket.io enabled for real-time notifications`);
});

// Handle server errors
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err);
});
