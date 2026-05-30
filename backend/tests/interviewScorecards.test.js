const jwt = require("jsonwebtoken")
const request = require("supertest")
const express = require("express")
const mongoose = require("mongoose")
const interviewScorecardsRoutes = require("../routes/interviewScorecards")
const User = require("../models/User")
const JobApplication = require("../models/JobApplication")
const InterviewScorecard = require("../models/InterviewScorecard")

const app = express()
app.use(express.json())
app.use("/api/interview-scorecards", interviewScorecardsRoutes)

describe("Interview Scorecards API", () => {
  let authToken
  let testUser
  let testApplication

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI || "mongodb://localhost:27017/hireai-test")

    testUser = await User.create({
      name: "Test Recruiter",
      email: "recruiter@test.com",
      password: "password123",
      role: "recruiter",
    })

    const candidate = await User.create({
      name: "Test Candidate",
      email: "candidate@test.com",
      password: "password123",
      role: "job_seeker",
    })

    testApplication = await JobApplication.create({
      userId: candidate._id,
      jobDescriptionId: "507f1f77bcf86cd799439012",
      status: "Interview",
    })

    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-key"
    authToken = jwt.sign({ userId: testUser._id, role: testUser.role, email: testUser.email }, process.env.JWT_SECRET)
  })

  afterAll(async () => {
    await User.deleteMany({})
    await JobApplication.deleteMany({})
    await InterviewScorecard.deleteMany({})
    await mongoose.connection.close()
  })

  describe("POST /api/interview-scorecards/create", () => {
    it("should create a new interview scorecard", async () => {
      const response = await request(app)
        .post("/api/interview-scorecards/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          applicationId: testApplication._id,
          interviewType: "Technical",
          interviewDate: new Date().toISOString(),
          interviewDuration: 60,
          scores: {
            technical: 8,
            communication: 7,
            problemSolving: 9,
          },
          recommendation: "Hire",
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.scorecard).toBeDefined()
    })

    it("should return error for missing application ID", async () => {
      const response = await request(app)
        .post("/api/interview-scorecards/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          interviewType: "Technical",
          interviewDate: new Date().toISOString(),
        })

      expect(response.status).toBe(400)
    })
  })

  describe("GET /api/interview-scorecards/:id", () => {
    it("should get scorecard by ID", async () => {
      const createResponse = await request(app)
        .post("/api/interview-scorecards/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          applicationId: testApplication._id,
          interviewType: "Technical",
          interviewDate: new Date().toISOString(),
        })

      const scorecardId = createResponse.body.scorecard._id

      const response = await request(app)
        .get(`/api/interview-scorecards/${scorecardId}`)
        .set("Authorization", `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.scorecard).toBeDefined()
    })
  })

  describe("PUT /api/interview-scorecards/:id/submit", () => {
    it("should submit scorecard", async () => {
      const createResponse = await request(app)
        .post("/api/interview-scorecards/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          applicationId: testApplication._id,
          interviewType: "Technical",
          interviewDate: new Date().toISOString(),
        })

      const scorecardId = createResponse.body.scorecard._id

      const response = await request(app)
        .put(`/api/interview-scorecards/${scorecardId}/submit`)
        .set("Authorization", `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.scorecard.status).toBe("Submitted")
    })
  })
})
