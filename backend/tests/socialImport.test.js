const jwt = require("jsonwebtoken")
const request = require("supertest")
const express = require("express")
const mongoose = require("mongoose")
const socialImportRoutes = require("../routes/socialImport")
const User = require("../models/User")

const app = express()
app.use(express.json())
app.use("/api/social-import", socialImportRoutes)

describe("Social Import API", () => {
  let authToken
  let testUser

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI || "mongodb://localhost:27017/hireai-test")

    testUser = await User.create({
      name: "Test User",
      email: "user@test.com",
      password: "password123",
      role: "job_seeker",
    })

    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-key"
    authToken = jwt.sign({ userId: testUser._id, role: testUser.role, email: testUser.email }, process.env.JWT_SECRET)
  })

  afterAll(async () => {
    await User.deleteMany({})
    await mongoose.connection.close()
  })

  describe("POST /api/social-import/linkedin", () => {
    it("should import LinkedIn profile", async () => {
      const response = await request(app)
        .post("/api/social-import/linkedin")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          accessToken: "test-access-token",
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.profile).toBeDefined()
    })

    it("should return error for missing access token", async () => {
      const response = await request(app)
        .post("/api/social-import/linkedin")
        .set("Authorization", `Bearer ${authToken}`)
        .send({})

      expect(response.status).toBe(400)
    })
  })

  describe("POST /api/social-import/github", () => {
    it("should import GitHub profile", async () => {
      const response = await request(app)
        .post("/api/social-import/github")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          accessToken: "test-github-token",
          username: "testuser",
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.profile).toBeDefined()
    })
  })

  describe("GET /api/social-import/github/:username", () => {
    it("should get public GitHub profile", async () => {
      const response = await request(app)
        .get("/api/social-import/github/testuser")

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.profile).toBeDefined()
    })
  })
})
