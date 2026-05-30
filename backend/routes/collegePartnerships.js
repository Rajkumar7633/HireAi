const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const CollegePartnership = require("../models/CollegePartnership");
const { invalidateCache } = require("../middleware/cache");

// POST /api/college/partnerships - Create partnership
router.post("/partnerships", auth, async (req, res) => {
  try {
    if (req.user.role !== "college") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const { recruiterId, companyId, partnershipType, agreementDetails } = req.body;

    const partnership = await CollegePartnership.create({
      collegeId: req.user.id,
      recruiterId,
      companyId,
      partnershipType,
      agreementDetails
    });

    // Invalidate cache
    await invalidateCache('college:*');

    res.status(201).json({
      msg: "Partnership created successfully",
      partnership
    });
  } catch (error) {
    console.error("Error creating partnership:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/college/partnerships - Get all partnerships
router.get("/partnerships", auth, async (req, res) => {
  try {
    if (req.user.role !== "college") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const { status, partnershipType } = req.query;
    const query = { collegeId: req.user.id };

    if (status) query.status = status;
    if (partnershipType) query.partnershipType = partnershipType;

    const partnerships = await CollegePartnership.find(query)
      .populate("recruiterId", "name email")
      .populate("companyId", "name")
      .sort({ lastActivity: -1 });

    res.json({ partnerships });
  } catch (error) {
    console.error("Error fetching partnerships:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/college/partnerships/:id - Get partnership details
router.get("/partnerships/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "college") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const partnership = await CollegePartnership.findOne({
      _id: req.params.id,
      collegeId: req.user.id
    })
      .populate("recruiterId", "name email")
      .populate("companyId", "name")
      .populate("notes.createdBy", "name");

    if (!partnership) {
      return res.status(404).json({ msg: "Partnership not found" });
    }

    res.json({ partnership });
  } catch (error) {
    console.error("Error fetching partnership:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// PUT /api/college/partnerships/:id - Update partnership
router.put("/partnerships/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "college") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const partnership = await CollegePartnership.findOne({
      _id: req.params.id,
      collegeId: req.user.id
    });

    if (!partnership) {
      return res.status(404).json({ msg: "Partnership not found" });
    }

    const allowedFields = ["partnershipType", "status", "agreementDetails", "endDate"];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) partnership[field] = req.body[field];
    });

    partnership.lastActivity = Date.now();
    await partnership.save();

    // Invalidate cache
    await invalidateCache('college:*');

    res.json({
      msg: "Partnership updated successfully",
      partnership
    });
  } catch (error) {
    console.error("Error updating partnership:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// DELETE /api/college/partnerships/:id - Delete partnership
router.delete("/partnerships/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "college") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const partnership = await CollegePartnership.findOneAndDelete({
      _id: req.params.id,
      collegeId: req.user.id
    });

    if (!partnership) {
      return res.status(404).json({ msg: "Partnership not found" });
    }

    // Invalidate cache
    await invalidateCache('college:*');

    res.json({ msg: "Partnership deleted successfully" });
  } catch (error) {
    console.error("Error deleting partnership:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// POST /api/college/partnerships/:id/notes - Add note to partnership
router.post("/partnerships/:id/notes", auth, async (req, res) => {
  try {
    if (req.user.role !== "college") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const { content } = req.body;

    const partnership = await CollegePartnership.findOne({
      _id: req.params.id,
      collegeId: req.user.id
    });

    if (!partnership) {
      return res.status(404).json({ msg: "Partnership not found" });
    }

    partnership.notes.push({
      content,
      createdBy: req.user.id
    });
    partnership.lastActivity = Date.now();
    await partnership.save();

    res.json({
      msg: "Note added successfully",
      partnership
    });
  } catch (error) {
    console.error("Error adding note:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// PUT /api/college/partnerships/:id/stats - Update partnership stats
router.put("/partnerships/:id/stats", auth, async (req, res) => {
  try {
    if (req.user.role !== "college") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const { drivesConducted, studentsPlaced, totalPackageValue } = req.body;

    const partnership = await CollegePartnership.findOne({
      _id: req.params.id,
      collegeId: req.user.id
    });

    if (!partnership) {
      return res.status(404).json({ msg: "Partnership not found" });
    }

    if (drivesConducted !== undefined) partnership.drivesConducted = drivesConducted;
    if (studentsPlaced !== undefined) partnership.studentsPlaced = studentsPlaced;
    if (totalPackageValue !== undefined) partnership.totalPackageValue = totalPackageValue;
    partnership.lastActivity = Date.now();
    await partnership.save();

    res.json({
      msg: "Stats updated successfully",
      partnership
    });
  } catch (error) {
    console.error("Error updating stats:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
