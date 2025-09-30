const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
const dotenv = require("dotenv")

// Load environment variables
dotenv.config({ path: "../.env" })

// Import models
const User = require("../models/User")
const JobDescription = require("../models/JobDescription")
const Resume = require("../models/Resume")

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    console.log("✅ MongoDB connected for seeding")
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message)
    process.exit(1)
  }
}

const seedUsers = async () => {
  try {
    // Clear existing users
    await User.deleteMany({})
    console.log("🗑️ Cleared existing users")

    // Create admin user
    const adminPassword = await bcrypt.hash("admin123", 10)
    const admin = new User({
      name: "Admin User",
      email: "admin@hireai.com",
      password: adminPassword,
      role: "admin",
    })
    await admin.save()

    // Create sample recruiters
    const recruiterPassword = await bcrypt.hash("recruiter123", 10)
    const recruiters = [
      {
        name: "John Smith",
        email: "john@techcorp.com",
        password: recruiterPassword,
        role: "recruiter",
        companyName: "TechCorp Solutions",
        companyDescription: "Leading technology solutions provider",
        businessLocation: "San Francisco, CA",
      },
      {
        name: "Sarah Johnson",
        email: "sarah@innovate.com",
        password: recruiterPassword,
        role: "recruiter",
        companyName: "Innovate Labs",
        companyDescription: "Cutting-edge AI and ML research company",
        businessLocation: "New York, NY",
      },
    ]

    const savedRecruiters = await User.insertMany(recruiters)

    // Create sample job seekers
    const jobSeekerPassword = await bcrypt.hash("jobseeker123", 10)
    const jobSeekers = [
      {
        name: "Alice Brown",
        email: "alice@email.com",
        password: jobSeekerPassword,
        role: "job_seeker",
        professionalSummary: "Experienced software developer with 5+ years in full-stack development",
      },
      {
        name: "Bob Wilson",
        email: "bob@email.com",
        password: jobSeekerPassword,
        role: "job_seeker",
        professionalSummary: "Data scientist passionate about machine learning and analytics",
      },
    ]

    const savedJobSeekers = await User.insertMany(jobSeekers)

    console.log("✅ Created sample users:")
    console.log(`   - Admin: admin@hireai.com / admin123`)
    console.log(`   - Recruiters: ${recruiters.length} created`)
    console.log(`   - Job Seekers: ${jobSeekers.length} created`)

    return { admin, recruiters: savedRecruiters, jobSeekers: savedJobSeekers }
  } catch (error) {
    console.error("❌ Error seeding users:", error)
    throw error
  }
}

const seedJobDescriptions = async (recruiters) => {
  try {
    // Clear existing job descriptions
    await JobDescription.deleteMany({})
    console.log("🗑️ Cleared existing job descriptions")

    const jobDescriptions = [
      {
        recruiterId: recruiters[0]._id,
        title: "Senior Full Stack Developer",
        description:
          "We are looking for an experienced full-stack developer to join our growing team. You will work on cutting-edge web applications using modern technologies.",
        requirements: [
          "5+ years of experience in web development",
          "Proficiency in React, Node.js, and MongoDB",
          "Experience with cloud platforms (AWS/Azure)",
          "Strong problem-solving skills",
        ],
        responsibilities: [
          "Develop and maintain web applications",
          "Collaborate with cross-functional teams",
          "Write clean, maintainable code",
          "Participate in code reviews",
        ],
        location: "San Francisco, CA",
        salary: "$120,000 - $150,000",
        employmentType: "full-time",
        skills: ["React", "Node.js", "MongoDB", "AWS", "JavaScript", "TypeScript"],
        postedDate: new Date(),
      },
      {
        recruiterId: recruiters[1]._id,
        title: "Data Scientist",
        description:
          "Join our AI research team to work on groundbreaking machine learning projects. You'll analyze large datasets and build predictive models.",
        requirements: [
          "PhD or Master's in Data Science, Statistics, or related field",
          "3+ years of experience in machine learning",
          "Proficiency in Python, R, and SQL",
          "Experience with deep learning frameworks",
        ],
        responsibilities: [
          "Develop machine learning models",
          "Analyze complex datasets",
          "Present findings to stakeholders",
          "Collaborate with engineering teams",
        ],
        location: "New York, NY",
        salary: "$130,000 - $170,000",
        employmentType: "full-time",
        skills: ["Python", "Machine Learning", "TensorFlow", "SQL", "Statistics", "Deep Learning"],
        postedDate: new Date(),
      },
    ]

    const savedJobs = await JobDescription.insertMany(jobDescriptions)
    console.log(`✅ Created ${savedJobs.length} sample job descriptions`)

    return savedJobs
  } catch (error) {
    console.error("❌ Error seeding job descriptions:", error)
    throw error
  }
}

const runSeed = async () => {
  try {
    await connectDB()

    console.log("🌱 Starting database seeding...")

    const { recruiters } = await seedUsers()
    await seedJobDescriptions(recruiters)

    console.log("✅ Database seeding completed successfully!")
    console.log("\n📋 Login Credentials:")
    console.log("Admin: admin@hireai.com / admin123")
    console.log("Recruiter 1: john@techcorp.com / recruiter123")
    console.log("Recruiter 2: sarah@innovate.com / recruiter123")
    console.log("Job Seeker 1: alice@email.com / jobseeker123")
    console.log("Job Seeker 2: bob@email.com / jobseeker123")

    process.exit(0)
  } catch (error) {
    console.error("❌ Seeding failed:", error)
    process.exit(1)
  }
}

// Run the seeding if this file is executed directly
if (require.main === module) {
  runSeed()
}

module.exports = { runSeed, seedUsers, seedJobDescriptions }
