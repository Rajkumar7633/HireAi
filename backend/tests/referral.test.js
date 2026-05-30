const jwt = require("jsonwebtoken")
const request = require("supertest")
const express = require("express")
const mongoose = require("mongoose")
const referralRoutes = require("../routes/referral")
const User = require("../models/User")
const Referral = require("../models/Referral")

const app = express()
app.use(express.json())
app.use("/api/referral", referralRoutes)

describe("Referral Engine API", () => {
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
    await Referral.deleteMany({})
    await mongoose.connection.close()
  })

  describe("POST /api/referral/create", () => {
    it("should create a new referral", async () => {
      const response = await request(app)
        .post("/api/referral/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          referredEmail: "candidate@test.com",
          bonusAmount: 500,
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.referral).toBeDefined()
      expect(response.body.referralCode).toBeDefined()
    })

    it("should return error for missing email", async () => {
      const response = await request(app)
        .post("/api/referral/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ bonusAmount: 500 })

      expect(response.status).toBe(400)
    })

    it("should return error for duplicate referral", async () => {
      await request(app)
        .post("/api/referral/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          referredEmail: "candidate@test.com",
          bonusAmount: 500,
        })

      const response = await request(app)
        .post("/api/referral/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          referredEmail: "candidate@test.com",
          bonusAmount: 500,
        })

      expect(response.status).toBe(400)
    })
  })

  describe("GET /api/referral/my-referrals", () => {
    it("should get user referrals", async () => {
      const response = await request(app)
        .get("/api/referral/my-referrals")
        .set("Authorization", `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.referrals).toBeDefined()
      expect(response.body.stats).toBeDefined()
    })
  })

  describe("GET /api/referral/leaderboard", () => {
    it("should get referral leaderboard", async () => {
      const response = await request(app)
        .get("/api/referral/leaderboard")
        .set("Authorization", `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.leaderboard).toBeDefined()
    })
  })
})
