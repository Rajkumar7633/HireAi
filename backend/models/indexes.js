/**
 * backend/models/indexes.js
 *
 * Ensures all performance-critical indexes exist on MongoDB collections.
 * Called once on server startup (non-blocking).
 *
 * Run manually: node -e "require('./models/indexes').ensureIndexes()"
 */

const mongoose = require("mongoose");

async function ensureIndexes() {
  const db = mongoose.connection.db;

  // Wait until connected
  if (!db) {
    await new Promise((resolve) => mongoose.connection.once("open", resolve));
  }

  // ─── JobDescription ───────────────────────────────────────────────────────
  const jobs = db.collection("jobdescriptions");
  await Promise.all([
    jobs.createIndex({ recruiterId: 1, createdAt: -1 }),
    jobs.createIndex({ status: 1 }),
    jobs.createIndex({ skills: 1 }),
    jobs.createIndex({ title: "text", description: "text" }), // full-text search
  ]);

  // ─── JobApplication ───────────────────────────────────────────────────────
  const apps = db.collection("jobapplications");
  await Promise.all([
    apps.createIndex({ jobSeekerId: 1, createdAt: -1 }),
    apps.createIndex({ jobDescriptionId: 1, status: 1 }),
    apps.createIndex({ jobSeekerId: 1, testId: 1 }),       // test assignment lookup
    apps.createIndex({ status: 1 }),
    apps.createIndex({ testId: 1 }),
  ]);

  // ─── User ────────────────────────────────────────────────────────────────
  const users = db.collection("users");
  await Promise.all([
    users.createIndex({ email: 1 }, { unique: true, sparse: true }),
    users.createIndex({ role: 1 }),
    users.createIndex({ createdAt: -1 }),
  ]);

  // ─── Resume ──────────────────────────────────────────────────────────────
  const resumes = db.collection("resumes");
  await Promise.all([
    resumes.createIndex({ userId: 1 }, { unique: true, sparse: true }),
    resumes.createIndex({ atsScore: -1 }),
    resumes.createIndex({ updatedAt: -1 }),
  ]);

  // ─── Match ───────────────────────────────────────────────────────────────
  const matches = db.collection("matches");
  await Promise.all([
    matches.createIndex({ jobDescriptionId: 1, matchScore: -1 }),
    matches.createIndex({ resumeId: 1 }),
  ]);

  // ─── Notification ─────────────────────────────────────────────────────────
  const notifications = db.collection("notifications");
  await Promise.all([
    notifications.createIndex({ userId: 1, read: 1, createdAt: -1 }),
    notifications.createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 90 * 24 * 60 * 60 } // TTL: auto-delete after 90 days
    ),
  ]);

  // ─── Test ─────────────────────────────────────────────────────────────────
  const tests = db.collection("tests");
  await Promise.all([
    tests.createIndex({ recruiterId: 1, createdAt: -1 }),
  ]);

  // ─── TestSubmission ───────────────────────────────────────────────────────
  const submissions = db.collection("testsubmissions");
  await Promise.all([
    submissions.createIndex({ testId: 1, percentage: -1 }),
    submissions.createIndex({ candidateId: 1, testId: 1 }),
    submissions.createIndex({ applicationId: 1 }),
    submissions.createIndex({ recruiterId: 1 }),
  ]);

  // ─── Conversation ─────────────────────────────────────────────────────────
  const conversations = db.collection("conversations");
  await Promise.all([
    conversations.createIndex({ participants: 1, updatedAt: -1 }),
  ]);

  console.log("✅ All MongoDB indexes ensured");
}

module.exports = { ensureIndexes };
