const jwt = require("jsonwebtoken")
const request = require("supertest")
const express = require("express")
const mongoose = require("mongoose")
const studentTrackingRoutes = require("../routes/studentTracking")
const User = require("../models/User")
const StudentTracking = require("../models/StudentTracking")

const app = express()
app.use(express.json())
app.use("/api/student-tracking", studentTrackingRoutes)

describe("Student Tracking API", () => {
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
    await StudentTracking.deleteMany({})
    await mongoose.connection.close()
  })

  describe("POST /api/student-tracking/create", () => {
    it("should create student tracking record", async () => {
      const student = await User.create({
        name: "Test Student",
        email: "student@test.com",
        password: "password123",
        role: "job_seeker",
      })

      const response = await request(app)
        .post("/api/student-tracking/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          studentId: student._id,
          collegeId: testUser._id,
          academicInfo: {
            currentYear: 3,
            branch: "CSE",
            cgpa: 8.5,
          },
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.tracking).toBeDefined()
    })

    it("should return error for missing student ID", async () => {
      const response = await request(app)
        .post("/api/student-tracking/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          collegeId: testUser._id,
        })

      expect(response.status).toBe(400)
    })
  })

  describe("GET /api/student-tracking/student/:studentId", () => {
    it("should get student tracking record", async () => {
      const student = await User.create({
        name: "Test Student 2",
        email: "student2@test.com",
        password: "password123",
        role: "job_seeker",
      })

      await StudentTracking.create({
        studentId: student._id,
        collegeId: testUser._id,
        academicInfo: {
          currentYear: 2,
          branch: "ECE",
          cgpa: 7.5,
        },
      })

      const response = await request(app)
        .get(`/api/student-tracking/student/${student._id}`)
        .set("Authorization", `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.tracking).toBeDefined()
    })
  })

  describe("GET /api/student-tracking/analytics/:collegeId", () => {
    it("should get college analytics", async () => {
      const response = await request(app)
        .get(`/api/student-tracking/analytics/${testUser._id}`)
        .set("Authorization", `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.analytics).toBeDefined()
      expect(response.body.analytics.totalStudents).toBeDefined()
    })
  })
})
