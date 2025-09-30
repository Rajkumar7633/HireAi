const bcrypt = require("bcryptjs");
const { MongoClient } = require("mongodb");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/hireai";

async function seedDemoUsers() {
  if (!MONGODB_URI) {
    console.error("Please set MONGODB_URI environment variable");
    return;
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db();
    const users = db.collection("users");

    // Check if demo users already exist
    const existingRecruiter = await users.findOne({
      email: "recruiter@demo.com",
    });
    const existingJobSeeker = await users.findOne({
      email: "jobseeker@demo.com",
    });

    if (!existingRecruiter) {
      const recruiterPassword = await bcrypt.hash("demo123", 12);
      await users.insertOne({
        name: "Demo Recruiter",
        email: "recruiter@demo.com",
        passwordHash: recruiterPassword,
        role: "recruiter",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log("✅ Demo recruiter created: recruiter@demo.com / demo123");
    } else {
      console.log(
        "✅ Demo recruiter already exists: recruiter@demo.com / demo123"
      );
    }

    if (!existingJobSeeker) {
      const jobSeekerPassword = await bcrypt.hash("demo123", 12);
      await users.insertOne({
        name: "Demo Job Seeker",
        email: "jobseeker@demo.com",
        passwordHash: jobSeekerPassword,
        role: "job_seeker",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log("✅ Demo job seeker created: jobseeker@demo.com / demo123");
    } else {
      console.log(
        "✅ Demo job seeker already exists: jobseeker@demo.com / demo123"
      );
    }

    console.log("\n🎉 Demo users are ready!");
    console.log("Recruiter: recruiter@demo.com / demo123");
    console.log("Job Seeker: jobseeker@demo.com / demo123");
  } catch (error) {
    console.error("❌ Error seeding demo users:", error);
  } finally {
    await client.close();
  }
}

seedDemoUsers();
