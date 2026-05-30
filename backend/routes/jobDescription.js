/**
 * backend/routes/jobDescription.js
 * Thin router — only wires middleware + controller. Zero business logic.
 */
const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const { cacheMiddleware, invalidateCache } = require("../middleware/cache")
const c = require("../controllers/jobDescriptionController")

// AI generator (before /:id to avoid param collision)
router.post("/generate",  auth, c.generateJobDescription)

router.post("/",          auth, c.createJobDescription)
router.get ("/my-jobs",   auth, cacheMiddleware('jobs:my-jobs', 300), c.getMyJobs)
router.get ("/all",       auth, cacheMiddleware('jobs:all', 180), c.getAllJobs)
router.get ("/:id",       auth, cacheMiddleware('jobs:detail', 600), c.getJobById)
router.put ("/:id",       auth, async (req, res, next) => {
  await invalidateCache('jobs:*');
  next();
}, c.updateJobDescription)
router.delete("/:id",     auth, async (req, res, next) => {
  await invalidateCache('jobs:*');
  next();
}, c.deleteJobDescription)

module.exports = router
