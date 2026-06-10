const express = require("express");
const router = express.Router();
const {
    register,
    login,
    refreshToken,
    logout,
    getMe
} = require("../controllers/authController");

const { verifyToken } = require("../middleware/auth");

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refreshToken);
router.post("/logout", verifyToken, logout);
router.get("/me", verifyToken, getMe);

module.exports = router;