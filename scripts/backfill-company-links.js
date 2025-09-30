const mongoose = require("mongoose");
// Try to load dotenv if available; otherwise do a tiny fallback loader
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const dotenv = require("dotenv");
  dotenv.config({ path: "../.env" });
} catch (e) {
  try {
    const fs = require("fs");
    const path = require("path");
    const envPath = path.resolve(__dirname, "../.env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      content
        .split(/\r?\n/)
        .filter((line) => line && !line.trim().startsWith("#"))
        .forEach((line) => {
          const idx = line.indexOf("=");
          if (idx > -1) {
            const key = line.slice(0, idx).trim();
            const value = line.slice(idx + 1).trim();
            if (!process.env[key]) process.env[key] = value;
          }
        });
    }
  } catch (_) {
    // ignore fallback errors; we'll error later if MONGODB_URI is missing
  }
}

// Define minimal models inline to avoid requiring TS/ESM from a Node script
const JobDescription = mongoose.models.JobDescription ||
  mongoose.model(
    "JobDescription",
    new mongoose.Schema(
      {
        recruiterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
        companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", index: true },
      },
      { strict: false },
    ),
  );

const Company = mongoose.models.Company ||
  mongoose.model(
    "Company",
    new mongoose.Schema(
      {
        ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, index: true },
      },
      { strict: false },
    ),
  );

async function connectDB() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error(
        "MONGODB_URI is not set. Please install 'dotenv' or export MONGODB_URI before running the script."
      );
    }
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected for backfill");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
}

async function backfillCompanyLinks() {
  await connectDB();
  try {
    const jobs = await JobDescription.find({ $or: [{ companyId: { $exists: false } }, { companyId: null }] }).lean();

    let updatedCount = 0;
    for (const job of jobs) {
      if (!job.recruiterId) continue;
      const company = await Company.findOne({ ownerId: job.recruiterId }).lean();
      if (!company) continue;

      await JobDescription.updateOne({ _id: job._id }, { $set: { companyId: company._id } });
      updatedCount++;
    }
    console.log(`✅ Backfill complete. Updated ${updatedCount} job(s) with companyId.`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Backfill failed:", err);
    process.exit(1);
  }
}

if (require.main === module) {
  backfillCompanyLinks();
}

module.exports = { backfillCompanyLinks };
