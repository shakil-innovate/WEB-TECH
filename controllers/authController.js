    const bcrypt = require("bcryptjs");
    const jwt = require("jsonwebtoken");
    const db = require("../config/db");
    const { generateAccessToken, generateRefreshToken } = require("../helpers/token");

    // ─── REGISTER ──────────────────────────────────────────────
    const register = async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: "All fields are required." });
    }

    try {
        // Check if email already exists
        const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
        if (existing.length > 0) {
        return res.status(409).json({ message: "Email already registered." });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user into db
        await db.query(
        "INSERT INTO users (name, email, password, status) VALUES (?, ?, ?, 'user')",
        [name, email, hashedPassword]
        );

        return res.status(201).json({ message: "Registration successful. Please login." });
    } catch (err) {
        console.error("Register error:", err.message);
        return res.status(500).json({ message: "Server error. Please try again." });
    }
    };

    // ─── LOGIN ───────────────────────────────────────────────────
    const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required." });
    }

    try {
        // Check if user exists
        const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
        if (rows.length === 0) {
        return res.status(401).json({ message: "Wrong email or password." });
        }

        const user = rows[0];

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
        return res.status(401).json({ message: "Wrong email or password." });
        }

        // Generate tokens
        const payload = { id: user.id, name: user.name, email: user.email, status: user.status };
        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);

        // Set tokens in cookies
        res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: false,
        maxAge: 15 * 60 * 1000, // 15 minutes
        });

        res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: false,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        return res.status(200).json({
        message: "Login successful.",
        user: { id: user.id, name: user.name, email: user.email, status: user.status },
        });
    } catch (err) {
        console.error("Login error:", err.message);
        return res.status(500).json({ message: "Server error. Please try again." });
    }
    };

    // ─── REFRESH TOKEN ───────────────────────────────────────────
    const refreshToken = async (req, res) => {
    const token = req.cookies?.refreshToken;

    if (!token) {
        return res.status(401).json({ message: "No refresh token provided." });
    }

    try {
        const decoded = jwt.verify(token, process.env.REFRESH_SECRET);

        const [rows] = await db.query("SELECT * FROM users WHERE id = ?", [decoded.id]);
        if (rows.length === 0) {
        return res.status(404).json({ message: "User not found." });
        }

        const user = rows[0];
        const payload = { id: user.id, name: user.name, email: user.email, status: user.status };
        const newAccessToken = generateAccessToken(payload);

        res.cookie("accessToken", newAccessToken, {
        httpOnly: true,
        secure: false,
        maxAge: 15 * 60 * 1000,
        });

        return res.status(200).json({ message: "Access token refreshed." });
    } catch (err) {
        console.error("Refresh token error:", err.message);
        return res.status(403).json({ message: "Invalid or expired refresh token." });
    }
    };

    // ─── LOGOUT ──────────────────────────────────────────────────
    const logout = (req, res) => {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    return res.status(200).json({ message: "Logged out successfully." });
    };

    module.exports = { register, login, refreshToken, logout };
        