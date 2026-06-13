const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const CollegeStudent = require("../models/CollegeStudent");
const CampusDrive = require("../models/CampusDrive");
const CollegePartnership = require("../models/CollegePartnership");
const { cacheMiddleware } = require("../middleware/cache");

// GET /api/college/analytics - Get comprehensive placement analytics
router.get("/analytics", auth, cacheMiddleware('college:analytics', 300), async (req, res) => {
  try {
    if ((req.user.role !== "college" && req.user.role !== "college_admin")) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const { year, department, branch } = req.query;
    const studentQuery = { collegeId: req.user.id };
    
    if (year) studentQuery.currentYear = parseInt(year);
    if (department) studentQuery.department = department;
    if (branch) studentQuery.branch = branch;

    const students = await CollegeStudent.find(studentQuery);
    const drives = await CampusDrive.find({ collegeId: req.user.id });
    const partnerships = await CollegePartnership.find({ collegeId: req.user.id, status: "Active" });

    // Calculate analytics
    const analytics = {
      overview: {
        totalStudents: students.length,
        totalDrives: drives.length,
        activePartnerships: partnerships.length,
        totalPlaced: students.filter(s => s.placementStatus === "Placed").length,
        placementRate: 0,
        averagePackage: 0
      },
      byYear: {},
      byDepartment: {},
      byBranch: {},
      placementStatus: {
        placed: 0,
        notPlaced: 0,
        inProcess: 0
      },
      readinessDistribution: {
        high: 0,
        medium: 0,
        low: 0
      },
      drivePerformance: [],
      partnershipPerformance: [],
      topPerformers: [],
      atRiskStudents: [],
      trends: {
        monthlyPlacements: [],
        monthlyDrives: []
      }
    };

    // Calculate placement rate
    if (students.length > 0) {
      analytics.overview.placementRate = ((analytics.overview.totalPlaced / students.length) * 100).toFixed(1);
      
      // Calculate average package
      const placedStudents = students.filter(s => s.placementStatus === "Placed" && s.package);
      if (placedStudents.length > 0) {
        const totalPackage = placedStudents.reduce((sum, s) => sum + (s.package || 0), 0);
        analytics.overview.averagePackage = (totalPackage / placedStudents.length).toFixed(2);
      }
    }

    // By year distribution
    students.forEach(student => {
      analytics.byYear[student.currentYear] = (analytics.byYear[student.currentYear] || 0) + 1;
      analytics.byDepartment[student.department] = (analytics.byDepartment[student.department] || 0) + 1;
      analytics.byBranch[student.branch] = (analytics.byBranch[student.branch] || 0) + 1;
      
      // Placement status
      if (student.placementStatus === "Placed") analytics.placementStatus.placed++;
      else if (student.placementStatus === "In Process") analytics.placementStatus.inProcess++;
      else analytics.placementStatus.notPlaced++;
      
      // Readiness distribution
      if (student.readinessScore.overall >= 70) analytics.readinessDistribution.high++;
      else if (student.readinessScore.overall >= 50) analytics.readinessDistribution.medium++;
      else analytics.readinessDistribution.low++;
      
      // At-risk students (low CGPA or low readiness)
      if (student.cgpa < 6 || student.readinessScore.overall < 40) {
        analytics.atRiskStudents.push({
          studentId: student.studentId,
          cgpa: student.cgpa,
          readiness: student.readinessScore.overall,
          department: student.department,
          branch: student.branch
        });
      }
      
      // Top performers (high CGPA and high readiness)
      if (student.cgpa >= 8.5 && student.readinessScore.overall >= 80) {
        analytics.topPerformers.push({
          studentId: student.studentId,
          cgpa: student.cgpa,
          readiness: student.readinessScore.overall,
          department: student.department,
          branch: student.branch
        });
      }
    });

    // Drive performance
    drives.forEach(drive => {
      analytics.drivePerformance.push({
        driveId: drive._id,
        title: drive.title,
        date: drive.driveDate,
        registeredCount: drive.registeredStudents.length,
        selectedCount: drive.selectedStudents.length,
        status: drive.status,
        placementRate: drive.registeredStudents.length > 0 
          ? ((drive.selectedStudents.length / drive.registeredStudents.length) * 100).toFixed(1) 
          : 0
      });
    });

    // Partnership performance
    partnerships.forEach(partnership => {
      analytics.partnershipPerformance.push({
        partnershipId: partnership._id,
        companyId: partnership.companyId,
        partnershipType: partnership.partnershipType,
        drivesConducted: partnership.drivesConducted,
        studentsPlaced: partnership.studentsPlaced,
        totalPackageValue: partnership.totalPackageValue,
        status: partnership.status
      });
    });

    // Monthly trends (last 6 months)
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      
      const monthPlacements = students.filter(s => {
        const placementDate = s.updatedAt;
        return placementDate >= monthStart && placementDate <= monthEnd && s.placementStatus === "Placed";
      }).length;
      
      const monthDrives = drives.filter(d => {
        const driveDate = new Date(d.driveDate);
        return driveDate >= monthStart && driveDate <= monthEnd;
      }).length;
      
      analytics.trends.monthlyPlacements.push({
        month: monthDate.toLocaleString('default', { month: 'short', year: 'numeric' }),
        count: monthPlacements
      });
      
      analytics.trends.monthlyDrives.push({
        month: monthDate.toLocaleString('default', { month: 'short', year: 'numeric' }),
        count: monthDrives
      });
    }

    res.json({ analytics });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/college/analytics/export - Export analytics report
router.get("/analytics/export", auth, async (req, res) => {
  try {
    if ((req.user.role !== "college" && req.user.role !== "college_admin")) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const { format = "json" } = req.query;
    
    // Fetch analytics
    const analyticsResponse = await fetch(`${req.protocol}://${req.get('host')}/api/college/analytics`);
    const analyticsData = await analyticsResponse.json();
    
    if (format === "csv") {
      // Convert to CSV
      const { Parser } = require("json2csv");
      const parser = new Parser();
      const csv = parser.parse(analyticsData.analytics);
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=college-analytics.csv");
      res.send(csv);
    } else {
      // Return JSON
      res.json(analyticsData);
    }
  } catch (error) {
    console.error("Error exporting analytics:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
