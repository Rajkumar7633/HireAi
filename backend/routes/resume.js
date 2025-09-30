const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const Resume = require("../models/Resume")
const multer = require("multer")
const path = require("path")
const fs = require("fs")

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../../uploads/resumes")
    fs.mkdirSync(uploadPath, { recursive: true }) // Ensure directory exists
    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    cb(null, `${req.user.id}-${Date.now()}${path.extname(file.originalname)}`)
  },
})

const upload = multer({ storage: storage })

// @route   POST /api/resume/upload
// @desc    Upload and parse a resume
// @access  Private (Job Seeker)
router.post("/upload", auth, upload.single("resume"), async (req, res) => {
  if (req.user.role !== "job_seeker") {
    return res.status(403).json({ msg: "Access denied. Only job seekers can upload resumes." })
  }

  try {
    if (!req.file) {
      return res.status(400).json({ msg: "No file uploaded" })
    }

    const { filename, path: filepath } = req.file

    // Simulate ML parsing
    // In a real application, you would send the file to an ML service here
    // const mlServiceResponse = await axios.post(process.env.ML_SERVICE_URL + '/parse_resume', { filePath: filepath });
    // const parsedText = mlServiceResponse.data.parsedText;
    // const metadata = mlServiceResponse.data.metadata;

    const parsedText = `Simulated parsed text from ${filename}. Skills: React, Node.js, AWS, Problem Solving.`
    const metadata = {
      skills: ["React", "Node.js", "AWS", "Problem Solving"],
      experience: "5 years",
      education: "B.S. Computer Science",
    }

    const newResume = new Resume({
      userId: req.user.id,
      filename: filename,
      filepath: filepath,
      parsedText: parsedText,
      metadata: metadata,
      uploadDate: new Date(),
    })

    await newResume.save()

    res.json({ msg: "Resume uploaded and parsed successfully", resume: newResume })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   GET /api/resume/my-resumes
// @desc    Get all resumes for the authenticated job seeker
// @access  Private (Job Seeker)
router.get("/my-resumes", auth, async (req, res) => {
  if (req.user.role !== "job_seeker") {
    return res.status(403).json({ msg: "Access denied. Only job seekers can view their resumes." })
  }

  try {
    const resumes = await Resume.find({ userId: req.user.id }).sort({ uploadDate: -1 })
    res.json(resumes)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   GET /api/resume/:id
// @desc    Get a single resume by ID
// @access  Private (Job Seeker, Recruiter, Admin - with authorization checks)
router.get("/:id", auth, async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id)

    if (!resume) {
      return res.status(404).json({ msg: "Resume not found" })
    }

    // Authorization: Job seeker can view their own resume.
    // Recruiter can view resumes matched to their job descriptions.
    // Admin can view any resume.
    if (req.user.role === "job_seeker" && resume.userId.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(401).json({ msg: "Not authorized to view this resume" })
    }

    res.json(resume)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   DELETE /api/resume/:id
// @desc    Delete a resume by ID
// @access  Private (Job Seeker)
router.delete("/:id", auth, async (req, res) => {
  if (req.user.role !== "job_seeker") {
    return res.status(403).json({ msg: "Access denied. Only job seekers can delete their resumes." })
  }

  try {
    const resume = await Resume.findById(req.params.id)

    if (!resume) {
      return res.status(404).json({ msg: "Resume not found" })
    }

    // Ensure user owns the resume
    if (resume.userId.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized" })
    }

    // Delete the file from the server (if stored locally)
    fs.unlink(resume.filepath, (err) => {
      if (err) console.error("Failed to delete resume file:", err)
    })

    await Resume.deleteOne({ _id: req.params.id })

    res.json({ msg: "Resume removed" })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

module.exports = router
