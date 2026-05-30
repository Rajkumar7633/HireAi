const jwt = require("jsonwebtoken")
const request = require("supertest")
const express = require("express")
const mongoose = require("mongoose")
const exportReportsRoutes = require("../routes/exportReports")
const User = require("../models/User")
const JobApplication = require("../models/JobApplication")

const app = express()
app.use(express.json())
app.use("/api/export", exportReportsRoutes)

describe("Export Reports API", () => {
  let authToken
  let testUser

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI || "mongodb://localhost:27017/hireai-test")

    testUser = await User.create({
      name: "Test Recruiter",
      email: "recruiter@test.com",
      password: "password123",
      role: "recruiter",
    })

    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-key"
    authToken = jwt.sign({ userId: testUser._id, role: testUser.role, email: testUser.email }, process.env.JWT_SECRET)
  })

  afterAll(async () => {
    await User.deleteMany({})
    await JobApplication.deleteMany({})
    await mongoose.connection.close()
  })

  describe("POST /api/export/applications", () => {
    it("should export applications to CSV", async () => {
      const response = await request(app)
        .post("/api/export/applications")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          format: "csv",
        })

      expect(response.status).toBe(200)
      expect(response.headers["content-type"]).toContain("text/csv")
    })

    it("should export applications to PDF", async () => {
      const response = await request(app)
        .post("/api/export/applications")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          format: "pdf",
        })

      expect(response.status).toBe(200)
      expect(response.headers["content-type"]).toContain("application/pdf")
    })
  })

  describe("POST /api/export/analytics", () => {
    it("should export analytics to CSV", async () => {
      const response = await request(app)
        .post("/api/export/analytics")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          format: "csv",
          period: "30d",
        })

      expect(response.status).toBe(200)
      expect(response.headers["content-type"]).toContain("text/csv")
    })

    it("should export analytics to PDF", async () => {
      const response = await request(app)
        .post("/api/export/analytics")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          format: "pdf",
          period: "30d",
        })

      expect(response.status).toBe(200)
      expect(response.headers["content-type"]).toContain("application/pdf")
    })
  })
})
