const express = require("express");
const router = express.Router();
const { register, login, getCurrentUser, forgotPassword, resetPassword } = require("../controllers/authController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { loginLimiter, forgotPasswordLimiter } = require("../middleware/rateLimiters");
const requireStrings = require("../middleware/requireStrings");



router.post("/register", requireStrings("name", "email", "password"), register);
router.post("/login", loginLimiter, requireStrings("email", "password"), login);
router.get("/current-user", authMiddleware, getCurrentUser);
router.post("/forgot-password", forgotPasswordLimiter, requireStrings("email"), forgotPassword);
router.post("/reset-password/:token", resetPassword);


module.exports = router;