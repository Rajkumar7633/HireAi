const mongoose = require("mongoose");

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect("mongodb://localhost:27017/hireaiproject", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
}

// Define schemas
const ApplicationSchema = new mongoose.Schema({
  jobSeekerId: { type: mongoose.Schema.Types.ObjectId, required: true },
  jobDescriptionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  assessmentId: { type: mongoose.Schema.Types.ObjectId, required: false },
  status: {
    type: String,
    enum: [
      "Pending",
      "Under Review",
      "Shortlisted",
      "Rejected",
      "Test Assigned",
      "Assessment Assigned",
      "Assessment Completed",
    ],
    default: "Pending",
  },
  applicationDate: { type: Date, default: Date.now },
  assessmentScore: { type: Number, required: false },
  assessmentCompletedAt: { type: Date, required: false },
});

const AssessmentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  durationMinutes: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  totalPoints: { type: Number, required: true },
  difficulty: {
    type: String,
    enum: ["Easy", "Medium", "Hard"],
    required: true,
  },
  status: { type: String, default: "Active" },
  requiresProctoring: { type: Boolean, default: true },
  securityFeatures: [String],
  createdAt: { type: Date, default: Date.now },
});

const JobDescriptionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: String, required: true },
  description: { type: String, required: true },
  requirements: [String],
  location: { type: String, required: true },
  salary: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const Application =
  mongoose.models.Application ||
  mongoose.model("Application", ApplicationSchema);
const Assessment =
  mongoose.models.Assessment || mongoose.model("Assessment", AssessmentSchema);
const JobDescription =
  mongoose.models.JobDescription ||
  mongoose.model("JobDescription", JobDescriptionSchema);

async function createTestData() {
  try {
    // The user ID from the logs
    const userId = new mongoose.Types.ObjectId("68ca308ce80256350d0aebc6");

    console.log("Creating test data for user:", userId);

    // Create test job descriptions
    const jobDescriptions = await JobDescription.insertMany([
      {
        title: "Frontend Developer",
        company: "TechCorp Inc.",
        description: "Build amazing user interfaces with React and TypeScript",
        requirements: ["React", "TypeScript", "CSS", "JavaScript"],
        location: "Remote",
        salary: "$80,000 - $120,000",
      },
      {
        title: "Full Stack Developer",
        company: "StartupXYZ",
        description: "Work on both frontend and backend systems",
        requirements: ["Node.js", "React", "MongoDB", "Express"],
        location: "San Francisco, CA",
        salary: "$90,000 - $140,000",
      },
      {
        title: "Software Engineer",
        company: "BigTech Solutions",
        description: "Develop scalable software solutions",
        requirements: ["Python", "Django", "PostgreSQL", "AWS"],
        location: "New York, NY",
        salary: "$100,000 - $160,000",
      },
    ]);

    console.log("Created job descriptions:", jobDescriptions.length);

    // Create test assessments
    const assessments = await Assessment.insertMany([
      {
        title: "React & TypeScript Assessment",
        description:
          "Test your knowledge of React hooks, components, and TypeScript integration",
        durationMinutes: 45,
        totalQuestions: 20,
        totalPoints: 100,
        difficulty: "Medium",
        requiresProctoring: true,
        securityFeatures: [
          "AI Face Recognition",
          "Screen Recording",
          "Tab Switch Detection",
          "Copy-Paste Prevention",
        ],
      },
      {
        title: "Full Stack Development Test",
        description:
          "Comprehensive assessment covering frontend, backend, and database concepts",
        durationMinutes: 60,
        totalQuestions: 25,
        totalPoints: 150,
        difficulty: "Hard",
        requiresProctoring: true,
        securityFeatures: [
          "AI Face Recognition",
          "Screen Recording",
          "Tab Switch Detection",
        ],
      },
      {
        title: "JavaScript Fundamentals",
        description:
          "Basic JavaScript concepts, ES6+ features, and problem-solving",
        durationMinutes: 30,
        totalQuestions: 15,
        totalPoints: 75,
        difficulty: "Easy",
        requiresProctoring: false,
        securityFeatures: ["Tab Switch Detection", "Copy-Paste Prevention"],
      },
    ]);

    console.log("Created assessments:", assessments.length);

    // Create test applications with different statuses
    const applications = await Application.insertMany([
      {
        jobSeekerId: userId,
        jobDescriptionId: jobDescriptions[0]._id,
        assessmentId: assessments[0]._id,
        status: "Assessment Assigned",
        applicationDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
      {
        jobSeekerId: userId,
        jobDescriptionId: jobDescriptions[1]._id,
        assessmentId: assessments[1]._id,
        status: "Test Assigned",
        applicationDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      },
      {
        jobSeekerId: userId,
        jobDescriptionId: jobDescriptions[2]._id,
        assessmentId: assessments[2]._id,
        status: "Assessment Completed",
        applicationDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        assessmentScore: 85,
        assessmentCompletedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      },
      {
        jobSeekerId: userId,
        jobDescriptionId: jobDescriptions[0]._id,
        status: "Under Review",
        applicationDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      },
    ]);

    console.log("Created applications:", applications.length);

    console.log("✅ Test data created successfully!");
    console.log(
      "Applications with assessments:",
      applications.filter((app) => app.assessmentId).length
    );
    console.log("User should now see assessments in the dashboard");
  } catch (error) {
    console.error("Error creating test data:", error);
  }
}

async function main() {
  await connectDB();
  await createTestData();
  await mongoose.disconnect();
  console.log("Disconnected from MongoDB");
}

main().catch(console.error);
