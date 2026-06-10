const express = require("express");
const router = express.Router();
const {
  requestExport,
  getExportStatus,
  getMyExports,
  downloadExport,
  deleteAccount,
  getProfile,
} = require("../controllers/exportController");
const { verifyToken } = require("../middleware/auth");

// GET /api/export/profile - Get user profile with stats
router.get("/profile", verifyToken, getProfile);

// POST /api/export/request - Request a data export
router.post("/request", verifyToken, requestExport);

// GET /api/export/my - Get all my exports
router.get("/my", verifyToken, getMyExports);

// GET /api/export/status/:exportId - Check export status
router.get("/status/:exportId", verifyToken, getExportStatus);

// GET /api/export/download/:exportId - Download export file
router.get("/download/:exportId", verifyToken, downloadExport);

// DELETE /api/export/delete-account - Soft delete account
router.delete("/delete-account", verifyToken, deleteAccount);

module.exports = router;