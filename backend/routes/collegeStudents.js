const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const CollegeStudent = require("../models/CollegeStudent");
const User = require("../models/User");

// POST /api/college/students - Add student to college
router.post("/students", auth, async (req, res) => {
  try {
    if ((req.user.role !== "college" && req.user.role !== "college_admin")) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const { studentId, department, branch, currentYear, batch, cgpa } = req.body;

    // Validate student exists
    const student = await User.findById(studentId);
    if (!student || student.role !== "job_seeker") {
      return res.status(404).json({ msg: "Student not found" });
    }

    // Check if student already added to this college
    const existing = await CollegeStudent.findOne({
      collegeId: req.user.id,
      studentId
    });
    if (existing) {
      return res.status(400).json({ msg: "Student already added to this college" });
    }

    const collegeStudent = await CollegeStudent.create({
      collegeId: req.user.id,
      studentId,
      department,
      branch,
      currentYear,
      batch,
      cgpa: cgpa || 0
    });

    res.status(201).json({
      msg: "Student added successfully",
      collegeStudent
    });
  } catch (error) {
    console.error("Error adding student:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/college/students - Get all students for college
router.get("/students", auth, async (req, res) => {
  try {
    if ((req.user.role !== "college" && req.user.role !== "college_admin")) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const { department, branch, year, placementStatus } = req.query;
    const query = { collegeId: req.user.id };

    if (department) query.department = department;
    if (branch) query.branch = branch;
    if (year) query.currentYear = parseInt(year);
    if (placementStatus) query.placementStatus = placementStatus;

    const students = await CollegeStudent.find(query)
      .populate("studentId", "name email phone")
      .sort({ createdAt: -1 });

    res.json({ students });
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/college/students/:id - Get student details
router.get("/students/:id", auth, async (req, res) => {
  try {
    if ((req.user.role !== "college" && req.user.role !== "college_admin")) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const student = await CollegeStudent.findOne({
      _id: req.params.id,
      collegeId: req.user.id
    }).populate("studentId", "name email phone");

    if (!student) {
      return res.status(404).json({ msg: "Student not found" });
    }

    res.json({ student });
  } catch (error) {
    console.error("Error fetching student:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// PUT /api/college/students/:id - Update student details
router.put("/students/:id", auth, async (req, res) => {
  try {
    if ((req.user.role !== "college" && req.user.role !== "college_admin")) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const student = await CollegeStudent.findOne({
      _id: req.params.id,
      collegeId: req.user.id
    });

    if (!student) {
      return res.status(404).json({ msg: "Student not found" });
    }

    // Update fields
    if (req.body.department) student.department = req.body.department;
    if (req.body.branch) student.branch = req.body.branch;
    if (req.body.currentYear) student.currentYear = req.body.currentYear;
    if (req.body.batch) student.batch = req.body.batch;
    if (req.body.cgpa !== undefined) student.cgpa = req.body.cgpa;
    if (req.body.placementStatus) student.placementStatus = req.body.placementStatus;
    if (req.body.placementCompany) student.placementCompany = req.body.placementCompany;
    if (req.body.package) student.package = req.body.package;
    if (req.body.readinessScore) student.readinessScore = { ...student.readinessScore, ...req.body.readinessScore };

    await student.save();

    res.json({
      msg: "Student updated successfully",
      student
    });
  } catch (error) {
    console.error("Error updating student:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// DELETE /api/college/students/:id - Remove student from college
router.delete("/students/:id", auth, async (req, res) => {
  try {
    if ((req.user.role !== "college" && req.user.role !== "college_admin")) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const student = await CollegeStudent.findOneAndDelete({
      _id: req.params.id,
      collegeId: req.user.id
    });

    if (!student) {
      return res.status(404).json({ msg: "Student not found" });
    }

    res.json({ msg: "Student removed successfully" });
  } catch (error) {
    console.error("Error removing student:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// POST /api/college/students/bulk - Bulk import students
router.post("/students/bulk", auth, async (req, res) => {
  try {
    if ((req.user.role !== "college" && req.user.role !== "college_admin")) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const { students } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ msg: "Invalid students data" });
    }

    const results = [];
    const errors = [];

    for (const studentData of students) {
      try {
        // Validate student exists
        const student = await User.findById(studentData.studentId);
        if (!student || student.role !== "job_seeker") {
          errors.push({ studentId: studentData.studentId, error: "Student not found" });
          continue;
        }

        // Check if already exists
        const existing = await CollegeStudent.findOne({
          collegeId: req.user.id,
          studentId: studentData.studentId
        });
        if (existing) {
          errors.push({ studentId: studentData.studentId, error: "Already added" });
          continue;
        }

        const collegeStudent = await CollegeStudent.create({
          collegeId: req.user.id,
          ...studentData
        });

        results.push(collegeStudent);
      } catch (error) {
        errors.push({ studentId: studentData.studentId, error: error.message });
      }
    }

    res.status(201).json({
      msg: `Successfully added ${results.length} students`,
      added: results.length,
      errors: errors.length,
      results,
      errors
    });
  } catch (error) {
    console.error("Error bulk importing students:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/college/students/analytics - Get student analytics
router.get("/students/analytics", auth, async (req, res) => {
  try {
    if ((req.user.role !== "college" && req.user.role !== "college_admin")) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const students = await CollegeStudent.find({ collegeId: req.user.id });

    const analytics = {
      totalStudents: students.length,
      byYear: {},
      byDepartment: {},
      byBranch: {},
      byPlacementStatus: {},
      averageCGPA: 0,
      placementRate: 0,
      readinessDistribution: { high: 0, medium: 0, low: 0 },
      atRiskStudents: []
    };

    let totalCGPA = 0;
    let placedCount = 0;

    students.forEach(student => {
      // By year
      analytics.byYear[student.currentYear] = (analytics.byYear[student.currentYear] || 0) + 1;
      
      // By department
      analytics.byDepartment[student.department] = (analytics.byDepartment[student.department] || 0) + 1;
      
      // By branch
      analytics.byBranch[student.branch] = (analytics.byBranch[student.branch] || 0) + 1;
      
      // By placement status
      analytics.byPlacementStatus[student.placementStatus] = (analytics.byPlacementStatus[student.placementStatus] || 0) + 1;
      
      // CGPA
      totalCGPA += student.cgpa;
      
      // Placement
      if (student.placementStatus === "Placed") placedCount++;
      
      // Readiness
      if (student.readinessScore.overall >= 70) analytics.readinessDistribution.high++;
      else if (student.readinessScore.overall >= 50) analytics.readinessDistribution.medium++;
      else analytics.readinessDistribution.low++;
      
      // At risk (low CGPA or low readiness)
      if (student.cgpa < 6 || student.readinessScore.overall < 40) {
        analytics.atRiskStudents.push({
          studentId: student.studentId,
          cgpa: student.cgpa,
          readiness: student.readinessScore.overall
        });
      }
    });

    analytics.averageCGPA = students.length > 0 ? (totalCGPA / students.length).toFixed(2) : 0;
    analytics.placementRate = students.length > 0 ? ((placedCount / students.length) * 100).toFixed(1) : 0;

    res.json({ analytics });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
