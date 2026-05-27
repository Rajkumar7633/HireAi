const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const helmet = require("helmet");
const compression = require("compression");
const mongoSanitize = require("express-mongo-sanitize");
const { v4: uuidv4 } = require("uuid");

const dotenv = require("dotenv");
dotenv.config({ path: "./.env" });

// ─── Startup: validate required env vars ───────────────────────────────────
const REQUIRED_ENV = ["JWT_SECRET", "MONGODB_URI"];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`\n❌ FATAL: Missing required environment variables:\n  ${missing.join("\n  ")}\nAdd them to your .env file and restart.\n`);
  process.exit(1);
}

// ✅ import after dotenv is loaded
const connectDB = require("./config/db");
connectDB();

// Load DB indexes in background (non-blocking)
require("./models/indexes").ensureIndexes().catch((e) =>
  console.warn("⚠️  Index creation failed (non-fatal):", e.message)
);

const app = express();
const server = http.createServer(app);

// ─── Security headers (helmet) ─────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false, // managed via custom header below
    crossOriginEmbedderPolicy: false,
  })
);

// ─── Gzip / Brotli compression ─────────────────────────────────────────────
app.use(
  compression({
    level: 6, // good balance speed vs size
    threshold: 1024, // only compress responses > 1KB
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) return false;
      return compression.filter(req, res);
    },
  })
);

// ─── Request ID (tracing) ──────────────────────────────────────────────────
app.use((req, _res, next) => {
  req.id = req.headers["x-request-id"] || uuidv4();
  next();
});

// ─── Socket.io ─────────────────────────────────────────────────────────────
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

global.io = io;

io.on("connection", (socket) => {
  // join user's personal notification room
  socket.on("join_user_room", (userId) => {
    if (userId) socket.join(`user_${userId}`);
  });

  socket.on("disconnect", () => {
    // no-op — socket.io handles cleanup
  });
});

// ─── Upload directories ────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, "../uploads");
["resumes", "general"].forEach((dir) => {
  const fullPath = path.join(uploadsDir, dir);
  if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
});

// ─── Stripe webhook (MUST be before JSON parser) ───────────────────────────
const billingController = require("./controllers/billingController");
app.post(
  "/api/billing/webhook",
  express.raw({ type: "application/json" }),
  billingController.webhook
);

// ─── Body parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// ─── MongoDB injection sanitization ───────────────────────────────────────
// Strips $ and . from user inputs to prevent operator injection attacks
app.use(mongoSanitize({ replaceWith: "_" }));

// ─── CORS ──────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:3000")
  .split(",")
  .map((s) => s.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow no-origin (Postman, server-to-server) and whitelisted origins
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token", "X-Request-ID"],
  })
);

// ─── Additional security headers ───────────────────────────────────────────
app.use((_req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  const csp = [
    "default-src 'self'",
    "img-src 'self' data: blob: https://res.cloudinary.com",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "connect-src 'self' *",
  ].join("; ");
  res.setHeader("Content-Security-Policy", csp);
  next();
});

// ─── Static files ──────────────────────────────────────────────────────────
app.use(
  "/uploads",
  express.static(uploadsDir, {
    maxAge: "7d",
    etag: true,
    lastModified: true,
  })
);

// ─── Health check ──────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
  });
});

app.get("/", (_req, res) => {
  res.json({ message: "HireAI API is running", timestamp: new Date() });
});

// ─── API Routes ────────────────────────────────────────────────────────────
app.use("/api/billing",          require("./routes/billing"));
app.use("/api/auth",             require("./routes/auth"));
app.use("/api/resume",           require("./routes/resume"));
app.use("/api/job-description",  require("./routes/jobDescription"));
app.use("/api/match",            require("./routes/match"));
app.use("/api/user",             require("./routes/user"));
app.use("/api/admin",            require("./routes/admin"));
app.use("/api/history",          require("./routes/history"));
app.use("/api/analytics",        require("./routes/analytics"));
app.use("/api/notifications",    require("./routes/notification"));
app.use("/api/structured-resume",require("./routes/structuredResume"));
app.use("/api/ats",              require("./routes/ats"));
app.use("/api/applications",     require("./routes/jobApplication"));
app.use("/api/upload",           require("./routes/upload"));
app.use("/api/conversations",    require("./routes/conversation"));
app.use("/api/tests",            require("./routes/test"));
app.use("/api/ai-screening",     require("./routes/aiScreening"));
app.use("/api/video-interviews", require("./routes/videoInterview"));
app.use("/api/candidates",       require("./routes/candidates"));
app.use("/api/skills",           require("./routes/skills"));
app.use("/api/mock-interview",   require("./routes/mockInterview"));
app.use("/api/recruiter-agent",   require("./routes/recruiterAgent"));


// ─── 404 catch-all ─────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found` });
});

// ─── Global error handler ──────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error(`[${req.id}] Unhandled error:`, err);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

// ─── Start server ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`✅ HireAI backend running on port ${PORT}`);
  console.log(`🔌 Socket.io enabled`);
  console.log(`🗜️  Compression enabled`);
  console.log(`🛡️  Helmet security headers enabled`);
});

// ─── Graceful shutdown ─────────────────────────────────────────────────────
const shutdown = (signal) => {
  console.log(`\n${signal} received — shutting down gracefully...`);
  server.close(async () => {
    try {
      const mongoose = require("mongoose");
      await mongoose.connection.close();
      console.log("✅ MongoDB connection closed");
    } catch (e) {
      console.error("Error closing MongoDB:", e.message);
    }
    console.log("✅ HTTP server closed");
    process.exit(0);
  });

  // Force exit after 10s if server doesn't close cleanly
  setTimeout(() => {
    console.error("⚠️  Forced shutdown after 10s");
    process.exit(1);
  }, 10_000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err);
});
