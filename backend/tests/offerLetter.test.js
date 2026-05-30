const jwt = require("jsonwebtoken")
const request = require("supertest")
const express = require("express")
const mongoose = require("mongoose")
const offerLetterRoutes = require("../routes/offerLetter")
const User = require("../models/User")
const OfferLetter = require("../models/OfferLetter")

const app = express()
app.use(express.json())
app.use("/api/offer-letter", offerLetterRoutes)

describe("Offer Letter API", () => {
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
    await OfferLetter.deleteMany({})
    await mongoose.connection.close()
  })

  describe("POST /api/offer-letter/create", () => {
    it("should create a new offer letter", async () => {
      const response = await request(app)
        .post("/api/offer-letter/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          applicationId: "507f1f77bcf86cd799439013",
          position: "Software Engineer",
          salary: 80000,
          startDate: "2024-07-01",
          expirationDate: "2024-06-15",
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.offerLetter).toBeDefined()
    })

    it("should return error for missing required fields", async () => {
      const response = await request(app)
        .post("/api/offer-letter/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({})

      expect(response.status).toBe(400)
    })
  })

  describe("GET /api/offer-letter/:id", () => {
    it("should get offer letter by ID", async () => {
      // First create an offer letter
      const createResponse = await request(app)
        .post("/api/offer-letter/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          applicationId: "507f1f77bcf86cd799439013",
          position: "Software Engineer",
          salary: 80000,
          startDate: "2024-07-01",
        })

      const offerId = createResponse.body.offerLetter._id

      const response = await request(app)
        .get(`/api/offer-letter/${offerId}`)
        .set("Authorization", `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.offerLetter).toBeDefined()
    })
  })

  describe("PUT /api/offer-letter/:id/send", () => {
    it("should send offer letter", async () => {
      const createResponse = await request(app)
        .post("/api/offer-letter/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          applicationId: "507f1f77bcf86cd799439013",
          position: "Software Engineer",
          salary: 80000,
          startDate: "2024-07-01",
        })

      const offerId = createResponse.body.offerLetter._id

      const response = await request(app)
        .put(`/api/offer-letter/${offerId}/send`)
        .set("Authorization", `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.offerLetter.status).toBe("Sent")
    })
  })
})
