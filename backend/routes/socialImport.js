const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const User = require("../models/User")
const UserProfile = require("../models/UserProfile")
const axios = require("axios")

// @route   POST /api/social-import/linkedin
// @desc    Import profile data from LinkedIn
// @access  Private
router.post("/linkedin", auth, async (req, res) => {
  const { accessToken } = req.body

  if (!accessToken) {
    return res.status(400).json({ msg: "Access token is required" })
  }

  try {
    // LinkedIn API integration
    // This would use the LinkedIn API with the access token
    const linkedinData = await fetchLinkedInProfile(accessToken)

    // Update user profile with LinkedIn data
    const userProfile = await UserProfile.findOneAndUpdate(
      { userId: req.user.id },
      {
        $set: {
          linkedinUrl: linkedinData.publicProfileUrl,
          linkedinData: linkedinData,
          importedFrom: "linkedin",
          importedAt: Date.now()
        }
      },
      { upsert: true, new: true }
    )

    res.json({
      success: true,
      profile: userProfile,
      msg: "LinkedIn profile imported successfully"
    })
  } catch (error) {
    console.error("LinkedIn import error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   POST /api/social-import/github
// @desc    Import profile data from GitHub
// @access  Private
router.post("/github", auth, async (req, res) => {
  const { accessToken, username } = req.body

  if (!accessToken) {
    return res.status(400).json({ msg: "Access token is required" })
  }

  try {
    // GitHub API integration
    const githubData = await fetchGitHubProfile(accessToken, username)

    // Update user profile with GitHub data
    const userProfile = await UserProfile.findOneAndUpdate(
      { userId: req.user.id },
      {
        $set: {
          githubUrl: githubData.html_url,
          githubUsername: githubData.login,
          githubData: githubData,
          importedFrom: "github",
          importedAt: Date.now()
        }
      },
      { upsert: true, new: true }
    )

    res.json({
      success: true,
      profile: userProfile,
      msg: "GitHub profile imported successfully"
    })
  } catch (error) {
    console.error("GitHub import error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   GET /api/social-import/github/:username
// @desc    Get public GitHub profile (no auth required)
// @access  Public
router.get("/github/:username", async (req, res) => {
  try {
    const { username } = req.params

    const response = await axios.get(`https://api.github.com/users/${username}`)
    const githubData = response.data

    res.json({
      success: true,
      profile: {
        login: githubData.login,
        name: githubData.name,
        bio: githubData.bio,
        public_repos: githubData.public_repos,
        followers: githubData.followers,
        following: githubData.following,
        html_url: githubData.html_url,
        avatar_url: githubData.avatar_url,
        location: githubData.location,
        company: githubData.company,
        blog: githubData.blog
      }
    })
  } catch (error) {
    console.error("GitHub public profile error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// Helper functions
async function fetchLinkedInProfile(accessToken) {
  // LinkedIn API integration
  // This would use the LinkedIn API to fetch profile data
  // For now, return placeholder data
  return {
    id: "linkedin-id",
    firstName: "John",
    lastName: "Doe",
    headline: "Software Engineer",
    location: "San Francisco, CA",
    industry: "Technology",
    publicProfileUrl: "https://linkedin.com/in/johndoe",
    positions: [],
    education: [],
    skills: []
  }
}

async function fetchGitHubProfile(accessToken, username) {
  // GitHub API integration
  const response = await axios.get("https://api.github.com/user", {
    headers: {
      Authorization: `token ${accessToken}`
    }
  })

  // Fetch repositories
  const reposResponse = await axios.get("https://api.github.com/user/repos", {
    headers: {
      Authorization: `token ${accessToken}`
    }
  })

  return {
    ...response.data,
    repositories: reposResponse.data
  }
}

module.exports = router
