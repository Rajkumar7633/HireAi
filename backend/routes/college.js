const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");

// GET /api/college/profile - Get college profile
router.get("/profile", auth, async (req, res) => {
  try {
    const { userId } = req.query;
    
    const isCollegeRole = req.user.role === "college" || req.user.role === "college_admin"
    if (!isCollegeRole && req.user.id !== userId) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const user = await User.findById(userId || req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.json({
      profile: {
        name: user.name || "",
        code: user.collegeCode || "",
        address: user.address || "",
        city: user.city || "",
        state: user.state || "",
        country: user.country || "",
        zipCode: user.zipCode || "",
        phone: user.phone || "",
        email: user.email || "",
        website: user.website || "",
        description: user.description || "",
        establishedYear: user.establishedYear || "",
        accreditation: user.accreditation || "",
        type: user.collegeType || "Engineering",
        studentCapacity: user.studentCapacity || "",
        placementCellHead: user.placementCellHead || "",
        placementCellEmail: user.placementCellEmail || "",
        placementCellPhone: user.placementCellPhone || "",
        departments: user.departments || []
      }
    });
  } catch (error) {
    console.error("Error fetching college profile:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// PUT /api/college/profile - Update college profile
router.put("/profile", auth, async (req, res) => {
  try {
    const { userId } = req.query;
    
    // Allow college users to update their own profile
    if ((req.user.role !== "college" && req.user.role !== "college_admin") && req.user.id !== userId) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const user = await User.findById(userId || req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Update college profile fields
    user.name = req.body.name || user.name;
    user.collegeCode = req.body.code || user.collegeCode;
    user.address = req.body.address || user.address;
    user.city = req.body.city || user.city;
    user.state = req.body.state || user.state;
    user.country = req.body.country || user.country;
    user.zipCode = req.body.zipCode || user.zipCode;
    user.phone = req.body.phone || user.phone;
    user.website = req.body.website || user.website;
    user.description = req.body.description || user.description;
    user.establishedYear = req.body.establishedYear || user.establishedYear;
    user.accreditation = req.body.accreditation || user.accreditation;
    user.collegeType = req.body.type || user.collegeType;
    user.studentCapacity = req.body.studentCapacity || user.studentCapacity;
    user.placementCellHead = req.body.placementCellHead || user.placementCellHead;
    user.placementCellEmail = req.body.placementCellEmail || user.placementCellEmail;
    user.placementCellPhone = req.body.placementCellPhone || user.placementCellPhone;
    user.departments = req.body.departments || user.departments || [];

    await user.save();

    res.json({
      message: "Profile updated successfully",
      profile: {
        name: user.name,
        code: user.collegeCode,
        address: user.address,
        city: user.city,
        state: user.state,
        country: user.country,
        zipCode: user.zipCode,
        phone: user.phone,
        email: user.email,
        website: user.website,
        description: user.description,
        establishedYear: user.establishedYear,
        accreditation: user.accreditation,
        type: user.collegeType,
        studentCapacity: user.studentCapacity,
        placementCellHead: user.placementCellHead,
        placementCellEmail: user.placementCellEmail,
        placementCellPhone: user.placementCellPhone,
        departments: user.departments || []
      }
    });
  } catch (error) {
    console.error("Error updating college profile:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/college/activities - Get recent activities
router.get("/activities", auth, async (req, res) => {
  try {
    if ((req.user.role !== "college" && req.user.role !== "college_admin")) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const User = require("../models/User");
    const JobApplication = require("../models/JobApplication");
    const JobDescription = require("../models/JobDescription");

    // Get recent activities for this college
    const activities = [];
    
    // Recent student registrations
    const recentStudents = await User.find({ role: "job_seeker" })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name email createdAt");
    
    recentStudents.forEach(student => {
      activities.push({
        id: `student-${student._id}`,
        type: "student",
        message: `New student registered: ${student.name}`,
        time: getTimeAgo(student.createdAt),
        status: "success"
      });
    });

    // Recent job applications
    const recentApplications = await JobApplication.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("jobSeekerId", "name")
      .populate("jobDescriptionId", "title");

    recentApplications.forEach(app => {
      activities.push({
        id: `application-${app._id}`,
        type: "application",
        message: `${app.jobSeekerId?.name || 'Student'} applied for ${app.jobDescriptionId?.title || 'position'}`,
        time: getTimeAgo(app.createdAt),
        status: "info"
      });
    });

    // Recent job postings
    const recentJobs = await JobDescription.find({ recruiterId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("title createdAt");

    recentJobs.forEach(job => {
      activities.push({
        id: `job-${job._id}`,
        type: "job",
        message: `New job posted: ${job.title}`,
        time: getTimeAgo(job.createdAt),
        status: "success"
      });
    });

    // Sort by time (most recent first)
    activities.sort((a, b) => {
      const timeA = parseTimeAgo(a.time);
      const timeB = parseTimeAgo(b.time);
      return timeA - timeB;
    });

    res.json({ activities: activities.slice(0, 10) });
  } catch (error) {
    console.error("Error fetching activities:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return `${Math.floor(seconds / 604800)} weeks ago`;
}

function parseTimeAgo(timeString) {
  const num = parseInt(timeString);
  if (timeString.includes("minutes")) return num * 60;
  if (timeString.includes("hours")) return num * 3600;
  if (timeString.includes("days")) return num * 86400;
  if (timeString.includes("weeks")) return num * 604800;
  return 0;
}

module.exports = router;
