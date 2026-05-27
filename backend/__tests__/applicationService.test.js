/**
 * backend/__tests__/applicationService.test.js
 * Unit tests for applicationService — all DB/email calls are mocked.
 */

jest.mock("../models/JobApplication")
jest.mock("../models/JobDescription")
jest.mock("../models/Resume")
jest.mock("../models/User")
jest.mock("../models/Notification")
jest.mock("../utils/emailService")

const JobApplication = require("../models/JobApplication")
const JobDescription = require("../models/JobDescription")
const Resume = require("../models/Resume")
const User = require("../models/User")
const Notification = require("../models/Notification")
const sendEmail = require("../utils/emailService")
const applicationService = require("../services/applicationService")

// ─── Helpers ──────────────────────────────────────────────────────────────────
const mockSave = jest.fn().mockResolvedValue(true)

// Builds a mock Mongoose query chain that supports unlimited .populate() calls
// before finally resolving with `resolvedValue`.
function buildChain(resolvedValue) {
  const chain = {
    populate: jest.fn(),
    sort: jest.fn(),
    lean: jest.fn().mockResolvedValue(resolvedValue),
    then: undefined, // mark as non-thenable until end
  }
  // Each .populate() call returns the same chain (fluent)
  chain.populate.mockReturnValue(chain)
  chain.sort.mockReturnValue(chain)
  // Make the chain itself thenable (so await works)
  chain.then = (resolve, reject) =>
    Promise.resolve(resolvedValue).then(resolve, reject)
  return chain
}

const fakeJD = (overrides = {}) => ({
  _id: "jd1",
  recruiterId: { toString: () => "recruiter1" },
  title: "Frontend Engineer",
  ...overrides,
})

const fakeApp = (overrides = {}) => ({
  _id: "app1",
  jobSeekerId: { _id: "seeker1", email: "seeker@test.com", name: "Seeker" },
  jobDescriptionId: { _id: "jd1", title: "Frontend Engineer", recruiterId: { toString: () => "recruiter1" } },
  resumeId: { filename: "resume.pdf" },
  status: "Pending",
  save: mockSave,
  ...overrides,
})

beforeEach(() => {
  jest.clearAllMocks()
  sendEmail.mockResolvedValue({ messageId: "mock" })
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000"
  // Default Notification mock
  Notification.mockImplementation(() => ({ save: jest.fn().mockResolvedValue(true) }))
})

// ─── submitApplication ────────────────────────────────────────────────────────
describe("applicationService.submitApplication", () => {
  test("throws 404 if job description not found", async () => {
    JobDescription.findById = jest.fn().mockResolvedValue(null)
    Resume.findById = jest.fn().mockResolvedValue({ _id: "r1", userId: { toString: () => "u1" } })

    await expect(
      applicationService.submitApplication({ userId: "u1", userEmail: "u@t.com", jobDescriptionId: "jd1", resumeId: "r1" })
    ).rejects.toMatchObject({ statusCode: 404, message: "Job description not found" })
  })

  test("throws 404 if resume not found", async () => {
    JobDescription.findById = jest.fn().mockResolvedValue(fakeJD())
    Resume.findById = jest.fn().mockResolvedValue(null)

    await expect(
      applicationService.submitApplication({ userId: "u1", userEmail: "u@t.com", jobDescriptionId: "jd1", resumeId: "r1" })
    ).rejects.toMatchObject({ statusCode: 404, message: "Resume not found" })
  })

  test("throws 403 if resume does not belong to user", async () => {
    JobDescription.findById = jest.fn().mockResolvedValue(fakeJD())
    Resume.findById = jest.fn().mockResolvedValue({ _id: "r1", userId: { toString: () => "other-user" } })

    await expect(
      applicationService.submitApplication({ userId: "u1", userEmail: "u@t.com", jobDescriptionId: "jd1", resumeId: "r1" })
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  test("throws 400 if already applied", async () => {
    JobDescription.findById = jest.fn().mockResolvedValue(fakeJD())
    Resume.findById = jest.fn().mockResolvedValue({ _id: "r1", userId: { toString: () => "u1" } })
    JobApplication.findOne = jest.fn().mockResolvedValue(fakeApp()) // already exists

    await expect(
      applicationService.submitApplication({ userId: "u1", userEmail: "u@t.com", jobDescriptionId: "jd1", resumeId: "r1" })
    ).rejects.toMatchObject({ statusCode: 400, message: "You have already applied for this job." })
  })

  test("saves application and notifies recruiter on success", async () => {
    JobDescription.findById = jest.fn().mockResolvedValue(fakeJD())
    Resume.findById = jest.fn().mockResolvedValue({ _id: "r1", userId: { toString: () => "u1" } })
    JobApplication.findOne = jest.fn().mockResolvedValue(null)

    const savedApp = fakeApp()
    JobApplication.mockImplementation(() => ({ ...savedApp, save: jest.fn().mockResolvedValue(savedApp) }))

    User.findById = jest.fn().mockResolvedValue({ _id: "rec1", email: "rec@test.com", name: "Recruiter" })

    const result = await applicationService.submitApplication({
      userId: "u1", userEmail: "u@test.com", jobDescriptionId: "jd1", resumeId: "r1",
    })

    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(sendEmail.mock.calls[0][0].subject).toContain("Frontend Engineer")
  })

  test("still succeeds even if recruiter notification fails", async () => {
    JobDescription.findById = jest.fn().mockResolvedValue(fakeJD())
    Resume.findById = jest.fn().mockResolvedValue({ _id: "r1", userId: { toString: () => "u1" } })
    JobApplication.findOne = jest.fn().mockResolvedValue(null)
    JobApplication.mockImplementation(() => ({ save: jest.fn().mockResolvedValue(fakeApp()) }))
    User.findById = jest.fn().mockResolvedValue({ _id: "rec1", email: "rec@test.com" })
    sendEmail.mockRejectedValue(new Error("SMTP error")) // email fails

    // Should not throw — uses Promise.allSettled
    await expect(
      applicationService.submitApplication({ userId: "u1", userEmail: "u@t.com", jobDescriptionId: "jd1", resumeId: "r1" })
    ).resolves.toBeDefined()
  })
})

// ─── getMyApplications ────────────────────────────────────────────────────────
describe("applicationService.getMyApplications", () => {
  test("returns applications for the given user", async () => {
    const apps = [fakeApp(), fakeApp({ _id: "app2" })]
    const chain = { populate: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(apps) }
    JobApplication.find = jest.fn().mockReturnValue(chain)

    const result = await applicationService.getMyApplications({ userId: "u1" })
    expect(result).toHaveLength(2)
    expect(JobApplication.find).toHaveBeenCalledWith({ jobSeekerId: "u1" })
  })
})

// ─── getApplicationsForJob ────────────────────────────────────────────────────
describe("applicationService.getApplicationsForJob", () => {
  test("throws 404 if job not found", async () => {
    JobDescription.findById = jest.fn().mockResolvedValue(null)
    await expect(
      applicationService.getApplicationsForJob({ jobId: "jd1", recruiterId: "rec1" })
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  test("throws 403 if recruiter does not own the job", async () => {
    JobDescription.findById = jest.fn().mockResolvedValue(fakeJD({ recruiterId: { toString: () => "other-recruiter" } }))
    await expect(
      applicationService.getApplicationsForJob({ jobId: "jd1", recruiterId: "rec1" })
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  test("returns applications when recruiter owns job", async () => {
    JobDescription.findById = jest.fn().mockResolvedValue(fakeJD())
    const apps = [fakeApp()]
    const chain = { populate: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(apps) }
    JobApplication.find = jest.fn().mockReturnValue(chain)

    const result = await applicationService.getApplicationsForJob({ jobId: "jd1", recruiterId: "recruiter1" })
    expect(result).toHaveLength(1)
  })
})

// ─── updateApplicationStatus ──────────────────────────────────────────────────
describe("applicationService.updateApplicationStatus", () => {
  test("throws 404 if application not found", async () => {
    JobApplication.findById = jest.fn().mockReturnValue(buildChain(null))

    await expect(
      applicationService.updateApplicationStatus({ applicationId: "app1", recruiterId: "rec1", status: "Accepted" })
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  test("throws 403 if recruiter does not own the job", async () => {
    const app = fakeApp({
      jobDescriptionId: { _id: "jd1", title: "Dev", recruiterId: { toString: () => "other" } },
    })
    JobApplication.findById = jest.fn().mockReturnValue(buildChain(app))

    await expect(
      applicationService.updateApplicationStatus({ applicationId: "app1", recruiterId: "rec1", status: "Accepted" })
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  test("updates status and notifies job seeker", async () => {
    const app = { ...fakeApp(), save: jest.fn().mockResolvedValue(true) }
    JobApplication.findById = jest.fn().mockReturnValue(buildChain(app))

    const result = await applicationService.updateApplicationStatus({
      applicationId: "app1", recruiterId: "recruiter1", status: "Shortlisted",
    })

    expect(result.status).toBe("Shortlisted")
    expect(app.save).toHaveBeenCalled()
    expect(sendEmail).toHaveBeenCalledTimes(1)
  })
})

// ─── getApplicationById ───────────────────────────────────────────────────────
describe("applicationService.getApplicationById", () => {
  test("throws 404 if not found", async () => {
    JobApplication.findById = jest.fn().mockReturnValue(buildChain(null))

    await expect(
      applicationService.getApplicationById({ applicationId: "app1", userId: "u1", userRole: "job_seeker" })
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  test("throws 403 if job seeker tries to view another's application", async () => {
    const app = fakeApp({ jobSeekerId: { _id: { toString: () => "other" }, email: "other@t.com" } })
    JobApplication.findById = jest.fn().mockReturnValue(buildChain(app))

    await expect(
      applicationService.getApplicationById({ applicationId: "app1", userId: "u1", userRole: "job_seeker" })
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  test("returns application for owner", async () => {
    const app = fakeApp({ jobSeekerId: { _id: { toString: () => "u1" }, email: "u@t.com" } })
    JobApplication.findById = jest.fn().mockReturnValue(buildChain(app))

    const result = await applicationService.getApplicationById({ applicationId: "app1", userId: "u1", userRole: "job_seeker" })
    expect(result._id).toBe("app1")
  })

  test("admin can view any application", async () => {
    const app = fakeApp({ jobSeekerId: { _id: { toString: () => "someone-else" }, email: "s@t.com" } })
    JobApplication.findById = jest.fn().mockReturnValue(buildChain(app))

    const result = await applicationService.getApplicationById({ applicationId: "app1", userId: "admin1", userRole: "admin" })
    expect(result._id).toBe("app1")
  })
})
