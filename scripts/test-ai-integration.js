// Test script to verify AI integration is working
import { aiService } from "../lib/ai-service.js";

async function testAIIntegration() {
  console.log("🤖 Testing AI Integration...\n");

  try {
    // Test 1: Resume Analysis
    console.log("📄 Testing Resume Analysis...");
    const resumeText = `
      John Doe
      Senior Software Engineer
      
      Experienced software engineer with 5 years of experience in JavaScript, React, and Node.js.
      Strong background in AWS cloud services and Docker containerization.
      Led a team of 3 developers on multiple successful projects.
      
      Skills: JavaScript, React, Node.js, AWS, Docker, Git, SQL, MongoDB
    `;

    const jobRequirements = `
      We are looking for a Senior Full Stack Developer with experience in React, Node.js, and AWS.
      Must have 3+ years of experience and leadership skills.
    `;

    const requiredSkills = [
      "React",
      "Node.js",
      "AWS",
      "JavaScript",
      "Leadership",
    ];

    const resumeAnalysis = await aiService.analyzeResume(
      resumeText,
      jobRequirements,
      requiredSkills
    );
    console.log("✅ Resume Analysis Result:", {
      score: resumeAnalysis.score,
      atsScore: resumeAnalysis.atsScore,
      skillsMatch: resumeAnalysis.skillsMatch,
      strengths: resumeAnalysis.strengths.slice(0, 2),
    });

    // Test 2: Interview Questions
    console.log("\n❓ Testing Interview Questions Generation...");
    const questions = await aiService.generateInterviewQuestions(
      "Senior Frontend Developer",
      ["React", "TypeScript", "Node.js"],
      "Senior",
      5
    );
    console.log(
      "✅ Generated Questions:",
      questions.slice(0, 2).map((q) => ({
        category: q.category,
        difficulty: q.difficulty,
        question: q.question.substring(0, 80) + "...",
      }))
    );

    // Test 3: Job Matching
    console.log("\n🎯 Testing Job Matching...");
    const candidateProfile = {
      skills: ["React", "JavaScript", "Node.js", "AWS"],
      experience: "5+ years",
      education: ["Computer Science"],
      professionalSummary: "Experienced full-stack developer",
    };

    const jobDescription =
      "Senior React Developer position requiring 3+ years experience";
    const jobSkills = ["React", "JavaScript", "TypeScript", "AWS"];

    const jobMatch = await aiService.generateJobMatch(
      candidateProfile,
      jobDescription,
      jobSkills
    );
    console.log("✅ Job Match Result:", {
      matchScore: jobMatch.matchScore,
      skillsAlignment: jobMatch.skillsAlignment,
      topSkills: jobMatch.topSkills,
      missingSkills: jobMatch.missingSkills,
    });

    console.log("\n🎉 All AI Integration Tests Passed!");
    console.log("\n📋 Setup Instructions:");
    console.log("1. Make sure GROQ_API_KEY is set in your environment");
    console.log("2. Install dependencies: npm install ai @ai-sdk/groq");
    console.log("3. Start your development server: npm run dev");
    console.log("4. The AI services are now ready to use!");
  } catch (error) {
    console.error("❌ AI Integration Test Failed:", error.message);
    console.log("\n🔧 Troubleshooting:");
    console.log("1. Check if GROQ_API_KEY environment variable is set");
    console.log("2. Verify internet connection for AI API calls");
    console.log("3. Check if all dependencies are installed");
    console.log("4. Fallback mechanisms will handle API failures gracefully");
  }
}

// Run the test
testAIIntegration();
