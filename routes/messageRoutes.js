const express = require("express");
const router = express.Router();
const {
  sendMessage,
  getMessagesByPost,
  getInbox,
  getSentMessages,
  getAllMessages,
  markAsRead,
} = require("../controllers/messageController");
const { verifyToken, verifyAdmin } = require("../middleware/auth");

// POST /api/messages/send - Send a message
router.post("/send", verifyToken, sendMessage);

// GET /api/messages/inbox - Get all received messages
router.get("/inbox", verifyToken, getInbox);

// GET /api/messages/sent - Get all sent messages
router.get("/sent", verifyToken, getSentMessages);

// GET /api/messages/all - Admin sees all messages
router.get("/all", verifyAdmin, getAllMessages);

// PUT /api/messages/read/:id - Mark message as read
router.put("/read/:id", verifyToken, markAsRead);

// GET /api/messages/:postId - Get all messages for a specific post
router.get("/:postId", verifyToken, getMessagesByPost);

module.exports = router;    