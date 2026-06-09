// const bcrypt = require("bcryptjs");
// const db = require("../config/db");

// // ─── GET ALL USERS (Super Admin) ─────────────────────────────
// const getAllUsers = async (req, res) => {
//   try {
//     const [rows] = await db.query(
//       "SELECT id, name, email, status, created_at FROM users ORDER BY created_at DESC"
//     );
//     return res.status(200).json({ users: rows });
//   } catch (err) {
//     console.error("Get all users error:", err.message);
//     return res.status(500).json({ message: "Server error. Please try again." });
//   }
// };

// // ─── GET ALL ADMINS (Super Admin) ────────────────────────────
// const getAllAdmins = async (req, res) => {
//   try {
//     const [rows] = await db.query(
//       "SELECT id, name, email, status, created_at FROM users WHERE status = 'admin' ORDER BY created_at DESC"
//     );
//     return res.status(200).json({ admins: rows });
//   } catch (err) {
//     console.error("Get all admins error:", err.message);
//     return res.status(500).json({ message: "Server error. Please try again." });
//   }
// };

// // ─── CREATE ADMIN (Super Admin) ──────────────────────────────
// const createAdmin = async (req, res) => {
//   const { name, email, password } = req.body;

//   if (!name || !email || !password) {
//     return res.status(400).json({ message: "All fields are required." });
//   }

//   try {
//     const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
//     if (existing.length > 0) {
//       return res.status(409).json({ message: "Email already registered." });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);

//     await db.query(
//       "INSERT INTO users (name, email, password, status) VALUES (?, ?, ?, 'admin')",
//       [name, email, hashedPassword]
//     );

//     return res.status(201).json({ message: "Admin account created successfully." });
//   } catch (err) {
//     console.error("Create admin error:", err.message);
//     return res.status(500).json({ message: "Server error. Please try again." });
//   }
// };

// // ─── DELETE USER (Super Admin) ───────────────────────────────
// const deleteUser = async (req, res) => {
//   const { id } = req.params;

//   // Prevent super admin from deleting themselves
//   if (parseInt(id) === req.user.id) {
//     return res.status(400).json({ message: "You cannot delete your own account." });
//   }

//   try {
//     const [result] = await db.query("DELETE FROM users WHERE id = ? AND status != 'super_admin'", [id]);

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ message: "User not found or cannot be deleted." });
//     }

//     return res.status(200).json({ message: "User deleted successfully." });
//   } catch (err) {
//     console.error("Delete user error:", err.message);
//     return res.status(500).json({ message: "Server error. Please try again." });
//   }
// };

// module.exports = { getAllUsers, getAllAdmins, createAdmin, deleteUser };