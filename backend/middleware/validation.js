const { body, validationResult } = require("express-validator")

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      msg: "Validation failed",
      errors: errors.array(),
    })
  }
  next()
}

// User registration validation
const validateUserRegistration = [
  body("email").isEmail().normalizeEmail().withMessage("Please provide a valid email"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
  body("name").trim().isLength({ min: 2 }).withMessage("Name must be at least 2 characters long"),
  body("role").isIn(["job_seeker", "recruiter", "admin"]).withMessage("Role must be job_seeker, recruiter, or admin"),
  handleValidationErrors,
]

// Job description validation
const validateJobDescription = [
  body("title").trim().isLength({ min: 3, max: 100 }).withMessage("Title must be between 3 and 100 characters"),
  body("description")
    .trim()
    .isLength({ min: 50, max: 5000 })
    .withMessage("Description must be between 50 and 5000 characters"),
  body("location").trim().isLength({ min: 2, max: 100 }).withMessage("Location must be between 2 and 100 characters"),
  body("employmentType")
    .isIn(["full-time", "part-time", "contract", "internship", "remote"])
    .withMessage("Invalid employment type"),
  body("skills").isArray({ min: 1 }).withMessage("At least one skill is required"),
  handleValidationErrors,
]

// Profile update validation
const validateProfileUpdate = [
  body("email").optional().isEmail().normalizeEmail().withMessage("Please provide a valid email"),
  body("name").optional().trim().isLength({ min: 2 }).withMessage("Name must be at least 2 characters long"),
  body("phone").optional().isMobilePhone().withMessage("Please provide a valid phone number"),
  body("website").optional().isURL().withMessage("Please provide a valid website URL"),
  handleValidationErrors,
]

module.exports = {
  validateUserRegistration,
  validateJobDescription,
  validateProfileUpdate,
  handleValidationErrors,
}
