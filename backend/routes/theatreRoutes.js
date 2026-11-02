const express = require("express");
const router = express.Router();
const {
    createTheatre,
    getAllTheatres,
    getTheatreById,
    getTheatresByOwner,
    updateTheatre,
    deleteTheatre,
} = require("../controllers/theatreController");
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware");

// Partner-specific routes (static paths first)
router.get("/my/theatres", authMiddleware, authorizeRoles("partner"), getTheatresByOwner);
router.post("/", authMiddleware, authorizeRoles("partner"), createTheatre);
router.put("/:id", authMiddleware, authorizeRoles("partner"), updateTheatre);
router.delete("/:id", authMiddleware, authorizeRoles("partner"), deleteTheatre);

// Public routes
router.get("/", getAllTheatres);
router.get("/:id", getTheatreById);

module.exports = router;