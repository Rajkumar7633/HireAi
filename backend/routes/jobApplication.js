/**
 * backend/routes/jobApplication.js
 * Thin router — only wires middleware + controller. Zero business logic.
 */
const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const c = require("../controllers/applicationController")

router.post("/",                      auth, c.submitApplication)
router.get ("/my-applications",       auth, c.getMyApplications)
router.get ("/job/:jobId",            auth, c.getApplicationsForJob)
router.put ("/:id/status",            auth, c.updateApplicationStatus)
router.get ("/:id",                   auth, c.getApplicationById)

module.exports = router
