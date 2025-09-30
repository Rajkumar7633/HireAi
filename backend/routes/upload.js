const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Setup multer for general file uploads (e.g., profile pictures, other documents)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../../uploads/general");
    fs.mkdirSync(uploadPath, { recursive: true }); // Ensure directory exists
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only specific file types for resumes
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Please upload PDF, DOC, or DOCX files only."
        ),
        false
      );
    }
  },
});

// @route   POST /api/upload/general
// @desc    Upload a general file (e.g., profile picture, resume)
// @access  Private
router.post("/general", auth, (req, res) => {
  upload.single("file")(req, res, async (err) => {
    try {
      // Handle multer errors
      if (err) {
        console.error("Multer error:", err.message);
        if (err.code === "LIMIT_FILE_SIZE") {
          return res
            .status(400)
            .json({
              msg: "File too large. Please upload a file smaller than 5MB.",
            });
        }
        return res.status(400).json({ msg: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ msg: "No file uploaded" });
      }

      const {
        filename,
        path: filepath,
        originalname,
        size,
        mimetype,
      } = req.file;

      console.log(`File uploaded successfully for user ${req.user.id}:`, {
        filename,
        originalname,
        size,
        mimetype,
      });

      // In a real application, you might save the file info to the database
      // For now, just return the file info
      res.json({
        msg: "File uploaded successfully",
        filename,
        filepath,
        originalname,
        size,
        mimetype,
        uploadedBy: req.user.id,
        uploadedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Upload error:", err.message);
      res.status(500).json({ msg: "Server Error during file upload" });
    }
  });
});

// @route   GET /api/upload/my-files
// @desc    Get user's uploaded files
// @access  Private
router.get("/my-files", auth, async (req, res) => {
  try {
    // In a real application, you would fetch from database
    // For now, return mock data
    const mockFiles = [
      {
        id: "file_1",
        filename: `${req.user.id}-resume.pdf`,
        originalname: "resume.pdf",
        size: 245760,
        mimetype: "application/pdf",
        uploadedAt: new Date().toISOString(),
        uploadedBy: req.user.id,
      },
    ];

    res.json(mockFiles);
  } catch (err) {
    console.error("Error fetching files:", err.message);
    res.status(500).json({ msg: "Server Error" });
  }
});

module.exports = router;
