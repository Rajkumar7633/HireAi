const jwt = require("jsonwebtoken")
const request = require("supertest")
const express = require("express")
const mongoose = require("mongoose")
const emailTemplatesRoutes = require("../routes/emailTemplates")
const User = require("../models/User")
const EmailTemplate = require("../models/EmailTemplate")

const app = express()
app.use(express.json())
app.use("/api/email-templates", emailTemplatesRoutes)

describe("Email Templates API", () => {
  let authToken
  let testUser

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI || "mongodb://localhost:27017/hireai-test")

    testUser = await User.create({
      name: "Test Admin",
      email: "admin@test.com",
      password: "password123",
      role: "admin",
    })

    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-key"
    authToken = jwt.sign({ userId: testUser._id, role: testUser.role, email: testUser.email }, process.env.JWT_SECRET)
  })

  afterAll(async () => {
    await User.deleteMany({})
    await EmailTemplate.deleteMany({})
    await mongoose.connection.close()
  })

  describe("POST /api/email-templates/create", () => {
    it("should create a new email template", async () => {
      const response = await request(app)
        .post("/api/email-templates/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Welcome Email",
          category: "notifications",
          subject: "Welcome to {{companyName}}",
          body: "Dear {{candidateName}}, welcome to our team!",
          variables: ["candidateName", "companyName"],
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.template).toBeDefined()
    })

    it("should return error for missing required fields", async () => {
      const response = await request(app)
        .post("/api/email-templates/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Test Template",
        })

      expect(response.status).toBe(400)
    })
  })

  describe("GET /api/email-templates", () => {
    it("should get all email templates", async () => {
      const response = await request(app)
        .get("/api/email-templates")
        .set("Authorization", `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.templates).toBeDefined()
    })
  })

  describe("GET /api/email-templates/:id", () => {
    it("should get template by ID", async () => {
      const createResponse = await request(app)
        .post("/api/email-templates/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Test Template",
          category: "notifications",
          subject: "Test Subject",
          body: "Test body",
        })

      const templateId = createResponse.body.template._id

      const response = await request(app)
        .get(`/api/email-templates/${templateId}`)
        .set("Authorization", `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.template).toBeDefined()
    })
  })

  describe("PUT /api/email-templates/:id", () => {
    it("should update email template", async () => {
      const createResponse = await request(app)
        .post("/api/email-templates/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Test Template",
          category: "notifications",
          subject: "Test Subject",
          body: "Test body",
        })

      const templateId = createResponse.body.template._id

      const response = await request(app)
        .put(`/api/email-templates/${templateId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          subject: "Updated Subject",
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })
  })

  describe("POST /api/email-templates/preview", () => {
    it("should preview email template with variables", async () => {
      const createResponse = await request(app)
        .post("/api/email-templates/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Test Template",
          category: "notifications",
          subject: "Hello {{name}}",
          body: "Dear {{name}}, welcome!",
          variables: ["name"],
        })

      const templateId = createResponse.body.template._id

      const response = await request(app)
        .post("/api/email-templates/preview")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          templateId,
          variables: {
            name: "John Doe",
          },
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.preview).toBeDefined()
    })
  })
})
