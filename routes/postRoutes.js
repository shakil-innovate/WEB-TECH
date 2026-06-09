const express = require("express");
const router = express.Router();

const {
  createPost,
  getAllPosts,
  getMyPosts,
  getPostById,
  updatePostStatus,
} = require("../controllers/postController");

const { verifyToken, verifyAdmin, verifyUser } = require("../middleware/auth");

// POST /api/posts/create - User creates a payment request
router.post("/create", verifyUser, createPost);

// GET /api/posts/all - Admin gets all posts (with optional ?status= filter)
router.get("/all", verifyAdmin, getAllPosts);

// GET /api/posts/my - User gets their own posts
router.get("/my", verifyUser, getMyPosts);

// GET /api/posts/:id - Get single post by id
router.get("/:id", verifyToken, getPostById);

// PUT /api/posts/status/:id - Admin updates post status
router.put("/status/:id", verifyAdmin, updatePostStatus);

module.exports = router;