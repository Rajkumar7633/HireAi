const fetch = require("node-fetch");

async function seedTestJobs() {
  console.log("🌱 Seeding test jobs...\n");

  const testJobs = [
    {
      title: "Frontend Developer",
      company: "TechCorp",
      location: "San Francisco, CA",
      description:
        "We are looking for a skilled Frontend Developer to join our team.",
      requirements: ["React", "JavaScript", "CSS", "HTML"],
      salary: "$90,000 - $130,000",
      employmentType: "Full-time",
      skills: ["React", "JavaScript", "CSS"],
      recruiterId: "recruiter-001",
    },
    {
      title: "Backend Engineer",
      company: "DataFlow Inc",
      location: "New York, NY",
      description: "Join our backend team to build scalable APIs and services.",
      requirements: ["Node.js", "Python", "MongoDB", "AWS"],
      salary: "$100,000 - $140,000",
      employmentType: "Full-time",
      skills: ["Node.js", "Python", "MongoDB"],
      recruiterId: "recruiter-002",
    },
    {
      title: "Full Stack Developer",
      company: "StartupXYZ",
      location: "Remote",
      description:
        "Looking for a versatile full stack developer for our growing startup.",
      requirements: ["React", "Node.js", "PostgreSQL", "Docker"],
      salary: "$80,000 - $120,000",
      employmentType: "Full-time",
      skills: ["React", "Node.js", "PostgreSQL"],
      recruiterId: "recruiter-003",
    },
  ];

  for (let i = 0; i < testJobs.length; i++) {
    const job = testJobs[i];
    console.log(`Creating job ${i + 1}: ${job.title}`);

    try {
      const response = await fetch(
        "http://localhost:3000/api/job-descriptions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-bypass-auth": "true",
          },
          body: JSON.stringify(job),
        }
      );

      const result = await response.json();

      if (response.ok) {
        console.log(`✅ Created: ${job.title}`);
      } else {
        console.log(`❌ Failed to create ${job.title}:`, result);
      }
    } catch (error) {
      console.log(`❌ Error creating ${job.title}:`, error.message);
    }
  }

  console.log("\n🎉 Test job seeding completed!");
}

// Run the seeding
seedTestJobs();
