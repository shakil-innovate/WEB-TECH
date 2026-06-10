const db = require("../config/db");
const fs = require("fs");
const path = require("path");
const { Parser } = require("json2csv");

// ─── ENSURE EXPORTS DIRECTORY EXISTS ────────────────────────
const exportsDir = path.join(__dirname, "../exports");
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
}

// ─── REQUEST DATA EXPORT ─────────────────────────────────────
const requestExport = async (req, res) => {
  const userId = req.user.id;
  const { format = "json" } = req.body;

  if (!["json", "csv"].includes(format)) {
    return res.status(400).json({ message: "Invalid format. Use json or csv." });
  }

  try {
    // Check if there is already a pending/processing export
    const [existing] = await db.query(
      "SELECT id, status FROM data_exports WHERE user_id = ? AND status IN ('pending', 'processing') ORDER BY requested_at DESC LIMIT 1",
      [userId]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        message: "You already have an export in progress. Please wait for it to complete.",
        export_id: existing[0].id,
        status: existing[0].status,
      });
    }

    // Create export record
    const [result] = await db.query(
      "INSERT INTO data_exports (user_id, request_type, status, format) VALUES (?, 'full_export', 'pending', ?)",
      [userId, format]
    );

    const exportId = result.insertId;

    // Process export in background
    processExport(exportId, userId, format);

    return res.status(202).json({
      message: "Export request received. Your file will be ready shortly.",
      export_id: exportId,
      status: "pending",
    });
  } catch (err) {
    console.error("Request export error:", err.message);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ─── PROCESS EXPORT (Background Job) ────────────────────────
const processExport = async (exportId, userId, format) => {
  try {
    // Update status to processing
    await db.query(
      "UPDATE data_exports SET status = 'processing' WHERE id = ?",
      [exportId]
    );

    // Gather user data
    const [users] = await db.query(
      "SELECT id, name, email, status, created_at FROM users WHERE id = ?",
      [userId]
    );

    const [posts] = await db.query(
      "SELECT id, title, description, amount, currency, recipient_name, recipient_account, recipient_bank, status, post_date FROM posts WHERE user_id = ? AND deleted_at IS NULL",
      [userId]
    );

    const [messages] = await db.query(
      `SELECT messages.id, messages.message, messages.sent_at, messages.is_read,
              sender.name AS sender_name, receiver.name AS receiver_name,
              posts.title AS post_title
       FROM messages
       JOIN users AS sender ON messages.sender_id = sender.id
       JOIN users AS receiver ON messages.receiver_id = receiver.id
       LEFT JOIN posts ON messages.post_id = posts.id
       WHERE messages.sender_id = ? OR messages.receiver_id = ?`,
      [userId, userId]
    );

    const exportData = {
      exported_at: new Date().toISOString(),
      user: users[0] || {},
      payment_requests: posts,
      messages: messages,
      summary: {
        total_requests: posts.length,
        total_messages: messages.length,
      },
    };

    let fileContent;
    let fileName;
    let fileUrl;

    if (format === "json") {
      fileContent = JSON.stringify(exportData, null, 2);
      fileName = `export_user_${userId}_${exportId}.json`;
    } else {
      // CSV — flatten data into multiple sections
      const userFields = ["id", "name", "email", "status"];
      const postFields = ["id", "title", "amount", "currency", "recipient_name", "recipient_account", "recipient_bank", "status", "post_date"];
      const messageFields = ["id", "message", "sent_at", "sender_name", "receiver_name", "post_title"];

      const userParser = new Parser({ fields: userFields });
      const postParser = new Parser({ fields: postFields });
      const messageParser = new Parser({ fields: messageFields });

      const userCsv = userParser.parse([exportData.user]);
      const postCsv = posts.length > 0 ? postParser.parse(posts) : "No payment requests";
      const messageCsv = messages.length > 0 ? messageParser.parse(messages) : "No messages";

      fileContent = `=== USER INFO ===\n${userCsv}\n\n=== PAYMENT REQUESTS ===\n${postCsv}\n\n=== MESSAGES ===\n${messageCsv}`;
      fileName = `export_user_${userId}_${exportId}.csv`;
    }

    // Save file
    const filePath = path.join(exportsDir, fileName);
    fs.writeFileSync(filePath, fileContent, "utf8");
    fileUrl = `/exports/${fileName}`;

    // Update export record as completed
    await db.query(
      "UPDATE data_exports SET status = 'completed', file_url = ?, completed_at = NOW() WHERE id = ?",
      [fileUrl, exportId]
    );

    console.log(`✅ Export ${exportId} completed for user ${userId}`);
  } catch (err) {
    console.error(`❌ Export ${exportId} failed:`, err.message);
    await db.query(
      "UPDATE data_exports SET status = 'failed' WHERE id = ?",
      [exportId]
    );
  }
};

// ─── GET EXPORT STATUS ───────────────────────────────────────
const getExportStatus = async (req, res) => {
  const { exportId } = req.params;
  const userId = req.user.id;

  try {
    const [rows] = await db.query(
      "SELECT * FROM data_exports WHERE id = ? AND user_id = ?",
      [exportId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Export not found." });
    }

    return res.status(200).json({ export: rows[0] });
  } catch (err) {
    console.error("Get export status error:", err.message);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ─── GET ALL MY EXPORTS ──────────────────────────────────────
const getMyExports = async (req, res) => {
  const userId = req.user.id;

  try {
    const [rows] = await db.query(
      "SELECT * FROM data_exports WHERE user_id = ? ORDER BY requested_at DESC",
      [userId]
    );

    return res.status(200).json({ exports: rows });
  } catch (err) {
    console.error("Get my exports error:", err.message);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ─── DOWNLOAD EXPORT FILE ────────────────────────────────────
const downloadExport = async (req, res) => {
  const { exportId } = req.params;
  const userId = req.user.id;

  try {
    const [rows] = await db.query(
      "SELECT * FROM data_exports WHERE id = ? AND user_id = ? AND status = 'completed'",
      [exportId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Export not found or not ready yet." });
    }

    const exportRecord = rows[0];
    const fileName = path.basename(exportRecord.file_url);
    const filePath = path.join(exportsDir, fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Export file not found on server." });
    }

    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Type", exportRecord.format === "json" ? "application/json" : "text/csv");
    res.sendFile(filePath);
  } catch (err) {
    console.error("Download export error:", err.message);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ─── SOFT DELETE ACCOUNT ─────────────────────────────────────
const deleteAccount = async (req, res) => {
  const userId = req.user.id;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ message: "Password is required to delete account." });
  }

  try {
    const bcrypt = require("bcryptjs");

    // Get user
    const [rows] = await db.query("SELECT * FROM users WHERE id = ?", [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, rows[0].password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password." });
    }

    // Soft delete user
    await db.query(
      "UPDATE users SET deleted_at = NOW() WHERE id = ?",
      [userId]
    );

    // Soft delete user's posts
    await db.query(
      "UPDATE posts SET deleted_at = NOW() WHERE user_id = ?",
      [userId]
    );

    // Clear cookies
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    return res.status(200).json({ message: "Account deleted successfully." });
  } catch (err) {
    console.error("Delete account error:", err.message);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ─── GET PROFILE ─────────────────────────────────────────────
const getProfile = async (req, res) => {
  const userId = req.user.id;

  try {
    const [rows] = await db.query(
      "SELECT id, name, email, status, created_at FROM users WHERE id = ? AND deleted_at IS NULL",
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const [postStats] = await db.query(
      "SELECT COUNT(*) AS total, SUM(amount) AS total_amount FROM posts WHERE user_id = ? AND deleted_at IS NULL",
      [userId]
    );

    return res.status(200).json({
      user: rows[0],
      stats: postStats[0],
    });
  } catch (err) {
    console.error("Get profile error:", err.message);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
};

module.exports = {
  requestExport,
  getExportStatus,
  getMyExports,
  downloadExport,
  deleteAccount,
  getProfile,
};