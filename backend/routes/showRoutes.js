const express = require("express");
const router = express.Router();
const {
    createShow,
    getAllShows,
    getShowById,
    getShowsByTheatre,
    getShowsByMovie,
    getShowsByOwner,
    updateShow,
    deleteShow,
} = require("../controllers/showController");
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware");

// Partner-specific routes (static paths first)
router.get("/my/shows", authMiddleware, authorizeRoles("partner"), getShowsByOwner);
router.post("/", authMiddleware, authorizeRoles("partner"), createShow);
router.put("/:id", authMiddleware, authorizeRoles("partner"), updateShow);
router.delete("/:id", authMiddleware, authorizeRoles("partner"), deleteShow);

// Public routes
router.get("/", getAllShows);
router.get("/theatre/:theatreId", getShowsByTheatre);
router.get("/movie/:movieId", getShowsByMovie);
router.get("/:id", getShowById);

module.exports = router;