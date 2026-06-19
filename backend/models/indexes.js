/**
 * backend/models/indexes.js
 *
 * Ensures all performance-critical indexes exist on MongoDB collections.
 * Called once on server startup (non-blocking).
 *
 * Run manually: node -e "require('./models/indexes').ensureIndexes()"
 */

const mongoose = require("mongoose");

/** Ignore "index already exists" conflicts — indexes were created on a prior deploy. */
async function safeCreateIndex(collection, spec, options) {
  try {
    await collection.createIndex(spec, options);
  } catch (err) {
    const code = err?.code;
    const msg = String(err?.message || "");
    if (code === 85 || code === 86 || msg.includes("already exists") || msg.includes("same name")) {
      return;
    }
    throw err;
  }
}

async function ensureIndexes() {
  if (mongoose.connection.readyState !== 1) {
    await new Promise((resolve) => mongoose.connection.once("open", resolve));
  }

  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB connection not ready");

  // ─── JobDescription ───────────────────────────────────────────────────────
  const jobs = db.collection("jobdescriptions");
  await Promise.all([
    safeCreateIndex(jobs, { recruiterId: 1, createdAt: -1 }),
    safeCreateIndex(jobs, { status: 1 }),
    safeCreateIndex(jobs, { skills: 1 }),
    safeCreateIndex(jobs, { title: "text", description: "text" }),
  ]);

  // ─── JobApplication ───────────────────────────────────────────────────────
  const apps = db.collection("jobapplications");
  await Promise.all([
    safeCreateIndex(apps, { jobSeekerId: 1, createdAt: -1 }),
    safeCreateIndex(apps, { jobDescriptionId: 1, status: 1 }),
    safeCreateIndex(apps, { jobSeekerId: 1, testId: 1 }),
    safeCreateIndex(apps, { status: 1 }),
    safeCreateIndex(apps, { testId: 1 }),
  ]);

  // ─── User ────────────────────────────────────────────────────────────────
  const users = db.collection("users");
  await Promise.all([
    safeCreateIndex(users, { email: 1 }, { unique: true, sparse: true }),
    safeCreateIndex(users, { role: 1 }),
    safeCreateIndex(users, { createdAt: -1 }),
    safeCreateIndex(users, { firstName: 1, lastName: 1 }),
  ]);

  // ─── Resume ──────────────────────────────────────────────────────────────
  const resumes = db.collection("resumes");
  await Promise.all([
    safeCreateIndex(resumes, { userId: 1 }, { unique: true, sparse: true }),
    safeCreateIndex(resumes, { atsScore: -1 }),
    safeCreateIndex(resumes, { updatedAt: -1 }),
  ]);

  // ─── Match ───────────────────────────────────────────────────────────────
  const matches = db.collection("matches");
  await Promise.all([
    safeCreateIndex(matches, { jobDescriptionId: 1, matchScore: -1 }),
    safeCreateIndex(matches, { resumeId: 1 }),
  ]);

  // ─── Notification ─────────────────────────────────────────────────────────
  const notifications = db.collection("notifications");
  await Promise.all([
    safeCreateIndex(notifications, { userId: 1, read: 1, createdAt: -1 }),
    safeCreateIndex(
      notifications,
      { createdAt: 1 },
      { expireAfterSeconds: 90 * 24 * 60 * 60 }
    ),
  ]);

  // ─── Test ─────────────────────────────────────────────────────────────────
  const tests = db.collection("tests");
  await Promise.all([
    safeCreateIndex(tests, { recruiterId: 1, createdAt: -1 }),
  ]);

  // ─── TestSubmission ───────────────────────────────────────────────────────
  const submissions = db.collection("testsubmissions");
  await Promise.all([
    safeCreateIndex(submissions, { testId: 1, percentage: -1 }),
    safeCreateIndex(submissions, { candidateId: 1, testId: 1 }),
    safeCreateIndex(submissions, { applicationId: 1 }),
    safeCreateIndex(submissions, { recruiterId: 1 }),
  ]);

  // ─── Conversation ─────────────────────────────────────────────────────────
  const conversations = db.collection("conversations");
  await Promise.all([
    safeCreateIndex(conversations, { participants: 1, updatedAt: -1 }),
  ]);

  console.log("✅ All MongoDB indexes ensured");
}

module.exports = { ensureIndexes };
