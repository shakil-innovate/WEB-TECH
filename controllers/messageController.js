  const db = require("../config/db");

  // ─── SEND MESSAGE (Admin → User or User → Admin) ─────────────
 const sendMessage = async (req, res) => {
  const { post_id, message } = req.body;
  let { receiver_id } = req.body;
  const sender_id = req.user.id;

  if (!post_id || !message) {
    return res.status(400).json({ message: "Post ID and message are required." });
  }

  try {
    // Check if post exists
    const [postRows] = await db.query("SELECT * FROM posts WHERE id = ?", [post_id]);
    if (postRows.length === 0) {
      return res.status(404).json({ message: "Post not found." });
    }

    const post = postRows[0];

    // If receiver_id not provided, resolve it automatically
    if (!receiver_id) {
      if (post.assigned_admin_id) {
        // Use assigned admin
        receiver_id = post.assigned_admin_id;
      } else {
        // Find who already messaged in this post (the other party)
        const [prevMsg] = await db.query(
          `SELECT sender_id FROM messages 
           WHERE post_id = ? AND sender_id != ? 
           LIMIT 1`,
          [post_id, sender_id]
        );
        if (prevMsg.length > 0) {
          receiver_id = prevMsg[0].sender_id;
        } else {
          return res.status(400).json({
            message: "No agent assigned yet. Please wait for an agent to be assigned."
          });
        }
      }
    }

    // Check if receiver exists
    const [receiverRows] = await db.query("SELECT id FROM users WHERE id = ?", [receiver_id]);
    if (receiverRows.length === 0) {
      return res.status(404).json({ message: "Receiver not found." });
    }

    // Prevent self messaging
    if (parseInt(sender_id) === parseInt(receiver_id)) {
      return res.status(400).json({ message: "You cannot message yourself." });
    }

    await db.query(
      "INSERT INTO messages (post_id, sender_id, receiver_id, message, is_read) VALUES (?, ?, ?, ?, FALSE)",
      [post_id, sender_id, receiver_id, message]
    );

    return res.status(201).json({ message: "Message sent successfully." });
  } catch (err) {
    console.error("Send message error:", err.message);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
};
  // ─── GET ALL MESSAGES BY POST (Both Admin & User) ────────────
  const getMessagesByPost = async (req, res) => {
    const { postId } = req.params;
    const userId = req.user.id;
    const userStatus = req.user.status;

    try {
      // Check if post exists
      const [post] = await db.query("SELECT * FROM posts WHERE id = ?", [postId]);
      if (post.length === 0) {
        return res.status(404).json({ message: "Post not found." });
      }

      // Only allow admin, super_admin or the post owner
      if (
        userStatus !== "admin" &&
        userStatus !== "super_admin" &&
        post[0].user_id !== userId
      ) {
        return res.status(403).json({ message: "Access denied." });
      }

      // Get all messages for this post
      const [rows] = await db.query(
        `SELECT 
            messages.id,
            messages.message,
            messages.sent_at,
            messages.is_read,
            sender.id AS sender_id,
            sender.name AS sender_name,
            sender.status AS sender_role,
            receiver.id AS receiver_id,
            receiver.name AS receiver_name,
            receiver.status AS receiver_role
        FROM messages
        JOIN users AS sender ON messages.sender_id = sender.id
        JOIN users AS receiver ON messages.receiver_id = receiver.id
        WHERE messages.post_id = ?
        ORDER BY messages.sent_at ASC`,
        [postId]
      );

      // Mark messages as read for the current user
      await db.query(
        "UPDATE messages SET is_read = TRUE WHERE post_id = ? AND receiver_id = ?",
        [postId, userId]
      );

      return res.status(200).json({ messages: rows });
    } catch (err) {
      console.error("Get messages error:", err.message);
      return res.status(500).json({ message: "Server error. Please try again." });
    }
  };

  // ─── GET INBOX (All received messages) ───────────────────────
  const getInbox = async (req, res) => {
    const userId = req.user.id;

    try {
      const [rows] = await db.query(
        `SELECT 
            messages.id,
            messages.message,
            messages.sent_at,
            messages.is_read,
            sender.id AS sender_id,
            sender.name AS sender_name,
            sender.status AS sender_role,
            posts.id AS post_id,
            posts.title AS post_title,
            posts.status AS post_status
        FROM messages
        JOIN users AS sender ON messages.sender_id = sender.id
        LEFT JOIN posts ON messages.post_id = posts.id
        WHERE messages.receiver_id = ?
        ORDER BY messages.sent_at DESC`,
        [userId]
      );

      const unreadCount = rows.filter((msg) => !msg.is_read).length;

      return res.status(200).json({ inbox: rows, unread: unreadCount });
    } catch (err) {
      console.error("Get inbox error:", err.message);
      return res.status(500).json({ message: "Server error. Please try again." });
    }
  };

  // ─── GET ALL SENT MESSAGES (Messages I sent) ─────────────────
  const getSentMessages = async (req, res) => {
    const userId = req.user.id;

    try {
      const [rows] = await db.query(
        `SELECT 
            messages.id,
            messages.message,
            messages.sent_at,
            messages.is_read,
            receiver.id AS receiver_id,
            receiver.name AS receiver_name,
            receiver.status AS receiver_role,
            posts.id AS post_id,
            posts.title AS post_title,
            posts.status AS post_status
        FROM messages
        JOIN users AS receiver ON messages.receiver_id = receiver.id
        LEFT JOIN posts ON messages.post_id = posts.id
        WHERE messages.sender_id = ?
        ORDER BY messages.sent_at DESC`,
        [userId]
      );

      return res.status(200).json({ sent: rows });
    } catch (err) {
      console.error("Get sent messages error:", err.message);
      return res.status(500).json({ message: "Server error. Please try again." });
    }
  };

  // ─── GET ALL MESSAGES (Admin sees all conversations) ─────────
  const getAllMessages = async (req, res) => {
    try {
      const [rows] = await db.query(
        `SELECT 
            messages.id,
            messages.message,
            messages.sent_at,
            messages.is_read,
            sender.id AS sender_id,
            sender.name AS sender_name,
            sender.status AS sender_role,
            receiver.id AS receiver_id,
            receiver.name AS receiver_name,
            receiver.status AS receiver_role,
            posts.id AS post_id,
            posts.title AS post_title,
            posts.status AS post_status
        FROM messages
        JOIN users AS sender ON messages.sender_id = sender.id
        JOIN users AS receiver ON messages.receiver_id = receiver.id
        LEFT JOIN posts ON messages.post_id = posts.id
        ORDER BY messages.sent_at DESC`
      );

      return res.status(200).json({ messages: rows });
    } catch (err) {
      console.error("Get all messages error:", err.message);
      return res.status(500).json({ message: "Server error. Please try again." });
    }
  };

  // ─── MARK MESSAGE AS READ ────────────────────────────────────
  const markAsRead = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
      const [result] = await db.query(
        "UPDATE messages SET is_read = TRUE WHERE id = ? AND receiver_id = ?",
        [id, userId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Message not found." });
      }

      return res.status(200).json({ message: "Message marked as read." });
    } catch (err) {
      console.error("Mark as read error:", err.message);
      return res.status(500).json({ message: "Server error. Please try again." });
    }
  };

  module.exports = { sendMessage, getMessagesByPost, getInbox, getSentMessages, getAllMessages, markAsRead };