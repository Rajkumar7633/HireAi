const jwt = require("jsonwebtoken")
const request = require("supertest")
const express = require("express")
const mongoose = require("mongoose")
const backgroundVerificationRoutes = require("../routes/backgroundVerification")
const User = require("../models/User")
const JobApplication = require("../models/JobApplication")
const BackgroundVerification = require("../models/BackgroundVerification")

const app = express()
app.use(express.json())
app.use("/api/background-verification", backgroundVerificationRoutes)

describe("Background Verification API", () => {
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
      status: "Offer",
    })

    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-key"
    authToken = jwt.sign({ userId: testUser._id, role: testUser.role, email: testUser.email }, process.env.JWT_SECRET)
  })

  afterAll(async () => {
    await User.deleteMany({})
    await JobApplication.deleteMany({})
    await BackgroundVerification.deleteMany({})
    await mongoose.connection.close()
  })

  describe("POST /api/background-verification/initiate", () => {
    it("should initiate background verification", async () => {
      const response = await request(app)
        .post("/api/background-verification/initiate")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          applicationId: testApplication._id,
          provider: "Manual",
          components: {
            identity: true,
            education: true,
            employment: true,
          },
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.verification).toBeDefined()
    })

    it("should return error for missing application ID", async () => {
      const response = await request(app)
        .post("/api/background-verification/initiate")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          provider: "Manual",
        })

      expect(response.status).toBe(400)
    })

    it("should return error for duplicate verification", async () => {
      await request(app)
        .post("/api/background-verification/initiate")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          applicationId: testApplication._id,
          provider: "Manual",
        })

      const response = await request(app)
        .post("/api/background-verification/initiate")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          applicationId: testApplication._id,
          provider: "Manual",
        })

      expect(response.status).toBe(400)
    })
  })

  describe("PUT /api/background-verification/:id/update-component", () => {
    it("should update verification component", async () => {
      const createResponse = await request(app)
        .post("/api/background-verification/initiate")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          applicationId: testApplication._id,
          provider: "Manual",
        })

      const verificationId = createResponse.body.verification._id

      const response = await request(app)
        .put(`/api/background-verification/${verificationId}/update-component`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          component: "identity",
          status: "Verified",
          notes: "Identity verified successfully",
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })
  })

  describe("PUT /api/background-verification/:id/finalize", () => {
    it("should finalize background verification", async () => {
      const createResponse = await request(app)
        .post("/api/background-verification/initiate")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          applicationId: testApplication._id,
          provider: "Manual",
        })

      const verificationId = createResponse.body.verification._id

      const response = await request(app)
        .put(`/api/background-verification/${verificationId}/finalize`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          overallResult: "Clear",
          riskLevel: "Low",
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.verification.status).toBe("Completed")
    })
  })
})
