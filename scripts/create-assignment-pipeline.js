const mongoose = require("mongoose");

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/hireaiproject",
      {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 60000,
        connectTimeoutMS: 30000,
        maxPoolSize: 10,
        minPoolSize: 2,
        maxIdleTimeMS: 60000,
        retryWrites: true,
        retryReads: true,
        bufferCommands: false,
        heartbeatFrequencyMS: 10000,
        family: 4,
      }
    );
    console.log("✅ Connected to MongoDB successfully");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
}

// Define schemas
const UserSchema = new mongoose.Schema(
  {
    email: String,
    role: String,
    name: String,
    password: String,
  },
  { timestamps: true }
);

const AssessmentSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    questions: [
      {
        question: String,
        type: String,
        options: [String],
        correctAnswer: String,
        points: Number,
      },
    ],
    duration: Number,
    totalPoints: Number,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isActive: Boolean,
  },
  { timestamps: true }
);

const ApplicationSchema = new mongoose.Schema(
  {
    jobSeekerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assessmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assessment",
      required: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["assigned", "in_progress", "completed", "expired"],
      default: "assigned",
    },
    assignedAt: { type: Date, default: Date.now },
    startedAt: Date,
    completedAt: Date,
    expiresAt: Date,
    score: Number,
    answers: [
      {
        questionId: String,
        answer: String,
        isCorrect: Boolean,
        points: Number,
      },
    ],
    timeSpent: Number, // in seconds
  },
  { timestamps: true }
);

// Create models
const User = mongoose.models.User || mongoose.model("User", UserSchema);
const Assessment =
  mongoose.models.Assessment || mongoose.model("Assessment", AssessmentSchema);
const Application =
  mongoose.models.Application ||
  mongoose.model("Application", ApplicationSchema);

async function createTestData() {
  try {
    console.log("🔄 Creating test data...");

    // Create test users
    const recruiter = await User.findOneAndUpdate(
      { email: "server@gmail.com" },
      {
        email: "server@gmail.com",
        role: "recruiter",
        name: "Test Recruiter",
        password: "hashedpassword",
      },
      { upsert: true, new: true }
    );

    const jobSeeker = await User.findOneAndUpdate(
      { email: "raj@gmail.com" },
      {
        email: "raj@gmail.com",
        role: "job_seeker",
        name: "Raj Kumar",
        password: "hashedpassword",
      },
      { upsert: true, new: true }
    );

    console.log("✅ Users created/updated");

    // Create test assessments
    const assessments = [
      {
        title: "JavaScript Developer Assessment",
        description:
          "Test your JavaScript knowledge and problem-solving skills",
        questions: [
          {
            question:
              "What is the difference between let and var in JavaScript?",
            type: "multiple_choice",
            options: [
              "No difference",
              "let has block scope, var has function scope",
              "var has block scope, let has function scope",
              "Both have global scope",
            ],
            correctAnswer: "let has block scope, var has function scope",
            points: 10,
          },
          {
            question: "Explain closures in JavaScript",
            type: "text",
            correctAnswer:
              "A closure is a function that has access to variables in its outer scope even after the outer function has returned",
            points: 15,
          },
          {
            question: "What does Promise.all() do?",
            type: "multiple_choice",
            options: [
              "Runs promises sequentially",
              "Runs promises in parallel and waits for all to complete",
              "Runs only the first promise",
              "Cancels all promises",
            ],
            correctAnswer:
              "Runs promises in parallel and waits for all to complete",
            points: 10,
          },
        ],
        duration: 60, // 60 minutes
        totalPoints: 35,
        createdBy: recruiter._id,
        isActive: true,
      },
      {
        title: "React Developer Assessment",
        description:
          "Evaluate React.js skills and component architecture understanding",
        questions: [
          {
            question: "What is the purpose of useEffect hook?",
            type: "multiple_choice",
            options: [
              "To manage state",
              "To handle side effects",
              "To create components",
              "To handle events",
            ],
            correctAnswer: "To handle side effects",
            points: 10,
          },
          {
            question:
              "Explain the difference between controlled and uncontrolled components",
            type: "text",
            correctAnswer:
              "Controlled components have their state managed by React, uncontrolled components manage their own state internally",
            points: 20,
          },
        ],
        duration: 45,
        totalPoints: 30,
        createdBy: recruiter._id,
        isActive: true,
      },
    ];

    const createdAssessments = [];
    for (const assessmentData of assessments) {
      const assessment = await Assessment.findOneAndUpdate(
        { title: assessmentData.title },
        assessmentData,
        {
          upsert: true,
          new: true,
        }
      );
      createdAssessments.push(assessment);
    }

    console.log("✅ Assessments created/updated");

    // Create test applications (assignments)
    const applications = [
      {
        jobSeekerId: jobSeeker._id,
        assessmentId: createdAssessments[0]._id,
        assignedBy: recruiter._id,
        status: "assigned",
        assignedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      },
      {
        jobSeekerId: jobSeeker._id,
        assessmentId: createdAssessments[1]._id,
        assignedBy: recruiter._id,
        status: "assigned",
        assignedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    ];

    for (const appData of applications) {
      await Application.findOneAndUpdate(
        {
          jobSeekerId: appData.jobSeekerId,
          assessmentId: appData.assessmentId,
        },
        appData,
        { upsert: true, new: true }
      );
    }

    console.log("✅ Applications (assignments) created/updated");

    // Verify data
    const totalUsers = await User.countDocuments();
    const totalAssessments = await Assessment.countDocuments();
    const totalApplications = await Application.countDocuments();

    console.log("📊 Data Summary:");
    console.log(`   Users: ${totalUsers}`);
    console.log(`   Assessments: ${totalAssessments}`);
    console.log(`   Applications: ${totalApplications}`);

    console.log("🎉 Test data pipeline created successfully!");
  } catch (error) {
    console.error("❌ Error creating test data:", error);
    throw error;
  }
}

async function main() {
  await connectDB();
  await createTestData();
  await mongoose.connection.close();
  console.log("✅ Database connection closed");
}

main().catch(console.error);
