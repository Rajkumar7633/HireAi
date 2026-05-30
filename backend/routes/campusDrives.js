const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const CampusDrive = require("../models/CampusDrive");
const CollegeStudent = require("../models/CollegeStudent");
const { invalidateCache } = require("../middleware/cache");

// POST /api/college/campus-drives - Create campus drive
router.post("/campus-drives", auth, async (req, res) => {
  try {
    if (req.user.role !== "college") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const {
      recruiterId,
      companyId,
      jobDescriptionId,
      title,
      description,
      departments,
      branches,
      eligibilityCriteria,
      driveDate,
      venue
    } = req.body;

    const campusDrive = await CampusDrive.create({
      collegeId: req.user.id,
      recruiterId,
      companyId,
      jobDescriptionId,
      title,
      description,
      departments,
      branches,
      eligibilityCriteria,
      driveDate,
      venue
    });

    // Invalidate cache
    await invalidateCache('college:*');

    res.status(201).json({
      msg: "Campus drive created successfully",
      campusDrive
    });
  } catch (error) {
    console.error("Error creating campus drive:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/college/campus-drives - Get all campus drives for college
router.get("/campus-drives", auth, async (req, res) => {
  try {
    if (req.user.role !== "college") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const { status } = req.query;
    const query = { collegeId: req.user.id };

    if (status) query.status = status;

    const drives = await CampusDrive.find(query)
      .populate("recruiterId", "name email")
      .populate("companyId", "name")
      .populate("jobDescriptionId", "title")
      .sort({ driveDate: -1 });

    res.json({ drives });
  } catch (error) {
    console.error("Error fetching campus drives:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/college/campus-drives/:id - Get campus drive details
router.get("/campus-drives/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "college") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const drive = await CampusDrive.findOne({
      _id: req.params.id,
      collegeId: req.user.id
    })
      .populate("recruiterId", "name email")
      .populate("companyId", "name")
      .populate("jobDescriptionId")
      .populate("registeredStudents")
      .populate("selectedStudents")
      .populate("interviewSchedule.studentId")
      .populate("finalResults.studentId");

    if (!drive) {
      return res.status(404).json({ msg: "Campus drive not found" });
    }

    res.json({ drive });
  } catch (error) {
    console.error("Error fetching campus drive:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// PUT /api/college/campus-drives/:id - Update campus drive
router.put("/campus-drives/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "college") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const drive = await CampusDrive.findOne({
      _id: req.params.id,
      collegeId: req.user.id
    });

    if (!drive) {
      return res.status(404).json({ msg: "Campus drive not found" });
    }

    // Update fields
    const allowedFields = ["title", "description", "departments", "branches", "eligibilityCriteria", "driveDate", "venue", "status"];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) drive[field] = req.body[field];
    });

    await drive.save();

    // Invalidate cache
    await invalidateCache('college:*');

    res.json({
      msg: "Campus drive updated successfully",
      drive
    });
  } catch (error) {
    console.error("Error updating campus drive:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// DELETE /api/college/campus-drives/:id - Delete campus drive
router.delete("/campus-drives/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "college") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const drive = await CampusDrive.findOneAndDelete({
      _id: req.params.id,
      collegeId: req.user.id
    });

    if (!drive) {
      return res.status(404).json({ msg: "Campus drive not found" });
    }

    // Invalidate cache
    await invalidateCache('college:*');

    res.json({ msg: "Campus drive deleted successfully" });
  } catch (error) {
    console.error("Error deleting campus drive:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// POST /api/college/campus-drives/:id/register - Register student for drive
router.post("/campus-drives/:id/register", auth, async (req, res) => {
  try {
    if (req.user.role !== "college") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const { studentId } = req.body;

    const drive = await CampusDrive.findOne({
      _id: req.params.id,
      collegeId: req.user.id
    });

    if (!drive) {
      return res.status(404).json({ msg: "Campus drive not found" });
    }

    const student = await CollegeStudent.findOne({
      _id: studentId,
      collegeId: req.user.id
    });

    if (!student) {
      return res.status(404).json({ msg: "Student not found" });
    }

    // Check if already registered
    if (drive.registeredStudents.includes(studentId)) {
      return res.status(400).json({ msg: "Student already registered" });
    }

    // Check eligibility
    if (drive.eligibilityCriteria.minCGPA > 0 && student.cgpa < drive.eligibilityCriteria.minCGPA) {
      return res.status(400).json({ msg: "Student does not meet CGPA requirement" });
    }

    if (student.currentYear < drive.eligibilityCriteria.minYear || student.currentYear > drive.eligibilityCriteria.maxYear) {
      return res.status(400).json({ msg: "Student does not meet year requirement" });
    }

    drive.registeredStudents.push(studentId);
    await drive.save();

    res.json({
      msg: "Student registered successfully",
      drive
    });
  } catch (error) {
    console.error("Error registering student:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// POST /api/college/campus-drives/:id/interview-schedule - Schedule interview
router.post("/campus-drives/:id/interview-schedule", auth, async (req, res) => {
  try {
    if (req.user.role !== "college") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const { studentId, date, time, venue, type } = req.body;

    const drive = await CampusDrive.findOne({
      _id: req.params.id,
      collegeId: req.user.id
    });

    if (!drive) {
      return res.status(404).json({ msg: "Campus drive not found" });
    }

    drive.interviewSchedule.push({
      studentId,
      date: new Date(date),
      time,
      venue,
      type,
      status: "Scheduled"
    });

    await drive.save();

    res.json({
      msg: "Interview scheduled successfully",
      drive
    });
  } catch (error) {
    console.error("Error scheduling interview:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// PUT /api/college/campus-drives/:id/interview-schedule/:scheduleId - Update interview result
router.put("/campus-drives/:id/interview-schedule/:scheduleId", auth, async (req, res) => {
  try {
    if (req.user.role !== "college") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const { feedback, result } = req.body;

    const drive = await CampusDrive.findOne({
      _id: req.params.id,
      collegeId: req.user.id
    });

    if (!drive) {
      return res.status(404).json({ msg: "Campus drive not found" });
    }

    const schedule = drive.interviewSchedule.id(req.params.scheduleId);
    if (!schedule) {
      return res.status(404).json({ msg: "Interview schedule not found" });
    }

    schedule.feedback = feedback;
    schedule.result = result;
    schedule.status = "Completed";

    await drive.save();

    res.json({
      msg: "Interview result updated successfully",
      drive
    });
  } catch (error) {
    console.error("Error updating interview result:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// POST /api/college/campus-drives/:id/final-results - Add final results
router.post("/campus-drives/:id/final-results", auth, async (req, res) => {
  try {
    if (req.user.role !== "college") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const { studentId, status, package, position, offerDate } = req.body;

    const drive = await CampusDrive.findOne({
      _id: req.params.id,
      collegeId: req.user.id
    });

    if (!drive) {
      return res.status(404).json({ msg: "Campus drive not found" });
    }

    drive.finalResults.push({
      studentId,
      status,
      package,
      position,
      offerDate: offerDate ? new Date(offerDate) : null
    });

    // Update drive status if completed
    drive.status = "Completed";

    await drive.save();

    // Update student placement status if selected
    if (status === "Selected") {
      const student = await CollegeStudent.findOne({
        _id: studentId,
        collegeId: req.user.id
      });
      if (student) {
        student.placementStatus = "Placed";
        student.placementCompany = drive.companyId;
        student.package = package;
        await student.save();
      }
    }

    // Invalidate cache
    await invalidateCache('college:*');

    res.json({
      msg: "Final results added successfully",
      drive
    });
  } catch (error) {
    console.error("Error adding final results:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
