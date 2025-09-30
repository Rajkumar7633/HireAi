const mongoose = require("mongoose");

async function seedTestAssessments() {
  try {
    console.log("🌱 Seeding test assessments and applications...");

    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI environment variable is required");
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 30000,
    });

    console.log("✅ Connected to MongoDB");

    // Define schemas inline for seeding
    const UserSchema = new mongoose.Schema({
      email: String,
      role: String,
    });

    const JobDescriptionSchema = new mongoose.Schema({
      title: String,
      company: String,
      description: String,
      requirements: [String],
      location: String,
      salary: String,
      employmentType: String,
      postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      createdAt: { type: Date, default: Date.now },
    });

    const AssessmentSchema = new mongoose.Schema({
      title: String,
      description: String,
      durationMinutes: Number,
      totalQuestions: Number,
      totalPoints: Number,
      difficulty: String,
      status: String,
      requiresProctoring: Boolean,
      securityFeatures: [String],
      questions: [
        {
          question: String,
          type: String,
          options: [String],
          correctAnswer: String,
          points: Number,
        },
      ],
      createdAt: { type: Date, default: Date.now },
    });

    const ApplicationSchema = new mongoose.Schema({
      jobSeekerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      jobDescriptionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "JobDescription",
      },
      assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Assessment" },
      status: String,
      applicationDate: { type: Date, default: Date.now },
      assessmentScore: Number,
      assessmentCompletedAt: Date,
    });

    const User = mongoose.models.User || mongoose.model("User", UserSchema);
    const JobDescription =
      mongoose.models.JobDescription ||
      mongoose.model("JobDescription", JobDescriptionSchema);
    const Assessment =
      mongoose.models.Assessment ||
      mongoose.model("Assessment", AssessmentSchema);
    const Application =
      mongoose.models.Application ||
      mongoose.model("Application", ApplicationSchema);

    // Find the test user (raj@gmail.com)
    const testUser = await User.findOne({
      email: "raj@gmail.com",
      role: "job_seeker",
    });
    if (!testUser) {
      console.log("❌ Test user raj@gmail.com not found. Creating...");
      const newUser = new User({
        email: "raj@gmail.com",
        role: "job_seeker",
      });
      await newUser.save();
      console.log("✅ Created test user");
    }

    const userId = testUser
      ? testUser._id
      : (await User.findOne({ email: "raj@gmail.com" }))._id;

    // Create test recruiter
    let recruiter = await User.findOne({
      email: "recruiter@company.com",
      role: "recruiter",
    });
    if (!recruiter) {
      recruiter = new User({
        email: "recruiter@company.com",
        role: "recruiter",
      });
      await recruiter.save();
      console.log("✅ Created test recruiter");
    }

    // Create test job descriptions
    const jobDescriptions = [
      {
        title: "Senior Frontend Developer",
        company: "TechCorp Inc.",
        description:
          "We are looking for a skilled Frontend Developer to join our team.",
        requirements: ["React", "TypeScript", "Next.js", "3+ years experience"],
        location: "San Francisco, CA",
        salary: "$120,000 - $150,000",
        employmentType: "Full-time",
        postedBy: recruiter._id,
      },
      {
        title: "Full Stack Engineer",
        company: "StartupXYZ",
        description: "Join our fast-growing startup as a Full Stack Engineer.",
        requirements: [
          "Node.js",
          "React",
          "MongoDB",
          "AWS",
          "2+ years experience",
        ],
        location: "Remote",
        salary: "$100,000 - $130,000",
        employmentType: "Full-time",
        postedBy: recruiter._id,
      },
      {
        title: "React Developer",
        company: "Digital Agency",
        description:
          "Looking for a React specialist to build amazing user interfaces.",
        requirements: [
          "React",
          "JavaScript",
          "CSS",
          "Git",
          "1+ years experience",
        ],
        location: "New York, NY",
        salary: "$80,000 - $100,000",
        employmentType: "Full-time",
        postedBy: recruiter._id,
      },
    ];

    const createdJobs = [];
    for (const jobData of jobDescriptions) {
      let job = await JobDescription.findOne({
        title: jobData.title,
        company: jobData.company,
      });
      if (!job) {
        job = new JobDescription(jobData);
        await job.save();
        console.log(`✅ Created job: ${job.title} at ${job.company}`);
      }
      createdJobs.push(job);
    }

    // Create test assessments
    const assessments = [
      {
        title: "Frontend Development Assessment",
        description:
          "Test your knowledge of React, JavaScript, and modern frontend development practices.",
        durationMinutes: 90,
        totalQuestions: 20,
        totalPoints: 100,
        difficulty: "Medium",
        status: "active",
        requiresProctoring: true,
        securityFeatures: [
          "AI Face Recognition",
          "Screen Recording",
          "Tab Switch Detection",
          "Copy-Paste Prevention",
        ],
        questions: [
          {
            question: "What is the virtual DOM in React?",
            type: "multiple-choice",
            options: [
              "A copy of the real DOM kept in memory",
              "A database for storing component state",
              "A testing framework for React",
              "A CSS-in-JS library",
            ],
            correctAnswer: "A copy of the real DOM kept in memory",
            points: 5,
          },
          {
            question: "Which hook is used for side effects in React?",
            type: "multiple-choice",
            options: ["useState", "useEffect", "useContext", "useReducer"],
            correctAnswer: "useEffect",
            points: 5,
          },
        ],
      },
      {
        title: "Full Stack Development Assessment",
        description:
          "Comprehensive test covering both frontend and backend development skills.",
        durationMinutes: 120,
        totalQuestions: 25,
        totalPoints: 125,
        difficulty: "Hard",
        status: "active",
        requiresProctoring: true,
        securityFeatures: [
          "AI Face Recognition",
          "Screen Recording",
          "Tab Switch Detection",
        ],
        questions: [
          {
            question: "What is the purpose of middleware in Express.js?",
            type: "multiple-choice",
            options: [
              "To handle database connections",
              "To process requests before they reach route handlers",
              "To render HTML templates",
              "To manage user sessions",
            ],
            correctAnswer:
              "To process requests before they reach route handlers",
            points: 5,
          },
        ],
      },
      {
        title: "JavaScript Fundamentals Assessment",
        description:
          "Test your core JavaScript knowledge and problem-solving skills.",
        durationMinutes: 60,
        totalQuestions: 15,
        totalPoints: 75,
        difficulty: "Easy",
        status: "active",
        requiresProctoring: false,
        securityFeatures: ["Tab Switch Detection", "Copy-Paste Prevention"],
        questions: [
          {
            question:
              "What is the difference between let and var in JavaScript?",
            type: "multiple-choice",
            options: [
              "No difference",
              "let has block scope, var has function scope",
              "var is newer than let",
              "let is only for numbers",
            ],
            correctAnswer: "let has block scope, var has function scope",
            points: 5,
          },
        ],
      },
    ];

    const createdAssessments = [];
    for (const assessmentData of assessments) {
      let assessment = await Assessment.findOne({
        title: assessmentData.title,
      });
      if (!assessment) {
        assessment = new Assessment(assessmentData);
        await assessment.save();
        console.log(`✅ Created assessment: ${assessment.title}`);
      }
      createdAssessments.push(assessment);
    }

    // Create test applications with assigned assessments
    const applications = [
      {
        jobSeekerId: userId,
        jobDescriptionId: createdJobs[0]._id,
        assessmentId: createdAssessments[0]._id,
        status: "Assessment Assigned",
        applicationDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
      {
        jobSeekerId: userId,
        jobDescriptionId: createdJobs[1]._id,
        assessmentId: createdAssessments[1]._id,
        status: "Assessment Assigned",
        applicationDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      },
      {
        jobSeekerId: userId,
        jobDescriptionId: createdJobs[2]._id,
        assessmentId: createdAssessments[2]._id,
        status: "Assessment Completed",
        applicationDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        assessmentScore: 85,
        assessmentCompletedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
    ];

    for (const appData of applications) {
      const existingApp = await Application.findOne({
        jobSeekerId: appData.jobSeekerId,
        jobDescriptionId: appData.jobDescriptionId,
      });

      if (!existingApp) {
        const application = new Application(appData);
        await application.save();
        console.log(
          `✅ Created application for job: ${
            createdJobs.find((j) => j._id.equals(appData.jobDescriptionId))
              ?.title
          }`
        );
      } else {
        console.log(
          `⚠️ Application already exists for job: ${
            createdJobs.find((j) => j._id.equals(appData.jobDescriptionId))
              ?.title
          }`
        );
      }
    }

    console.log("🎉 Test data seeding completed successfully!");
    console.log(
      `📊 Created ${createdJobs.length} jobs, ${createdAssessments.length} assessments, and ${applications.length} applications`
    );
  } catch (error) {
    console.error("❌ Error seeding test data:", error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Run the seeding function
seedTestAssessments().catch(console.error);
