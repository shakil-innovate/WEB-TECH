const express = require("express");
const router = express.Router();
const { register, login, refreshToken, logout } = require("../controllers/authController");
const { verifyToken } = require("../middleware/auth");

// POST /api/auth/register
router.post("/register", register);

// POST /api/auth/login
router.post("/login", login);

// POST /api/auth/refresh
router.post("/refresh", refreshToken);

// POST /api/auth/logout    
router.post("/logout", verifyToken, logout);

module.exports = router;