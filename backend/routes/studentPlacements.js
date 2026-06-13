const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const StudentPlacement = require("../models/StudentPlacement");
const CollegeStudent = require("../models/CollegeStudent");
const CollegeNotification = require("../models/CollegeNotification");
const { invalidateCache } = require("../middleware/cache");

// POST /api/college/placements - Create placement record
router.post("/placements", auth, async (req, res) => {
  try {
    if ((req.user.role !== "college" && req.user.role !== "college_admin")) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const {
      studentId,
      driveId,
      companyId,
      recruiterId,
      jobTitle,
      jobDescription,
      package,
      packageType,
      currency,
      location,
      offerDate,
      joiningDate,
      placementType,
      notes
    } = req.body;

    // Get college student record
    const collegeStudent = await CollegeStudent.findOne({
      collegeId: req.user.id,
      studentId
    });

    if (!collegeStudent) {
      return res.status(404).json({ msg: "Student not found in college" });
    }

    const placement = await StudentPlacement.create({
      collegeId: req.user.id,
      studentId,
      collegeStudentId: collegeStudent._id,
      driveId,
      companyId,
      recruiterId,
      jobTitle,
      jobDescription,
      package,
      packageType,
      currency,
      location,
      offerDate: new Date(offerDate),
      joiningDate: joiningDate ? new Date(joiningDate) : null,
      placementType,
      notes,
      createdBy: req.user.id
    });

    // Update student placement status
    collegeStudent.placementStatus = "Placed";
    collegeStudent.placementCompany = companyId;
    collegeStudent.package = package;
    await collegeStudent.save();

    // Create notification
    await CollegeNotification.create({
      collegeId: req.user.id,
      type: "student_placed",
      title: "Student Placed",
      message: `${jobTitle} offer at ${package} LPA`,
      priority: "high",
      relatedId: placement._id,
      relatedModel: "StudentPlacement",
      actionRequired: false
    });

    // Invalidate cache
    await invalidateCache('college:*');

    res.status(201).json({
      msg: "Placement record created successfully",
      placement
    });
  } catch (error) {
    console.error("Error creating placement:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/college/placements - Get all placements
router.get("/placements", auth, async (req, res) => {
  try {
    if ((req.user.role !== "college" && req.user.role !== "college_admin")) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const { year, department, branch, offerStatus, companyId } = req.query;
    const query = { collegeId: req.user.id };

    if (offerStatus) query.offerStatus = offerStatus;
    if (companyId) query.companyId = companyId;

    const placements = await StudentPlacement.find(query)
      .populate("studentId", "name email")
      .populate("companyId", "name")
      .populate("recruiterId", "name")
      .populate("driveId", "title")
      .sort({ offerDate: -1 });

    // Filter by department/branch if specified
    let filteredPlacements = placements;
    if (department || branch) {
      const collegeStudents = await CollegeStudent.find({
        collegeId: req.user.id,
        ...(department && { department }),
        ...(branch && { branch })
      });
      const studentIds = collegeStudents.map(cs => cs.studentId);
      filteredPlacements = placements.filter(p => studentIds.includes(p.studentId._id));
    }

    // Filter by year if specified
    if (year) {
      const collegeStudents = await CollegeStudent.find({
        collegeId: req.user.id,
        currentYear: parseInt(year)
      });
      const studentIds = collegeStudents.map(cs => cs.studentId);
      filteredPlacements = filteredPlacements.filter(p => studentIds.includes(p.studentId._id));
    }

    res.json({ placements: filteredPlacements });
  } catch (error) {
    console.error("Error fetching placements:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/college/placements/:id - Get placement details
router.get("/placements/:id", auth, async (req, res) => {
  try {
    if ((req.user.role !== "college" && req.user.role !== "college_admin")) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const placement = await StudentPlacement.findOne({
      _id: req.params.id,
      collegeId: req.user.id
    })
      .populate("studentId", "name email phone")
      .populate("companyId", "name")
      .populate("recruiterId", "name email")
      .populate("driveId")
      .populate("collegeStudentId")
      .populate("createdBy", "name");

    if (!placement) {
      return res.status(404).json({ msg: "Placement not found" });
    }

    res.json({ placement });
  } catch (error) {
    console.error("Error fetching placement:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// PUT /api/college/placements/:id - Update placement
router.put("/placements/:id", auth, async (req, res) => {
  try {
    if ((req.user.role !== "college" && req.user.role !== "college_admin")) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const placement = await StudentPlacement.findOne({
      _id: req.params.id,
      collegeId: req.user.id
    });

    if (!placement) {
      return res.status(404).json({ msg: "Placement not found" });
    }

    const allowedFields = [
      "jobTitle", "jobDescription", "package", "packageType", "currency",
      "location", "offerDate", "joiningDate", "offerStatus", "offerLetterUrl",
      "placementType", "notes"
    ];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        placement[field] = req.body[field];
      }
    });

    await placement.save();

    // Invalidate cache
    await invalidateCache('college:*');

    res.json({
      msg: "Placement updated successfully",
      placement
    });
  } catch (error) {
    console.error("Error updating placement:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// POST /api/college/placements/:id/interview-rounds - Add interview round
router.post("/placements/:id/interview-rounds", auth, async (req, res) => {
  try {
    if ((req.user.role !== "college" && req.user.role !== "college_admin")) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const { roundType, date, result, feedback, interviewer } = req.body;

    const placement = await StudentPlacement.findOne({
      _id: req.params.id,
      collegeId: req.user.id
    });

    if (!placement) {
      return res.status(404).json({ msg: "Placement not found" });
    }

    placement.interviewRounds.push({
      roundType,
      date: date ? new Date(date) : null,
      result,
      feedback,
      interviewer
    });

    await placement.save();

    res.json({
      msg: "Interview round added successfully",
      placement
    });
  } catch (error) {
    console.error("Error adding interview round:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// POST /api/college/placements/:id/documents - Add document
router.post("/placements/:id/documents", auth, async (req, res) => {
  try {
    if ((req.user.role !== "college" && req.user.role !== "college_admin")) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const { type, url } = req.body;

    const placement = await StudentPlacement.findOne({
      _id: req.params.id,
      collegeId: req.user.id
    });

    if (!placement) {
      return res.status(404).json({ msg: "Placement not found" });
    }

    placement.documents.push({ type, url });
    await placement.save();

    res.json({
      msg: "Document added successfully",
      placement
    });
  } catch (error) {
    console.error("Error adding document:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/college/placements/analytics - Get placement analytics
router.get("/placements/analytics", auth, async (req, res) => {
  try {
    if ((req.user.role !== "college" && req.user.role !== "college_admin")) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const placements = await StudentPlacement.find({ collegeId: req.user.id })
      .populate("companyId", "name")
      .populate("studentId");

    const analytics = {
      totalPlacements: placements.length,
      totalPackageValue: 0,
      averagePackage: 0,
      byCompany: {},
      byYear: {},
      byPlacementType: {},
      byOfferStatus: {},
      monthlyTrends: [],
      topPackages: [],
      recentPlacements: []
    };

    let totalPackage = 0;

    placements.forEach(placement => {
      // Total package value
      totalPackage += placement.package;

      // By company
      const companyName = placement.companyId?.name || "Unknown";
      analytics.byCompany[companyName] = (analytics.byCompany[companyName] || 0) + 1;

      // By placement type
      analytics.byPlacementType[placement.placementType] = (analytics.byPlacementType[placement.placementType] || 0) + 1;

      // By offer status
      analytics.byOfferStatus[placement.offerStatus] = (analytics.byOfferStatus[placement.offerStatus] || 0) + 1;

      // By year (based on offer date)
      const year = new Date(placement.offerDate).getFullYear();
      analytics.byYear[year] = (analytics.byYear[year] || 0) + 1;
    });

    analytics.totalPackageValue = totalPackage;
    analytics.averagePackage = placements.length > 0 ? (totalPackage / placements.length).toFixed(2) : 0;

    // Top packages
    analytics.topPackages = placements
      .sort((a, b) => b.package - a.package)
      .slice(0, 10)
      .map(p => ({
        studentName: p.studentId?.name,
        company: p.companyId?.name,
        package: p.package,
        jobTitle: p.jobTitle
      }));

    // Recent placements
    analytics.recentPlacements = placements
      .sort((a, b) => new Date(b.offerDate) - new Date(a.offerDate))
      .slice(0, 10)
      .map(p => ({
        studentName: p.studentId?.name,
        company: p.companyId?.name,
        jobTitle: p.jobTitle,
        package: p.package,
        offerDate: p.offerDate
      }));

    // Monthly trends (last 12 months)
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

      const monthPlacements = placements.filter(p => {
        const offerDate = new Date(p.offerDate);
        return offerDate >= monthStart && offerDate <= monthEnd;
      }).length;

      analytics.monthlyTrends.push({
        month: monthDate.toLocaleString('default', { month: 'short', year: 'numeric' }),
        count: monthPlacements
      });
    }

    res.json({ analytics });
  } catch (error) {
    console.error("Error fetching placement analytics:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
