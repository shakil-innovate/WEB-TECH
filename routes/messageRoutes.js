const express = require("express");
const router = express.Router();
const { sendMessage, getMessagesByPost, getInbox } = require("../controllers/messageController");
const { verifyToken } = require("../middleware/auth");

// POST /api/messages/send - Send a message
router.post("/send", verifyToken, sendMessage);

// GET /api/messages/inbox - Get all inbox messages for logged in user
router.get("/inbox", verifyToken, getInbox);

// GET /api/messages/:postId - Get all messages for a specific post
router.get("/:postId", verifyToken, getMessagesByPost);

module.exports = router;    