const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { cacheMiddleware, invalidateCache } = require("../middleware/cache");
const SkillAssessment = require("../models/SkillAssessment");
const User = require("../models/User");

const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;

// Skill-specific question bank (can be extended over time)
const QUESTION_BANK = {
  javascript: [
    {
      question: "Which keyword is used to declare a constant in modern JavaScript?",
      options: ["var", "let", "const", "static"],
      correctIndex: 2,
    },
    {
      question: "What does Array.prototype.map return?",
      options: ["A mutated original array", "A new array", "A number", "undefined"],
      correctIndex: 1,
    },
    {
      question: "Which of the following is NOT a primitive type in JavaScript?",
      options: ["string", "boolean", "object", "number"],
      correctIndex: 2,
    },
  ],
  react: [
    {
      question: "Which hook is used to manage state in a function component?",
      options: ["useState", "useEffect", "useMemo", "useRef"],
      correctIndex: 0,
    },
    {
      question: "What must be returned from a React component?",
      options: ["A string", "A number", "JSX or null", "Nothing"],
      correctIndex: 2,
    },
    {
      question: "What is the purpose of useEffect?",
      options: [
        "To define component styles",
        "To manage side effects like data fetching",
        "To create context",
        "To render JSX",
      ],
      correctIndex: 1,
    },
  ],
  node: [
    {
      question: "Which module is used to create an HTTP server in Node.js?",
      options: ["fs", "http", "url", "net"],
      correctIndex: 1,
    },
    {
      question: "What does npm stand for?",
      options: ["Node Package Manager", "New Project Manager", "Node Program Module", "None"],
      correctIndex: 0,
    },
  ],
};

function getQuestionsForSkill(rawName) {
  if (!isNonEmptyString(rawName)) return [];
  const key = rawName.toLowerCase().trim();
  if (QUESTION_BANK[key]) return QUESTION_BANK[key];
  // Fallback generic questions if skill not in bank
  return [
    {
      question: `Basic knowledge check for ${rawName}: What is 2 + 2?`,
      options: ["3", "4", "5", "6"],
      correctIndex: 1,
    },
    {
      question: `Conceptual check for ${rawName}: Which option best describes a skill?`,
      options: ["A random word", "A measurable ability", "A color", "A file format"],
      correctIndex: 1,
    },
  ];
}

const COOLDOWN_HOURS = 24;

function normalizeSkillEntry(raw) {
  if (typeof raw === "string") {
    return { name: raw.trim(), level: "intermediate", verified: false };
  }
  if (raw && typeof raw === "object" && raw.name) {
    return {
      name: String(raw.name).trim(),
      level: raw.level || "intermediate",
      verified: Boolean(raw.verified),
      verifiedScore: typeof raw.verifiedScore === "number" ? raw.verifiedScore : undefined,
      verifiedAt: raw.verifiedAt || undefined,
    };
  }
  return null;
}

function mergeSkillsList(existing, incomingName, patch = {}) {
  const list = (existing || []).map(normalizeSkillEntry).filter(Boolean);
  const key = incomingName.toLowerCase().trim();
  const idx = list.findIndex((s) => s.name.toLowerCase().trim() === key);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...patch, name: list[idx].name };
  } else {
    list.push({ name: incomingName.trim(), level: "intermediate", verified: false, ...patch });
  }
  return list;
}

// Dashboard: skills + stats + history + cooldowns
router.get("/dashboard", auth, async (req, res) => {
  try {
    if (req.user.role !== "job_seeker") {
      return res.status(403).json({ msg: "Only job seekers can access skills dashboard" });
    }

    const userId = req.user.id || req.user.userId || req.user._id;
    const user = await User.findById(userId).select("skills").lean();
    if (!user) return res.status(404).json({ msg: "User not found" });

    const skills = (user.skills || []).map(normalizeSkillEntry).filter(Boolean);
    const assessments = await SkillAssessment.find({ userId })
      .sort({ createdAt: -1 })
      .select("skillName score passed status attemptNumber createdAt completedAt")
      .lean();

    const verifiedSkills = skills.filter((s) => s.verified);
    const scores = verifiedSkills
      .map((s) => s.verifiedScore)
      .filter((n) => typeof n === "number");
    const avgScore = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    const completed = assessments.filter((a) => a.status === "completed");
    const passedCount = completed.filter((a) => a.passed).length;
    const passRate = completed.length ? Math.round((passedCount / completed.length) * 100) : 0;

    const cooldowns = [];
    const skillNames = [...new Set(skills.map((s) => s.name))];
    for (const skillName of skillNames) {
      const lastFailed = assessments.find(
        (a) =>
          a.skillName &&
          a.skillName.toLowerCase() === skillName.toLowerCase() &&
          a.status === "completed" &&
          a.passed === false &&
          a.completedAt,
      );
      if (lastFailed) {
        const diffMs = Date.now() - new Date(lastFailed.completedAt).getTime();
        const hours = diffMs / (1000 * 60 * 60);
        if (hours < COOLDOWN_HOURS) {
          cooldowns.push({
            skillName,
            hoursRemaining: Math.ceil(COOLDOWN_HOURS - hours),
            retryAt: new Date(
              new Date(lastFailed.completedAt).getTime() + COOLDOWN_HOURS * 60 * 60 * 1000,
            ).toISOString(),
          });
        }
      }
    }

    const bySkill = {};
    for (const a of completed) {
      const k = a.skillName.toLowerCase();
      if (!bySkill[k]) bySkill[k] = { attempts: 0, bestScore: 0, lastScore: 0, passed: false };
      bySkill[k].attempts += 1;
      bySkill[k].lastScore = a.score || 0;
      bySkill[k].bestScore = Math.max(bySkill[k].bestScore, a.score || 0);
      if (a.passed) bySkill[k].passed = true;
    }

    return res.json({
      skills,
      stats: {
        total: skills.length,
        verified: verifiedSkills.length,
        unverified: skills.length - verifiedSkills.length,
        verificationRate: skills.length
          ? Math.round((verifiedSkills.length / skills.length) * 100)
          : 0,
        avgScore,
        passRate,
        totalAttempts: completed.length,
        passedAttempts: passedCount,
      },
      history: assessments,
      cooldowns,
      skillStats: bySkill,
    });
  } catch (err) {
    console.error("skills dashboard error", err);
    return res.status(500).json({ msg: "Server error" });
  }
});

// Manage skills: add, update level, remove
router.patch("/manage", auth, async (req, res) => {
  try {
    if (req.user.role !== "job_seeker") {
      return res.status(403).json({ msg: "Only job seekers can manage skills" });
    }

    const { action, skillName, level } = req.body || {};
    if (!isNonEmptyString(skillName)) {
      return res.status(400).json({ msg: "skillName is required" });
    }

    const userId = req.user.id || req.user.userId || req.user._id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const normalized = skillName.trim();
    let skills = (user.skills || []).map(normalizeSkillEntry).filter(Boolean);

    if (action === "remove") {
      skills = skills.filter((s) => s.name.toLowerCase() !== normalized.toLowerCase());
    } else if (action === "update") {
      const validLevels = ["beginner", "intermediate", "advanced"];
      const nextLevel = validLevels.includes(level) ? level : "intermediate";
      skills = mergeSkillsList(skills, normalized, { level: nextLevel });
    } else {
      // add (default)
      if (skills.some((s) => s.name.toLowerCase() === normalized.toLowerCase())) {
        return res.status(409).json({ msg: "Skill already exists" });
      }
      skills.push({ name: normalized, level: "intermediate", verified: false });
    }

    user.skills = skills;
    await user.save();
    await invalidateCache("skills:*");

    return res.json({ skills, msg: "Skills updated" });
  } catch (err) {
    console.error("manage skills error", err);
    return res.status(500).json({ msg: "Server error" });
  }
});

// Start a new skill assessment
router.post("/start-assessment", auth, async (req, res) => {
  try {
    if (req.user.role !== "job_seeker") {
      return res.status(403).json({ msg: "Only job seekers can verify skills" });
    }

    const { skillName } = req.body || {};
    if (!isNonEmptyString(skillName)) {
      return res.status(400).json({ msg: "skillName is required" });
    }

    const questions = getQuestionsForSkill(skillName);
    if (!questions.length) {
      return res.status(400).json({ msg: "No questions available for this skill" });
    }

    // Ensure user has this skill entry
    const userId = req.user.id || req.user.userId || req.user._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const existingSkill = (user.skills || []).find(
      (s) => s.name && s.name.toLowerCase().trim() === skillName.toLowerCase().trim()
    );
    if (!existingSkill) {
      user.skills = user.skills || [];
      user.skills.push({ name: skillName.trim() });
      await user.save();
    }

    // Enforce cooldown: if last completed assessment for this skill was failed < 24h ago, block new attempts
    const lastAttempt = await SkillAssessment.findOne({
      userId,
      skillName: skillName.trim(),
      status: "completed",
    })
      .sort({ completedAt: -1 })
      .lean();

    if (lastAttempt && lastAttempt.passed === false && lastAttempt.completedAt) {
      const diffMs = Date.now() - new Date(lastAttempt.completedAt).getTime();
      const hours = diffMs / (1000 * 60 * 60);
      if (hours < COOLDOWN_HOURS) {
        const remaining = Math.ceil(COOLDOWN_HOURS - hours);
        return res.status(429).json({
          msg: `You can retry this skill in ${remaining} hour(s).`,
          cooldownHoursRemaining: remaining,
        });
      }
    }

    // One active assessment per skill
    const active = await SkillAssessment.findOne({
      userId,
      skillName: skillName.trim(),
      status: "pending",
    });
    if (active) {
      // Return existing pending assessment
      return res.json({
        assessmentId: active._id,
        skillName: active.skillName,
        questions: active.questions.map((q, idx) => ({
          index: idx,
          question: q.question,
          options: q.options,
        })),
      });
    }

    const previousAttemptsCount = await SkillAssessment.countDocuments({
      userId,
      skillName: skillName.trim(),
    });

    const assessment = await SkillAssessment.create({
      userId,
      skillName: skillName.trim(),
      questions,
      status: "pending",
      attemptNumber: previousAttemptsCount + 1,
    });

    return res.json({
      assessmentId: assessment._id,
      skillName: assessment.skillName,
      questions: assessment.questions.map((q, idx) => ({
        index: idx,
        question: q.question,
        options: q.options,
      })),
    });
  } catch (err) {
    console.error("start-assessment error", err);
    return res.status(500).json({ msg: "Server error" });
  }
});

// Get assessment history for the current student
router.get("/history", auth, cacheMiddleware('skills:history', 180), async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId || req.user._id;
    const query = { userId };
    const assessments = await SkillAssessment.find(query)
      .sort({ createdAt: -1 })
      .select("skillName score passed status attemptNumber createdAt completedAt");
    return res.json({ assessments });
  } catch (err) {
    console.error("history error", err);
    return res.status(500).json({ msg: "Server error" });
  }
});

// Admin: list all assessments (optional filters)
router.get("/admin/all", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Admin access required" });
    }

    const { userId, skillName, passed } = req.query || {};
    const q = {};
    if (userId) q.userId = userId;
    if (skillName) q.skillName = new RegExp(String(skillName), "i");
    if (typeof passed !== "undefined") q.passed = passed === "true";

    const assessments = await SkillAssessment.find(q)
      .sort({ createdAt: -1 })
      .populate("userId", "email name role")
      .select("skillName score passed status attemptNumber createdAt completedAt");

    return res.json({ assessments });
  } catch (err) {
    console.error("admin all assessments error", err);
    return res.status(500).json({ msg: "Server error" });
  }
});


// Submit answers for an assessment
router.post("/submit-assessment/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "job_seeker") {
      return res.status(403).json({ msg: "Only job seekers can submit assessments" });
    }

    const { answers } = req.body || {};
    if (!Array.isArray(answers) || !answers.length) {
      return res.status(400).json({ msg: "answers array is required" });
    }

    const userId = req.user.id || req.user.userId || req.user._id;
    const assessment = await SkillAssessment.findById(req.params.id);
    if (!assessment) {
      return res.status(404).json({ msg: "Assessment not found" });
    }

    if (assessment.userId.toString() !== String(userId)) {
      return res.status(401).json({ msg: "Not authorized for this assessment" });
    }

    if (assessment.status === "completed") {
      return res.status(400).json({ msg: "Assessment already completed" });
    }

    const total = assessment.questions.length;
    let correct = 0;
    assessment.questions.forEach((q, idx) => {
      if (answers[idx] === q.correctIndex) correct += 1;
    });

    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    const passed = score >= 80;

    assessment.answers = answers;
    assessment.score = score;
    assessment.passed = passed;
    assessment.status = "completed";
    assessment.completedAt = new Date();
    await assessment.save();

    // If passed, mark skill as verified on user
    if (passed) {
      const user = await User.findById(userId);
      if (user) {
        user.skills = user.skills || [];
        const idx = user.skills.findIndex(
          (s) => s.name && s.name.toLowerCase().trim() === assessment.skillName.toLowerCase().trim()
        );
        if (idx >= 0) {
          user.skills[idx].verified = true;
          user.skills[idx].verifiedScore = score;
          user.skills[idx].verifiedAt = new Date();
        } else {
          user.skills.push({
            name: assessment.skillName,
            verified: true,
            verifiedScore: score,
            verifiedAt: new Date(),
          });
        }
        await user.save();
      }
    }

    // Invalidate cache for skills history
    await invalidateCache('skills:*');

    return res.json({
      skillName: assessment.skillName,
      score,
      passed,
    });
  } catch (err) {
    console.error("submit-assessment error", err);
    return res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
