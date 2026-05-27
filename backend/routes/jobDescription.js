/**
 * backend/routes/jobDescription.js
 * Thin router — only wires middleware + controller. Zero business logic.
 */
const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const c = require("../controllers/jobDescriptionController")

// AI generator (before /:id to avoid param collision)
router.post("/generate",  auth, c.generateJobDescription)

router.post("/",          auth, c.createJobDescription)
router.get ("/my-jobs",   auth, c.getMyJobs)
router.get ("/all",       auth, c.getAllJobs)
router.get ("/:id",       auth, c.getJobById)
router.put ("/:id",       auth, c.updateJobDescription)
router.delete("/:id",     auth, c.deleteJobDescription)

module.exports = router
