const fetch = require("node-fetch")

async function testJobFlow() {
  console.log("🔍 Testing Job Flow...\n")

  try {
    // Test 1: Check if we can fetch jobs without authentication
    console.log("1. Testing job fetching API...")
    const jobsResponse = await fetch("http://localhost:3000/api/job-descriptions")
    const jobsData = await jobsResponse.json()

    console.log("Jobs API Response Status:", jobsResponse.status)
    console.log("Jobs Data:", JSON.stringify(jobsData, null, 2))

    if (jobsData.jobs && jobsData.jobs.length > 0) {
      console.log("✅ Jobs found in database:", jobsData.jobs.length)
    } else {
      console.log("❌ No jobs found in database")
    }

    // Test 2: Create a test job directly via API
    console.log("\n2. Testing job creation...")
    const testJob = {
      title: "Test Software Engineer",
      company: "Test Company",
      location: "Remote",
      description: "This is a test job posting",
      requirements: ["JavaScript", "React", "Node.js"],
      salary: "$80,000 - $120,000",
      employmentType: "Full-time",
      skills: ["JavaScript", "React"],
      recruiterId: "test-recruiter-123",
    }

    const createResponse = await fetch("http://localhost:3000/api/job-descriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bypass-auth": "true",
      },
      body: JSON.stringify(testJob),
    })

    const createData = await createResponse.json()
    console.log("Create Job Response Status:", createResponse.status)
    console.log("Create Job Response:", JSON.stringify(createData, null, 2))

    // Test 3: Fetch jobs again to see if the new job appears
    console.log("\n3. Re-testing job fetching after creation...")
    const jobsResponse2 = await fetch("http://localhost:3000/api/job-descriptions")
    const jobsData2 = await jobsResponse2.json()

    console.log("Jobs API Response Status:", jobsResponse2.status)
    console.log("Updated Jobs Count:", jobsData2.jobs ? jobsData2.jobs.length : 0)

    if (jobsData2.jobs && jobsData2.jobs.length > 0) {
      console.log("✅ Jobs are now available for job seekers")
      jobsData2.jobs.forEach((job, index) => {
        console.log(`Job ${index + 1}: ${job.title} at ${job.location}`)
      })
    } else {
      console.log("❌ Still no jobs available for job seekers")
    }
  } catch (error) {
    console.error("❌ Error testing job flow:", error.message)
  }
}

// Run the test
testJobFlow()
