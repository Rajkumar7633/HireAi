"use client";

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

// Enhanced schemas with all required fields
const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    role: {
      type: String,
      enum: ["recruiter", "job_seeker", "admin"],
      required: true,
    },
    name: { type: String, required: true },
    password: String,
    profile: {
      skills: [String],
      experience: String,
      location: String,
      phone: String,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const AssessmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    questions: [
      {
        _id: {
          type: mongoose.Schema.Types.ObjectId,
          default: () => new mongoose.Types.ObjectId(),
        },
        questionText: { type: String, required: true },
        type: {
          type: String,
          enum: ["multiple_choice", "text", "code_snippet"],
          required: true,
        },
        options: [String],
        correctAnswer: String,
        points: { type: Number, default: 10 },
      },
    ],
    duration: { type: Number, default: 60 }, // minutes
    totalPoints: Number,
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: { type: Boolean, default: true },
    candidatesAssigned: { type: Number, default: 0 },
    candidatesCompleted: { type: Number, default: 0 },
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
    proctoringData: {
      score: Number,
      report: mongoose.Schema.Types.Mixed,
      alerts: [mongoose.Schema.Types.Mixed],
      tabSwitchCount: { type: Number, default: 0 },
      securityViolations: [mongoose.Schema.Types.Mixed],
    },
  },
  { timestamps: true }
);

const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "assessment_assigned",
        "assessment_completed",
        "assessment_reminder",
        "system",
      ],
      required: true,
    },
    message: { type: String, required: true },
    relatedEntity: {
      id: mongoose.Schema.Types.ObjectId,
      type: String,
    },
    read: { type: Boolean, default: false },
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
const Notification =
  mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);

async function createComprehensiveTestData() {
  try {
    console.log("🔄 Creating comprehensive test data...");

    // Clear existing data
    await User.deleteMany({});
    await Assessment.deleteMany({});
    await Application.deleteMany({});
    await Notification.deleteMany({});
    console.log("🧹 Cleared existing data");

    // Create test users
    const recruiter = await User.create({
      email: "server@gmail.com",
      role: "recruiter",
      name: "Sarah Johnson",
      password: "hashedpassword",
      profile: {
        experience: "Senior Technical Recruiter",
        location: "San Francisco, CA",
        phone: "+1-555-0123",
      },
    });

    const jobSeekers = await User.create([
      {
        email: "raj@gmail.com",
        role: "job_seeker",
        name: "Raj Kumar",
        password: "hashedpassword",
        profile: {
          skills: ["JavaScript", "React", "Node.js", "MongoDB"],
          experience: "3 years",
          location: "Mumbai, India",
          phone: "+91-9876543210",
        },
      },
      {
        email: "alice@gmail.com",
        role: "job_seeker",
        name: "Alice Chen",
        password: "hashedpassword",
        profile: {
          skills: ["Python", "Django", "PostgreSQL", "AWS"],
          experience: "5 years",
          location: "Toronto, Canada",
          phone: "+1-416-555-0987",
        },
      },
      {
        email: "mike@gmail.com",
        role: "job_seeker",
        name: "Mike Rodriguez",
        password: "hashedpassword",
        profile: {
          skills: ["Java", "Spring Boot", "MySQL", "Docker"],
          experience: "4 years",
          location: "Austin, TX",
          phone: "+1-512-555-0456",
        },
      },
      {
        email: "emma@gmail.com",
        role: "job_seeker",
        name: "Emma Wilson",
        password: "hashedpassword",
        profile: {
          skills: ["React", "TypeScript", "GraphQL", "Next.js"],
          experience: "2 years",
          location: "London, UK",
          phone: "+44-20-7946-0958",
        },
      },
    ]);

    console.log("✅ Users created");

    // Create comprehensive assessments
    const assessments = await Assessment.create([
      {
        title: "Full-Stack JavaScript Developer Assessment",
        description:
          "Comprehensive evaluation of JavaScript, React, Node.js, and database skills",
        questions: [
          {
            questionText:
              "What is the difference between let, const, and var in JavaScript?",
            type: "multiple_choice",
            options: [
              "No difference, they are interchangeable",
              "let and const have block scope, var has function scope",
              "var and const have block scope, let has function scope",
              "All have global scope only",
            ],
            correctAnswer:
              "let and const have block scope, var has function scope",
            points: 10,
          },
          {
            questionText:
              "Explain the concept of closures in JavaScript with an example.",
            type: "text",
            correctAnswer:
              "A closure is a function that has access to variables in its outer scope even after the outer function has returned. Example: function outer() { let x = 10; return function inner() { return x; }; }",
            points: 15,
          },
          {
            questionText:
              "What does the following React hook do? useEffect(() => { fetchData(); }, [])",
            type: "multiple_choice",
            options: [
              "Runs fetchData on every render",
              "Runs fetchData only once when component mounts",
              "Runs fetchData when component unmounts",
              "Never runs fetchData",
            ],
            correctAnswer: "Runs fetchData only once when component mounts",
            points: 10,
          },
          {
            questionText: "Write a function that debounces another function.",
            type: "code_snippet",
            correctAnswer:
              "function debounce(func, delay) { let timeoutId; return function(...args) { clearTimeout(timeoutId); timeoutId = setTimeout(() => func.apply(this, args), delay); }; }",
            points: 20,
          },
          {
            questionText: "What is the purpose of middleware in Express.js?",
            type: "text",
            correctAnswer:
              "Middleware functions are functions that have access to the request object, response object, and the next middleware function in the application request-response cycle. They can execute code, modify req/res objects, end the request-response cycle, or call the next middleware.",
            points: 15,
          },
        ],
        duration: 90,
        totalPoints: 70,
        difficulty: "Medium",
        createdBy: recruiter._id,
        isActive: true,
      },
      {
        title: "Python Backend Developer Assessment",
        description:
          "Evaluate Python, Django, database design, and API development skills",
        questions: [
          {
            questionText:
              "What is the difference between a list and a tuple in Python?",
            type: "multiple_choice",
            options: [
              "Lists are mutable, tuples are immutable",
              "Tuples are mutable, lists are immutable",
              "Both are mutable",
              "Both are immutable",
            ],
            correctAnswer: "Lists are mutable, tuples are immutable",
            points: 10,
          },
          {
            questionText: "Explain the concept of decorators in Python.",
            type: "text",
            correctAnswer:
              "Decorators are a way to modify or enhance functions or classes without permanently modifying their code. They use the @ symbol and are essentially functions that take another function as an argument and return a modified version.",
            points: 15,
          },
          {
            questionText:
              "Write a Python function to find the factorial of a number using recursion.",
            type: "code_snippet",
            correctAnswer:
              "def factorial(n): return 1 if n <= 1 else n * factorial(n - 1)",
            points: 15,
          },
          {
            questionText: "What is the purpose of Django ORM?",
            type: "text",
            correctAnswer:
              "Django ORM (Object-Relational Mapping) allows developers to interact with databases using Python code instead of SQL. It provides an abstraction layer that maps database tables to Python classes and enables database operations through Python methods.",
            points: 20,
          },
        ],
        duration: 75,
        totalPoints: 60,
        difficulty: "Medium",
        createdBy: recruiter._id,
        isActive: true,
      },
      {
        title: "React Frontend Specialist Assessment",
        description:
          "Advanced React concepts, state management, and modern frontend practices",
        questions: [
          {
            questionText: "What is the purpose of React.memo()?",
            type: "multiple_choice",
            options: [
              "To memoize component state",
              "To prevent unnecessary re-renders of functional components",
              "To cache API responses",
              "To optimize memory usage",
            ],
            correctAnswer:
              "To prevent unnecessary re-renders of functional components",
            points: 10,
          },
          {
            questionText:
              "Explain the difference between useCallback and useMemo hooks.",
            type: "text",
            correctAnswer:
              "useCallback memoizes a function and returns the same function reference if dependencies haven't changed. useMemo memoizes the result of a computation and returns the cached result if dependencies haven't changed.",
            points: 15,
          },
          {
            questionText: "Create a custom hook for managing local storage.",
            type: "code_snippet",
            correctAnswer:
              "function useLocalStorage(key, initialValue) { const [value, setValue] = useState(() => { const item = localStorage.getItem(key); return item ? JSON.parse(item) : initialValue; }); const setStoredValue = (value) => { setValue(value); localStorage.setItem(key, JSON.stringify(value)); }; return [value, setStoredValue]; }",
            points: 25,
          },
        ],
        duration: 60,
        totalPoints: 50,
        difficulty: "Hard",
        createdBy: recruiter._id,
        isActive: true,
      },
    ]);

    console.log("✅ Assessments created");

    // Create applications with various statuses
    const applications = [];
    const statuses = ["assigned", "in_progress", "completed"];

    for (let i = 0; i < jobSeekers.length; i++) {
      const jobSeeker = jobSeekers[i];

      for (let j = 0; j < assessments.length; j++) {
        const assessment = assessments[j];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const assignedDate = new Date(
          Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
        ); // Random date within last 7 days

        const applicationData = {
          jobSeekerId: jobSeeker._id,
          assessmentId: assessment._id,
          assignedBy: recruiter._id,
          status: status,
          assignedAt: assignedDate,
          expiresAt: new Date(assignedDate.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from assignment
        };

        // Add completion data for completed assessments
        if (status === "completed") {
          const completedDate = new Date(
            assignedDate.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000
          ); // Completed within 3 days
          applicationData.startedAt = new Date(
            assignedDate.getTime() + Math.random() * 24 * 60 * 60 * 1000
          ); // Started within 1 day
          applicationData.completedAt = completedDate;
          applicationData.score = Math.floor(Math.random() * 40) + 60; // Score between 60-100
          applicationData.timeSpent = Math.floor(
            Math.random() * assessment.duration * 60
          ); // Random time up to duration
          applicationData.proctoringData = {
            score: Math.floor(Math.random() * 30) + 70, // Proctoring score 70-100
            report: {
              overallScore: Math.floor(Math.random() * 30) + 70,
              violations: {
                tabSwitches: Math.floor(Math.random() * 3),
                totalAlerts: Math.floor(Math.random() * 5),
                highSeverityAlerts: Math.floor(Math.random() * 2),
              },
              recommendation: "No concerns detected",
            },
            alerts: [],
            tabSwitchCount: Math.floor(Math.random() * 3),
            securityViolations: [],
          };
        } else if (status === "in_progress") {
          applicationData.startedAt = new Date(
            assignedDate.getTime() + Math.random() * 24 * 60 * 60 * 1000
          );
        }

        applications.push(applicationData);
      }
    }

    await Application.create(applications);
    console.log("✅ Applications created");

    // Create notifications
    const notifications = [];
    for (const jobSeeker of jobSeekers) {
      // Assignment notifications
      notifications.push({
        userId: jobSeeker._id,
        type: "assessment_assigned",
        message: `New assessment "${
          assessments[0].title
        }" has been assigned to you. Complete it before ${new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toLocaleDateString()}.`,
        relatedEntity: {
          id: assessments[0]._id,
          type: "assessment",
        },
        read: Math.random() > 0.5, // Randomly mark some as read
      });

      // Reminder notifications
      if (Math.random() > 0.7) {
        notifications.push({
          userId: jobSeeker._id,
          type: "assessment_reminder",
          message: `Reminder: You have pending assessments that expire soon. Please complete them to proceed with your applications.`,
          read: false,
        });
      }
    }

    await Notification.create(notifications);
    console.log("✅ Notifications created");

    // Update assessment statistics
    for (const assessment of assessments) {
      const assignedCount = await Application.countDocuments({
        assessmentId: assessment._id,
      });
      const completedCount = await Application.countDocuments({
        assessmentId: assessment._id,
        status: "completed",
      });

      await Assessment.findByIdAndUpdate(assessment._id, {
        candidatesAssigned: assignedCount,
        candidatesCompleted: completedCount,
      });
    }

    // Generate summary
    const totalUsers = await User.countDocuments();
    const totalAssessments = await Assessment.countDocuments();
    const totalApplications = await Application.countDocuments();
    const totalNotifications = await Notification.countDocuments();
    const completedApplications = await Application.countDocuments({
      status: "completed",
    });

    console.log("\n📊 Comprehensive Test Data Summary:");
    console.log(
      `   👥 Users: ${totalUsers} (1 recruiter, ${totalUsers - 1} job seekers)`
    );
    console.log(`   📝 Assessments: ${totalAssessments}`);
    console.log(`   📋 Applications: ${totalApplications}`);
    console.log(`   ✅ Completed: ${completedApplications}`);
    console.log(`   🔔 Notifications: ${totalNotifications}`);
    console.log(
      `   📈 Completion Rate: ${(
        (completedApplications / totalApplications) *
        100
      ).toFixed(1)}%`
    );

    console.log("\n🎯 Test Scenarios Created:");
    console.log(
      "   ✓ Recruiter can assign assessments to multiple job seekers"
    );
    console.log(
      "   ✓ Job seekers have assessments in various states (assigned, in-progress, completed)"
    );
    console.log("   ✓ Real-time notifications for assignments and reminders");
    console.log("   ✓ Comprehensive proctoring data for completed assessments");
    console.log("   ✓ Statistics and analytics data for dashboard");
    console.log("   ✓ Multiple assessment types (JavaScript, Python, React)");

    console.log("\n🔑 Test Login Credentials:");
    console.log("   Recruiter: server@gmail.com");
    console.log("   Job Seeker: raj@gmail.com (main test user)");
    console.log("   Job Seeker: alice@gmail.com");
    console.log("   Job Seeker: mike@gmail.com");
    console.log("   Job Seeker: emma@gmail.com");

    console.log("\n🎉 Comprehensive test data pipeline created successfully!");
  } catch (error) {
    console.error("❌ Error creating comprehensive test data:", error);
    throw error;
  }
}

async function main() {
  await connectDB();
  await createComprehensiveTestData();
  await mongoose.connection.close();
  console.log("✅ Database connection closed");
}

main().catch(console.error);
