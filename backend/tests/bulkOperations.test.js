const jwt = require("jsonwebtoken")
const request = require("supertest")
const express = require("express")
const mongoose = require("mongoose")
const bulkOperationsRoutes = require("../routes/bulkOperations")
const User = require("../models/User")

const app = express()
app.use(express.json())
app.use("/api/bulk", bulkOperationsRoutes)

describe("Bulk Operations API", () => {
  let authToken
  let testUser

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI || "mongodb://localhost:27017/hireai-test")

    testUser = await User.create({
      name: "Test College Admin",
      email: "admin@test.com",
      password: "password123",
      role: "college_admin",
    })

    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-key"
    authToken = jwt.sign({ userId: testUser._id, role: testUser.role, email: testUser.email }, process.env.JWT_SECRET)
  })

  afterAll(async () => {
    await User.deleteMany({})
    await mongoose.connection.close()
  })

  describe("POST /api/bulk/eligibility-filter", () => {
    it("should filter students by eligibility criteria", async () => {
      const response = await request(app)
        .post("/api/bulk/eligibility-filter")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          collegeId: "507f1f77bcf86cd799439011",
          criteria: {
            minCGPA: 7.0,
            requiredBranches: ["CSE", "ECE"],
            requiredYears: [3, 4],
          },
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.results).toBeDefined()
      expect(response.body.results.eligibleStudents).toBeDefined()
      expect(response.body.results.ineligibleStudents).toBeDefined()
    })

    it("should return error for missing college ID", async () => {
      const response = await request(app)
        .post("/api/bulk/eligibility-filter")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          criteria: {
            minCGPA: 7.0,
          },
        })

      expect(response.status).toBe(400)
    })
  })

  describe("POST /api/bulk/bulk-invite", () => {
    it("should send bulk invitations", async () => {
      const response = await request(app)
        .post("/api/bulk/bulk-invite")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          studentIds: ["student-id-1", "student-id-2"],
          inviteType: "assessment",
          details: {
            assessmentName: "Technical Test",
            assessmentDate: "2024-07-01",
          },
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.results).toBeDefined()
    })

    it("should return error for missing student IDs", async () => {
      const response = await request(app)
        .post("/api/bulk/bulk-invite")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          inviteType: "assessment",
        })

      expect(response.status).toBe(400)
    })
  })

  describe("POST /api/bulk/bulk-update", () => {
    it("should bulk update student records", async () => {
      const response = await request(app)
        .post("/api/bulk/bulk-update")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          studentIds: ["student-id-1", "student-id-2"],
          updateData: {
            academicInfo: {
              currentYear: 4,
            },
          },
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.results).toBeDefined()
    })
  })
})
