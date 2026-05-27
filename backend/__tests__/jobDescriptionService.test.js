/**
 * backend/__tests__/jobDescriptionService.test.js
 * Unit tests for jobDescriptionService — all DB/fetch calls are mocked.
 */

jest.mock("../models/JobDescription")

const JobDescription = require("../models/JobDescription")
const jobDescriptionService = require("../services/jobDescriptionService")

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fakeJD = (overrides = {}) => ({
  _id: "jd1",
  recruiterId: { toString: () => "rec1" },
  title: "Senior Engineer",
  description: "Great role",
  requirements: "5 years exp",
  responsibilities: "Build things",
  location: "Remote",
  salary: "$120k",
  employmentType: "Full-time",
  skills: ["Node.js", "React"],
  save: jest.fn().mockResolvedValue(true),
  ...overrides,
})

beforeEach(() => {
  jest.clearAllMocks()
  process.env.GROQ_API_KEY = "test-groq-key"
  // Reset global fetch mock
  global.fetch = undefined
})

// ─── createJobDescription ─────────────────────────────────────────────────────
describe("jobDescriptionService.createJobDescription", () => {
  test("throws 400 if required fields missing", async () => {
    await expect(
      jobDescriptionService.createJobDescription({ recruiterId: "rec1", data: { title: "Dev" } })
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  test("saves and returns new job description", async () => {
    const jd = fakeJD()
    JobDescription.mockImplementation(() => ({ ...jd, save: jest.fn().mockResolvedValue(jd) }))

    const data = {
      title: "Senior Engineer", description: "desc", requirements: "req",
      responsibilities: "resp", location: "Remote", employmentType: "Full-time", skills: ["JS"],
    }

    const result = await jobDescriptionService.createJobDescription({ recruiterId: "rec1", data })
    expect(result.title).toBe("Senior Engineer")
  })
})

// ─── getMyJobs ────────────────────────────────────────────────────────────────
describe("jobDescriptionService.getMyJobs", () => {
  test("returns jobs for recruiter sorted by date", async () => {
    const jobs = [fakeJD(), fakeJD({ _id: "jd2" })]
    const chain = { sort: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(jobs) }
    JobDescription.find = jest.fn().mockReturnValue(chain)

    const result = await jobDescriptionService.getMyJobs({ recruiterId: "rec1" })
    expect(result).toHaveLength(2)
    expect(JobDescription.find).toHaveBeenCalledWith({ recruiterId: "rec1" })
  })
})

// ─── getAllJobs ───────────────────────────────────────────────────────────────
describe("jobDescriptionService.getAllJobs", () => {
  test("uses filtered query for job_seeker role", async () => {
    const chain = { sort: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([]) }
    JobDescription.find = jest.fn().mockReturnValue(chain)

    await jobDescriptionService.getAllJobs({ userRole: "job_seeker" })

    const query = JobDescription.find.mock.calls[0][0]
    expect(query).toHaveProperty("$and") // uses active-only filter
  })

  test("uses empty query for admin role", async () => {
    const chain = { sort: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([]) }
    JobDescription.find = jest.fn().mockReturnValue(chain)

    await jobDescriptionService.getAllJobs({ userRole: "admin" })

    const query = JobDescription.find.mock.calls[0][0]
    expect(query).toEqual({}) // no filter for admin
  })
})

// ─── getJobById ───────────────────────────────────────────────────────────────
describe("jobDescriptionService.getJobById", () => {
  test("throws 404 if not found", async () => {
    JobDescription.findById = jest.fn().mockResolvedValue(null)
    await expect(
      jobDescriptionService.getJobById({ jobId: "jd1", userId: "u1", userRole: "job_seeker" })
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  test("throws 403 if recruiter tries to view another recruiter's job", async () => {
    JobDescription.findById = jest.fn().mockResolvedValue(fakeJD({ recruiterId: { toString: () => "other-rec" } }))
    await expect(
      jobDescriptionService.getJobById({ jobId: "jd1", userId: "rec1", userRole: "recruiter" })
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  test("returns job for job seeker regardless of recruiter", async () => {
    JobDescription.findById = jest.fn().mockResolvedValue(fakeJD())
    const result = await jobDescriptionService.getJobById({ jobId: "jd1", userId: "seeker1", userRole: "job_seeker" })
    expect(result._id).toBe("jd1")
  })

  test("returns own job for recruiter", async () => {
    JobDescription.findById = jest.fn().mockResolvedValue(fakeJD())
    const result = await jobDescriptionService.getJobById({ jobId: "jd1", userId: "rec1", userRole: "recruiter" })
    expect(result._id).toBe("jd1")
  })
})

// ─── updateJobDescription ─────────────────────────────────────────────────────
describe("jobDescriptionService.updateJobDescription", () => {
  test("throws 404 if not found", async () => {
    JobDescription.findById = jest.fn().mockResolvedValue(null)
    await expect(
      jobDescriptionService.updateJobDescription({ jobId: "jd1", recruiterId: "rec1", data: {} })
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  test("throws 403 if not owner", async () => {
    JobDescription.findById = jest.fn().mockResolvedValue(fakeJD({ recruiterId: { toString: () => "other" } }))
    await expect(
      jobDescriptionService.updateJobDescription({ jobId: "jd1", recruiterId: "rec1", data: { title: "New" } })
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  test("updates allowed fields and saves", async () => {
    const jd = fakeJD()
    JobDescription.findById = jest.fn().mockResolvedValue(jd)

    const result = await jobDescriptionService.updateJobDescription({
      jobId: "jd1", recruiterId: "rec1", data: { title: "Updated Title", location: "NYC" },
    })

    expect(jd.title).toBe("Updated Title")
    expect(jd.location).toBe("NYC")
    expect(jd.save).toHaveBeenCalled()
  })
})

// ─── deleteJobDescription ─────────────────────────────────────────────────────
describe("jobDescriptionService.deleteJobDescription", () => {
  test("throws 404 if not found", async () => {
    JobDescription.findById = jest.fn().mockResolvedValue(null)
    await expect(
      jobDescriptionService.deleteJobDescription({ jobId: "jd1", recruiterId: "rec1" })
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  test("throws 403 if not owner", async () => {
    JobDescription.findById = jest.fn().mockResolvedValue(fakeJD({ recruiterId: { toString: () => "other" } }))
    await expect(
      jobDescriptionService.deleteJobDescription({ jobId: "jd1", recruiterId: "rec1" })
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  test("deletes job when recruiter is owner", async () => {
    JobDescription.findById = jest.fn().mockResolvedValue(fakeJD())
    JobDescription.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 })

    await jobDescriptionService.deleteJobDescription({ jobId: "jd1", recruiterId: "rec1" })
    expect(JobDescription.deleteOne).toHaveBeenCalledWith({ _id: "jd1" })
  })
})

// ─── generateJobDescription ───────────────────────────────────────────────────
describe("jobDescriptionService.generateJobDescription", () => {
  test("throws 400 if jobTitle is missing", async () => {
    await expect(
      jobDescriptionService.generateJobDescription({ jobTitle: "" })
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  test("throws 503 if GROQ_API_KEY not set", async () => {
    delete process.env.GROQ_API_KEY
    await expect(
      jobDescriptionService.generateJobDescription({ jobTitle: "Dev" })
    ).rejects.toMatchObject({ statusCode: 503 })
  })

  test("returns generated JD on successful Groq response", async () => {
    const fakeGenerated = { title: "Dev", description: "Great", responsibilities: [], requirements: [], skills: [], benefits: [] }
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: JSON.stringify(fakeGenerated) } }],
      }),
    })

    const result = await jobDescriptionService.generateJobDescription({ jobTitle: "Dev", company: "Acme" })
    expect(result.title).toBe("Dev")
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  test("throws 502 if Groq API returns non-ok response", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      text: () => Promise.resolve("Rate limit exceeded"),
    })

    await expect(
      jobDescriptionService.generateJobDescription({ jobTitle: "Dev" })
    ).rejects.toMatchObject({ statusCode: 502 })
  })

  test("throws 502 if Groq returns empty content", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [] }),
    })

    await expect(
      jobDescriptionService.generateJobDescription({ jobTitle: "Dev" })
    ).rejects.toMatchObject({ statusCode: 502 })
  })
})
