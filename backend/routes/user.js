const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

// @route   GET /api/user/profile
// @desc    Get authenticated user's profile
// @access  Private
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   PUT /api/user/profile
// @desc    Update authenticated user's profile
// @access  Private
router.put("/profile", auth, async (req, res) => {
  const {
    name,
    email,
    phone,
    address,
    profileImage,
    companyName,
    companyLogo,
    companyDescription,
    website,
    linkedinUrl,
    twitterUrl,
    professionalSummary,
    businessLocation,
  } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const errors = [];

    // Required fields validation for recruiters
    if (user.role === "recruiter") {
      if (!name || !name.trim()) {
        errors.push("Full name is required");
      }
      if (!companyName || !companyName.trim()) {
        errors.push("Company name is required");
      }
    }

    // Email validation
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push("Please enter a valid email address");
    }

    // URL validation
    if (website && website.trim()) {
      try {
        new URL(website);
      } catch {
        errors.push("Please enter a valid website URL");
      }
    }

    if (
      linkedinUrl &&
      linkedinUrl.trim() &&
      !linkedinUrl.includes("linkedin.com")
    ) {
      errors.push("Please enter a valid LinkedIn URL");
    }

    if (
      twitterUrl &&
      twitterUrl.trim() &&
      !twitterUrl.includes("twitter.com") &&
      !twitterUrl.includes("x.com")
    ) {
      errors.push("Please enter a valid Twitter/X URL");
    }

    // Text length validation
    if (companyDescription && companyDescription.length > 1000) {
      errors.push("Company description must be less than 1000 characters");
    }

    if (professionalSummary && professionalSummary.length > 1500) {
      errors.push("Professional summary must be less than 1500 characters");
    }

    if (errors.length > 0) {
      return res.status(400).json({ msg: "Validation failed", errors });
    }

    // Check if new email already exists for another user
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser && existingUser.id !== user.id) {
        return res
          .status(400)
          .json({ msg: "Email already in use by another account" });
      }
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.phone = phone || user.phone;
    user.address = address || user.address;
    user.profileImage = profileImage || user.profileImage;
    user.companyName = companyName || user.companyName;
    user.companyLogo = companyLogo || user.companyLogo;
    user.companyDescription = companyDescription || user.companyDescription;
    user.website = website || user.website;
    user.linkedinUrl = linkedinUrl || user.linkedinUrl;
    user.twitterUrl = twitterUrl || user.twitterUrl;
    user.professionalSummary = professionalSummary || user.professionalSummary;
    user.businessLocation = businessLocation || user.businessLocation;

    await user.save();
    res.json({ msg: "Profile updated successfully", user });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   PUT /api/user/password
// @desc    Update authenticated user's password
// @access  Private
router.put("/password", auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ msg: "Please enter current and new passwords" });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ msg: "Password updated successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   DELETE /api/user/delete
// @desc    Delete authenticated user's account
// @access  Private
router.delete("/delete", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // In a real application, you would also delete all associated data
    // (resumes, job descriptions, matches, applications, etc.)
    // This is handled in the Next.js API route for user deletion for simplicity
    // but ideally, it should be handled by the backend service.

    await User.deleteOne({ _id: req.user.id });

    res.json({ msg: "Account deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
