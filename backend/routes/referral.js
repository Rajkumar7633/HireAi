const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const Referral = require("../models/Referral")
const User = require("../models/User")
const JobDescription = require("../models/JobDescription")
const crypto = require("crypto")

// Generate unique referral code
function generateReferralCode() {
  return crypto.randomBytes(8).toString("hex").toUpperCase()
}

// @route   POST /api/referral/create
// @desc    Create a new referral
// @access  Private (All authenticated users)
router.post("/create", auth, async (req, res) => {
  const { referredEmail, jobId, bonusAmount } = req.body

  if (!referredEmail) {
    return res.status(400).json({ msg: "Referred email is required" })
  }

  try {
    // Check if referral already exists for this email
    const existingReferral = await Referral.findOne({ referredEmail })
    if (existingReferral) {
      return res.status(400).json({ msg: "Referral already exists for this email" })
    }

    const referralCode = generateReferralCode()

    const referral = new Referral({
      referrerId: req.user.id,
      referredEmail,
      jobId: jobId || null,
      referralCode,
      bonus: {
        amount: bonusAmount || 0,
      },
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    })

    await referral.save()

    // TODO: Send referral email to referredEmail

    res.json({
      success: true,
      referral,
      referralLink: `${process.env.FRONTEND_URL || "http://localhost:3000"}/referral/${referralCode}`,
      msg: "Referral created successfully"
    })
  } catch (error) {
    console.error("Referral creation error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   GET /api/referral/code/:code
// @desc    Get referral by code (public endpoint for signup)
// @access  Public
router.get("/code/:code", auth, async (req, res) => {
  try {
    const referral = await Referral.findOne({ referralCode: req.params.code })
      .populate("referrerId", "name email")
      .populate("jobId", "title description")

    if (!referral) {
      return res.status(404).json({ msg: "Invalid referral code" })
    }

    if (new Date(referral.expiresAt) < new Date()) {
      return res.status(400).json({ msg: "Referral code has expired" })
    }

    // Mark as clicked
    if (!referral.clickedAt) {
      referral.clickedAt = Date.now()
      await referral.save()
    }

    res.json({
      success: true,
      referral: {
        referrerName: referral.referrerId.name,
        jobTitle: referral.jobId?.title,
        bonusAmount: referral.bonus.amount,
      }
    })
  } catch (error) {
    console.error("Get referral error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   POST /api/referral/apply
// @desc    Apply referral code during signup
// @access  Public
router.post("/apply", async (req, res) => {
  const { referralCode, userId } = req.body

  if (!referralCode) {
    return res.status(400).json({ msg: "Referral code is required" })
  }

  try {
    const referral = await Referral.findOne({ referralCode })

    if (!referral) {
      return res.status(404).json({ msg: "Invalid referral code" })
    }

    if (new Date(referral.expiresAt) < new Date()) {
      return res.status(400).json({ msg: "Referral code has expired" })
    }

    if (referral.status !== "Pending") {
      return res.status(400).json({ msg: "Referral code already used" })
    }

    // Update referral
    referral.referredUserId = userId
    referral.status = "Signed Up"
    referral.signedUpAt = Date.now()

    await referral.save()

    res.json({
      success: true,
      msg: "Referral applied successfully"
    })
  } catch (error) {
    console.error("Apply referral error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   GET /api/referral/my-referrals
// @desc    Get all referrals for current user
// @access  Private
router.get("/my-referrals", auth, async (req, res) => {
  try {
    const referrals = await Referral.find({ referrerId: req.user.id })
      .populate("referredUserId", "name email")
      .populate("jobId", "title")
      .sort({ createdAt: -1 })

    res.json({
      success: true,
      referrals,
      total: referrals.length,
      stats: {
        pending: referrals.filter(r => r.status === "Pending").length,
        signedUp: referrals.filter(r => r.status === "Signed Up").length,
        applied: referrals.filter(r => r.status === "Applied").length,
        hired: referrals.filter(r => r.status === "Hired").length,
        bonusPaid: referrals.filter(r => r.status === "Bonus Paid").length,
        totalBonusEarned: referrals
          .filter(r => r.bonus.status === "Paid")
          .reduce((sum, r) => sum + (r.bonus.amount || 0), 0)
      }
    })
  } catch (error) {
    console.error("Get my referrals error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   PUT /api/referral/:id/update-status
// @desc    Update referral status (for recruiters/admins)
// @access  Private (Recruiter/Admin)
router.put("/:id/update-status", auth, async (req, res) => {
  if (req.user.role !== "recruiter" && req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" })
  }

  const { status } = req.body

  try {
    const referral = await Referral.findById(req.params.id)

    if (!referral) {
      return res.status(404).json({ msg: "Referral not found" })
    }

    referral.status = status

    if (status === "Applied") {
      referral.appliedAt = Date.now()
    } else if (status === "Hired") {
      referral.hiredAt = Date.now()
    }

    await referral.save()

    res.json({
      success: true,
      referral,
      msg: "Referral status updated successfully"
    })
  } catch (error) {
    console.error("Update referral status error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   PUT /api/referral/:id/approve-bonus
// @desc    Approve referral bonus
// @access  Private (Recruiter/Admin)
router.put("/:id/approve-bonus", auth, async (req, res) => {
  if (req.user.role !== "recruiter" && req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" })
  }

  try {
    const referral = await Referral.findById(req.params.id)

    if (!referral) {
      return res.status(404).json({ msg: "Referral not found" })
    }

    if (referral.status !== "Hired") {
      return res.status(400).json({ msg: "Can only approve bonus for hired referrals" })
    }

    referral.bonus.status = "Approved"
    referral.bonus.approvedBy = req.user.id
    referral.bonus.approvedAt = Date.now()

    await referral.save()

    // TODO: Send notification to referrer

    res.json({
      success: true,
      referral,
      msg: "Bonus approved successfully"
    })
  } catch (error) {
    console.error("Approve bonus error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   PUT /api/referral/:id/pay-bonus
// @desc    Mark referral bonus as paid
// @access  Private (Admin/Finance)
router.put("/:id/pay-bonus", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied. Only admins can pay bonuses." })
  }

  try {
    const referral = await Referral.findById(req.params.id)

    if (!referral) {
      return res.status(404).json({ msg: "Referral not found" })
    }

    if (referral.bonus.status !== "Approved") {
      return res.status(400).json({ msg: "Bonus must be approved before payment" })
    }

    referral.bonus.status = "Paid"
    referral.bonus.paidAt = Date.now()
    referral.status = "Bonus Paid"

    await referral.save()

    // TODO: Send payment confirmation to referrer

    res.json({
      success: true,
      referral,
      msg: "Bonus paid successfully"
    })
  } catch (error) {
    console.error("Pay bonus error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   GET /api/referral/leaderboard
// @desc    Get referral leaderboard
// @access  Private
router.get("/leaderboard", auth, async (req, res) => {
  try {
    const leaderboard = await Referral.aggregate([
      {
        $group: {
          _id: "$referrerId",
          totalReferrals: { $sum: 1 },
          successfulHires: {
            $sum: {
              $cond: [{ $eq: ["$status", "Hired"] }, 1, 0]
            }
          },
          totalBonusEarned: {
            $sum: {
              $cond: [
                { $eq: ["$bonus.status", "Paid"] },
                "$bonus.amount",
                0
              ]
            }
          }
        }
      },
      {
        $sort: { successfulHires: -1, totalBonusEarned: -1 }
      },
      {
        $limit: 10
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "referrer"
        }
      },
      {
        $unwind: "$referrer"
      },
      {
        $project: {
          _id: 0,
          referrerId: "$_id",
          referrerName: "$referrer.name",
          referrerEmail: "$referrer.email",
          totalReferrals: 1,
          successfulHires: 1,
          totalBonusEarned: 1
        }
      }
    ])

    res.json({
      success: true,
      leaderboard
    })
  } catch (error) {
    console.error("Get leaderboard error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

module.exports = router
