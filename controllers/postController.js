const db = require("../config/db");

// ─── CREATE PAYMENT REQUEST (User) ──────────────────────────
const createPost = async (req, res) => {
  const {
    title,
    description,
    amount,
    currency,
    recipient_name,
    recipient_account,
    recipient_bank
  } = req.body;

  const userId = req.user.id;

  if (!title || !amount || !recipient_name || !recipient_account) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    await db.query(
      `INSERT INTO posts
      (title, description, amount, currency,
       recipient_name, recipient_account,
       recipient_bank, user_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        title,
        description,
        amount,
        currency || "USD",
        recipient_name,
        recipient_account,
        recipient_bank,
        userId
      ]
    );

    return res.status(201).json({ message: "Payment request created successfully." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error." });
  }
};

// ─── GET ALL POSTS (Admin / Super Admin) ─────────────────────
const getAllPosts = async (req, res) => {
  const { status } = req.query;

  const allowed = ["pending", "assigned", "processing", "completed", "rejected"];

  if (status && !allowed.includes(status)) {
    return res.status(400).json({ message: "Invalid status filter." });
  }

  try {
    let query = `
      SELECT 
        posts.id,
        posts.user_id,
        posts.title,
        posts.description,
        posts.amount,
        posts.currency,
        posts.recipient_name,
        posts.recipient_account,
        posts.recipient_bank,
        posts.status,
        posts.post_date,
        users.name AS user_name,
        users.email AS user_email
      FROM posts
      JOIN users ON posts.user_id = users.id
    `;

    const params = [];

    if (status) {
      query += " WHERE posts.status = ?";
      params.push(status);
    }

    query += " ORDER BY posts.post_date DESC";

    const [rows] = await db.query(query, params);
    return res.status(200).json({ posts: rows });

  } catch (err) {
    console.error("Get all posts error:", err.message);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ─── GET MY POSTS (User) ─────────────────────────────────────
const getMyPosts = async (req, res) => {
  const userId = req.user.id;

  try {
    const [rows] = await db.query(
      "SELECT * FROM posts WHERE user_id = ? ORDER BY post_date DESC",
      [userId]
    );

    return res.status(200).json({ posts: rows });
  } catch (err) {
    console.error("Get my posts error:", err.message);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ─── GET SINGLE POST ─────────────────────────────────────────
const getPostById = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT posts.*, users.name AS user_name, users.email AS user_email 
       FROM posts 
       JOIN users ON posts.user_id = users.id 
       WHERE posts.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Post not found." });
    }

    return res.status(200).json({ post: rows[0] });
  } catch (err) {
    console.error("Get post by id error:", err.message);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ─── UPDATE POST STATUS (Admin) ──────────────────────────────
const updatePostStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowed = ["pending", "assigned", "processing", "completed", "rejected"];

  if (!status || !allowed.includes(status)) {
    return res.status(400).json({ message: "Valid status is required." });
  }

  try {
    const [result] = await db.query(
      "UPDATE posts SET status = ? WHERE id = ?",
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Post not found." });
    }

    return res.status(200).json({ message: `Post marked as ${status}.` });
  } catch (err) {
    console.error("Update post status error:", err.message);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
};

module.exports = { createPost, getAllPosts, getMyPosts, getPostById, updatePostStatus };