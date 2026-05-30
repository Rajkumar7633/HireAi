const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const CampusDrive = require("../models/CampusDrive");
const CollegeStudent = require("../models/CollegeStudent");
const CollegeNotification = require("../models/CollegeNotification");
const { invalidateCache } = require("../middleware/cache");

// POST /api/college/interviews - Schedule interview
router.post("/interviews", auth, async (req, res) => {
  try {
    if (req.user.role !== "college") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const { driveId, studentId, date, time, venue, type, notes } = req.body;

    const drive = await CampusDrive.findOne({
      _id: driveId,
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

    // Check if student is registered for the drive
    if (!drive.registeredStudents.includes(studentId)) {
      return res.status(400).json({ msg: "Student not registered for this drive" });
    }

    drive.interviewSchedule.push({
      studentId,
      date: new Date(date),
      time,
      venue,
      type,
      status: "Scheduled",
      notes
    });

    await drive.save();

    // Create notification for student
    await CollegeNotification.create({
      collegeId: req.user.id,
      type: "interview_scheduled",
      title: "Interview Scheduled",
      message: `${type} interview scheduled for ${date} at ${time}`,
      priority: "high",
      relatedId: drive._id,
      relatedModel: "CampusDrive",
      actionRequired: true,
      actionUrl: `/dashboard/college/campus-drives/${driveId}`
    });

    // Invalidate cache
    await invalidateCache('college:*');

    res.status(201).json({
      msg: "Interview scheduled successfully",
      drive
    });
  } catch (error) {
    console.error("Error scheduling interview:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/college/interviews - Get all interviews
router.get("/interviews", auth, async (req, res) => {
  try {
    if (req.user.role !== "college") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const { status, type, driveId, date } = req.query;
    const query = { collegeId: req.user.id };

    const drives = await CampusDrive.find(query)
      .populate("interviewSchedule.studentId", "name email")
      .populate("companyId", "name")
      .sort({ driveDate: -1 });

    let interviews = [];
    drives.forEach(drive => {
      drive.interviewSchedule.forEach(schedule => {
        let include = true;
        if (status && schedule.status !== status) include = false;
        if (type && schedule.type !== type) include = false;
        if (driveId && drive._id.toString() !== driveId) include = false;
        if (date) {
          const scheduleDate = new Date(schedule.date).toDateString();
          const filterDate = new Date(date).toDateString();
          if (scheduleDate !== filterDate) include = false;
        }

        if (include) {
          interviews.push({
            interviewId: schedule._id,
            driveId: drive._id,
            driveTitle: drive.title,
            company: drive.companyId?.name,
            student: schedule.studentId,
            date: schedule.date,
            time: schedule.time,
            venue: schedule.venue,
            type: schedule.type,
            status: schedule.status,
            feedback: schedule.feedback,
            result: schedule.result
          });
        }
      });
    });

    // Sort by date
    interviews.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({ interviews });
  } catch (error) {
    console.error("Error fetching interviews:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/college/interviews/:id - Get interview details
router.get("/interviews/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "college") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const drives = await CampusDrive.find({ collegeId: req.user.id })
      .populate("interviewSchedule.studentId", "name email phone")
      .populate("companyId", "name");

    let interview = null;
    for (const drive of drives) {
      const schedule = drive.interviewSchedule.id(req.params.id);
      if (schedule) {
        interview = {
          interviewId: schedule._id,
          driveId: drive._id,
          driveTitle: drive.title,
          company: drive.companyId?.name,
          student: schedule.studentId,
          date: schedule.date,
          time: schedule.time,
          venue: schedule.venue,
          type: schedule.type,
          status: schedule.status,
          feedback: schedule.feedback,
          result: schedule.result
        };
        break;
      }
    }

    if (!interview) {
      return res.status(404).json({ msg: "Interview not found" });
    }

    res.json({ interview });
  } catch (error) {
    console.error("Error fetching interview:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// PUT /api/college/interviews/:id - Update interview
router.put("/interviews/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "college") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const { date, time, venue, status, feedback, result } = req.body;

    const drives = await CampusDrive.find({ collegeId: req.user.id });
    let updated = false;

    for (const drive of drives) {
      const schedule = drive.interviewSchedule.id(req.params.id);
      if (schedule) {
        if (date) schedule.date = new Date(date);
        if (time) schedule.time = time;
        if (venue) schedule.venue = venue;
        if (status) schedule.status = status;
        if (feedback !== undefined) schedule.feedback = feedback;
        if (result) schedule.result = result;
        updated = true;
        await drive.save();
        break;
      }
    }

    if (!updated) {
      return res.status(404).json({ msg: "Interview not found" });
    }

    // Invalidate cache
    await invalidateCache('college:*');

    res.json({ msg: "Interview updated successfully" });
  } catch (error) {
    console.error("Error updating interview:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// DELETE /api/college/interviews/:id - Cancel interview
router.delete("/interviews/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "college") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const drives = await CampusDrive.find({ collegeId: req.user.id });
    let deleted = false;

    for (const drive of drives) {
      const scheduleIndex = drive.interviewSchedule.findIndex(s => s._id.toString() === req.params.id);
      if (scheduleIndex !== -1) {
        drive.interviewSchedule[scheduleIndex].status = "Cancelled";
        deleted = true;
        await drive.save();
        break;
      }
    }

    if (!deleted) {
      return res.status(404).json({ msg: "Interview not found" });
    }

    // Invalidate cache
    await invalidateCache('college:*');

    res.json({ msg: "Interview cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling interview:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/college/interviews/analytics - Get interview analytics
router.get("/interviews/analytics", auth, async (req, res) => {
  try {
    if (req.user.role !== "college") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const drives = await CampusDrive.find({ collegeId: req.user.id });

    const analytics = {
      totalInterviews: 0,
      byStatus: { Scheduled: 0, Completed: 0, Cancelled: 0 },
      byType: {},
      byResult: { Selected: 0, Rejected: 0, Pending: 0 },
      upcomingInterviews: [],
      completedToday: 0,
      completionRate: 0
    };

    const today = new Date().toDateString();

    drives.forEach(drive => {
      drive.interviewSchedule.forEach(schedule => {
        analytics.totalInterviews++;
        analytics.byStatus[schedule.status] = (analytics.byStatus[schedule.status] || 0) + 1;
        analytics.byType[schedule.type] = (analytics.byType[schedule.type] || 0) + 1;
        if (schedule.result) {
          analytics.byResult[schedule.result] = (analytics.byResult[schedule.result] || 0) + 1;
        }

        const interviewDate = new Date(schedule.date);
        if (interviewDate > new Date() && schedule.status === "Scheduled") {
          analytics.upcomingInterviews.push({
            studentId: schedule.studentId,
            date: schedule.date,
            time: schedule.time,
            type: schedule.type,
            driveTitle: drive.title
          });
        }

        if (interviewDate.toDateString() === today && schedule.status === "Completed") {
          analytics.completedToday++;
        }
      });
    });

    if (analytics.totalInterviews > 0) {
      analytics.completionRate = ((analytics.byStatus.Completed / analytics.totalInterviews) * 100).toFixed(1);
    }

    // Sort upcoming interviews by date
    analytics.upcomingInterviews.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({ analytics });
  } catch (error) {
    console.error("Error fetching interview analytics:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
