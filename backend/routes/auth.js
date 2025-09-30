const express = require("express")
const router = express.Router()
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const User = require("../models/User")

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post("/register", async (req, res) => {
  const { email, password, role, name } = req.body

  try {
    let user = await User.findOne({ email })
    if (user) {
      return res.status(400).json({ msg: "User already exists" })
    }

    user = new User({
      email,
      password,
      role: role || "job_seeker", // Default to job_seeker if not provided
      name,
    })

    const salt = await bcrypt.genSalt(10)
    user.password = await bcrypt.hash(password, salt)

    await user.save()

    const payload = {
      user: {
        id: user.id,
        role: user.role,
        email: user.email,
      },
    }

    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" }, (err, token) => {
      if (err) throw err
      res.json({ token, user: payload.user })
    })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post("/login", async (req, res) => {
  const { email, password } = req.body

  try {
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ msg: "Invalid Credentials" })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid Credentials" })
    }

    const payload = {
      user: {
        id: user.id,
        role: user.role,
        email: user.email,
      },
    }

    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" }, (err, token) => {
      if (err) throw err
      res.json({ token, user: payload.user })
    })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   GET /api/auth/session
// @desc    Get authenticated user session (for frontend to verify token)
// @access  Private (via token in header)
router.get("/session", require("../middleware/auth"), async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password")
    res.json(user)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token invalidation)
// @access  Private
router.post("/logout", require("../middleware/auth"), (req, res) => {
  // For JWT, logout is typically handled client-side by deleting the token.
  // This endpoint can be used to clear any server-side session data if applicable,
  // or simply confirm logout.
  res.json({ msg: "Logged out successfully" })
})

module.exports = router
