const express = require("express");
const router = express.Router();
const UserProfile = require("../models/UserProfile");
const auth = require("../middleware/auth");

// Get user profile
router.get("/:userId", auth, async (req, res) => {
  try {
    const profile = await UserProfile.findOne({ userId: req.params.userId });
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }
    res.json({ profile });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create or update user profile
router.post("/setup", auth, async (req, res) => {
  try {
    const profileData = {
      ...req.body,
      userId: req.user.id,
    };

    const profile = await UserProfile.findOneAndUpdate(
      { userId: req.user.id },
      profileData,
      {
        new: true,
        upsert: true,
      }
    );

    res.json({
      message: "Profile created successfully",
      profile,
      completeness: profile.profileCompleteness,
    });
  } catch (error) {
    console.error("Profile setup error:", error);
    res.status(500).json({ message: "Failed to create profile" });
  }
});

// Update user profile
router.put("/:userId", auth, async (req, res) => {
  try {
    const profile = await UserProfile.findOneAndUpdate(
      { userId: req.params.userId },
      req.body,
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.json({
      message: "Profile updated successfully",
      profile,
      completeness: profile.profileCompleteness,
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

module.exports = router;
