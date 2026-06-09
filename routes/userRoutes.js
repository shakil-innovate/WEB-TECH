// const express = require("express");
// const router = express.Router();
// const { getAllUsers, getAllAdmins, createAdmin, deleteUser } = require("../controllers/userController");
// const { verifySuperAdmin } = require("../middleware/auth");

// // GET /api/users/all — Super Admin gets all users
// router.get("/all", verifySuperAdmin, getAllUsers);

// // GET /api/users/admins — Super Admin gets all admins
// router.get("/admins", verifySuperAdmin, getAllAdmins);

// // POST /api/users/create-admin — Super Admin creates an admin
// router.post("/create-admin", verifySuperAdmin, createAdmin);

// // DELETE /api/users/:id — Super Admin deletes a user
// router.delete("/:id", verifySuperAdmin, deleteUser);

// module.exports = router;