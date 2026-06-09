  const db = require("../config/db");

  // ─── SEND MESSAGE ────────────────────────────────────────────
 const sendMessage = async (req, res) => {
  const { post_id, message } = req.body;
  const sender_id = req.user.id;

  if (!post_id || !message) {
    return res.status(400).json({ message: "Post ID and message are required." });
  }

  try {
    // Get post with owner
    const [postRows] = await db.query(
      "SELECT id, user_id FROM posts WHERE id = ?",
      [post_id]
    );

    if (postRows.length === 0) {
      return res.status(404).json({ message: "Post not found." });
    }

    const post = postRows[0];
    const receiver_id = post.user_id; // ✅ owner of post is receiver

    // prevent sending message to yourself
    if (sender_id === receiver_id) {
      return res.status(400).json({ message: "You cannot message yourself." });
    }

    // insert message
    await db.query(
      "INSERT INTO messages (post_id, sender_id, receiver_id, message) VALUES (?, ?, ?, ?)",
      [post_id, sender_id, receiver_id, message]
    );

    return res.status(201).json({ message: "Message sent successfully." });
  } catch (err) {
    console.error("Send message error:", err.message);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
};

  // ─── GET MESSAGES BY POST ────────────────────────────────────
  const getMessagesByPost = async (req, res) => {
    const { postId } = req.params;
    const userId = req.user.id;

    try {
      // Check if post exists
      const [post] = await db.query("SELECT * FROM posts WHERE id = ?", [postId]);
      if (post.length === 0) {
        return res.status(404).json({ message: "Post not found." });
      }

      // Only allow admin or the post owner to see messages
      if (req.user.status !== "admin" && post[0].user_id !== userId) {
        return res.status(403).json({ message: "Access denied." });
      }

      const [rows] = await db.query(
        `SELECT messages.id, messages.message, messages.sent_at,
                sender.name AS sender_name, sender.status AS sender_role,
                receiver.name AS receiver_name
        FROM messages
        JOIN users AS sender ON messages.sender_id = sender.id
        JOIN users AS receiver ON messages.receiver_id = receiver.id
        WHERE messages.post_id = ?
        ORDER BY messages.sent_at ASC`,
        [postId]
      );

      return res.status(200).json({ messages: rows });
    } catch (err) {
      console.error("Get messages error:", err.message);
      return res.status(500).json({ message: "Server error. Please try again." });
    }
  };

  // ─── GET ALL INBOX MESSAGES FOR A USER ───────────────────────
 const getInbox = async (req, res) => {
  const userId = req.user.id;

  try {
    const [rows] = await db.query(
      `SELECT 
          messages.id,
          messages.message,
          messages.sent_at,

          sender.id AS sender_id,
          sender.name AS sender_name,

          posts.id AS post_id,
          posts.title AS post_title

       FROM messages
       JOIN users AS sender ON messages.sender_id = sender.id
       LEFT JOIN posts ON messages.post_id = posts.id
       WHERE messages.receiver_id = ?
       ORDER BY messages.sent_at DESC`,
      [userId]
    );

    return res.status(200).json({ inbox: rows });
  } catch (err) {
    console.error("Get inbox error:", err.message);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
};

  module.exports = { sendMessage, getMessagesByPost, getInbox };