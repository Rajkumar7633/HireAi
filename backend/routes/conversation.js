const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const Conversation = require("../models/Conversation")
const Message = require("../models/Message")
const User = require("../models/User")
const Notification = require("../models/Notification")
const sendEmail = require("../utils/emailService")

// @route   POST /api/conversations
// @desc    Create a new conversation or get existing one
// @access  Private
router.post("/", auth, async (req, res) => {
  const { recipientId } = req.body // For general chat, recipient is another user

  if (!recipientId) {
    return res.status(400).json({ msg: "Recipient ID is required to start a conversation" })
  }

  try {
    // Find if a conversation already exists between these two users
    const conversation = await Conversation.findOne({
      $or: [
        { jobSeekerId: req.user.id, recruiterId: recipientId },
        { jobSeekerId: recipientId, recruiterId: req.user.id },
      ],
      type: "general",
    })

    if (conversation) {
      return res.json({ msg: "Existing conversation found", conversation })
    }

    // Create new conversation
    const newConversation = new Conversation({
      jobSeekerId: req.user.role === "job_seeker" ? req.user.id : recipientId,
      recruiterId: req.user.role === "recruiter" ? req.user.id : recipientId,
      type: "general",
      createdAt: new Date(),
    })

    await newConversation.save()
    res.json({ msg: "Conversation created successfully", conversation: newConversation })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   GET /api/conversations
// @desc    Get all conversations for the authenticated user
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    let conversations
    if (req.user.role === "job_seeker") {
      conversations = await Conversation.find({ jobSeekerId: req.user.id, type: "general" })
        .populate("recruiterId", "name email")
        .sort({ lastMessageAt: -1 })
    } else if (req.user.role === "recruiter") {
      conversations = await Conversation.find({ recruiterId: req.user.id, type: "general" })
        .populate("jobSeekerId", "name email")
        .sort({ lastMessageAt: -1 })
    } else {
      // Admin can view all conversations (optional, implement if needed)
      conversations = []
    }

    res.json(conversations)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   GET /api/conversations/:id/messages
// @desc    Get messages for a specific conversation
// @access  Private
router.get("/:id/messages", auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)

    if (!conversation) {
      return res.status(404).json({ msg: "Conversation not found" })
    }

    // Ensure user is part of the conversation
    if (
      conversation.jobSeekerId.toString() !== req.user.id &&
      conversation.recruiterId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(401).json({ msg: "Not authorized to view this conversation" })
    }

    const messages = await Message.find({ conversationId: req.params.id }).sort({ timestamp: 1 })

    // Mark messages as read for the current user
    await Message.updateMany(
      { conversationId: req.params.id, senderId: { $ne: req.user.id }, readBy: { $ne: req.user.id } },
      { $addToSet: { readBy: req.user.id } },
    )

    res.json(messages)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   POST /api/conversations/:id/messages
// @desc    Send a message in a conversation
// @access  Private
router.post("/:id/messages", auth, async (req, res) => {
  const { content } = req.body

  try {
    const conversation = await Conversation.findById(req.params.id)

    if (!conversation) {
      return res.status(404).json({ msg: "Conversation not found" })
    }

    // Ensure user is part of the conversation
    if (conversation.jobSeekerId.toString() !== req.user.id && conversation.recruiterId.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized to send message in this conversation" })
    }

    const newMessage = new Message({
      conversationId: req.params.id,
      senderId: req.user.id,
      senderRole: req.user.role,
      content,
      timestamp: new Date(),
      readBy: [req.user.id], // Sender automatically reads their own message
    })

    await newMessage.save()

    // Update lastMessageAt for the conversation
    conversation.lastMessageAt = new Date()
    await conversation.save()

    // Notify the other participant
    const recipientId =
      conversation.jobSeekerId.toString() === req.user.id ? conversation.recruiterId : conversation.jobSeekerId
    const recipient = await User.findById(recipientId)

    if (recipient) {
      const notification = new Notification({
        userId: recipient._id,
        type: "new_message",
        message: `New message from ${req.user.email}: "${content.substring(0, 50)}..."`,
        relatedEntity: {
          id: conversation._id,
          type: "Conversation",
        },
      })
      await notification.save()

      await sendEmail({
        to: recipient.email,
        subject: `New Message from HireAI`,
        html: `<p>Dear ${recipient.name || "User"},</p>
               <p>You have received a new message from ${req.user.email}:</p>
               <p><strong>"${content}"</strong></p>
               <p>Please log in to your HireAI dashboard to reply.</p>
               <p>Best regards,<br>The HireAI Team</p>`,
      })
    }

    res.json(newMessage)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

module.exports = router
