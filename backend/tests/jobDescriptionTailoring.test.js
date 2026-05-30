const jwt = require("jsonwebtoken")
const request = require("supertest")
const express = require("express")
const mongoose = require("mongoose")
const jobDescriptionTailoringRoutes = require("../routes/jobDescriptionTailoring")
const User = require("../models/User")

const app = express()
app.use(express.json())
app.use("/api/job-description-tailoring", jobDescriptionTailoringRoutes)

describe("Job Description Tailoring API", () => {
  let authToken

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_TEST_URI || "mongodb://localhost:27017/hireai-test")

    // Create test user and get auth token
    const user = await User.create({
      name: "Test Recruiter",
      email: "recruiter@test.com",
      password: "password123",
      role: "recruiter",
    })

    // Login to get token (simplified for test)
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-key"
    authToken = jwt.sign({ userId: user._id, role: user.role, email: user.role, email: user.email }, process.env.JWT_SECRET)
  })

  afterAll(async () => {
    await mongoose.connection.close()
  })

  describe("POST /api/job-description-tailoring/analyze", () => {
    it("should analyze job description", async () => {
      const response = await request(app)
        .post("/api/job-description-tailoring/analyze")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          description: "We are looking for a senior software engineer with experience in React, Node.js, and MongoDB.",
          title: "Senior Software Engineer",
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.analysis).toBeDefined()
    })

    it("should return error for missing description", async () => {
      const response = await request(app)
        .post("/api/job-description-tailoring/analyze")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: "Software Engineer" })

      expect(response.status).toBe(400)
    })
  })

  describe("POST /api/job-description-tailoring/optimize", () => {
    it("should optimize job description", async () => {
      const response = await request(app)
        .post("/api/job-description-tailoring/optimize")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          description: "We need a developer.",
          title: "Developer",
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.optimizedDescription).toBeDefined()
    })
  })
})
