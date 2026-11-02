const express = require("express");
const router = express.Router();
const {
    createMovie,
    getAllMovies,
    getMovieById,
    updateMovie,
    deleteMovie,
} = require("../controllers/movieController");
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware");

// Public routes
router.get("/", getAllMovies);
router.get("/:id", getMovieById);

// Admin-only routes
router.post("/", authMiddleware, authorizeRoles("admin"), createMovie);
router.put("/:id", authMiddleware, authorizeRoles("admin"), updateMovie);
router.delete("/:id", authMiddleware, authorizeRoles("admin"), deleteMovie);

module.exports = router;