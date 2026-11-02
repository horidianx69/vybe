const express = require("express");
const router = express.Router();
const { searchShows, getRecommendations } = require("../controllers/aiController");
const { authMiddleware } = require("../middleware/authMiddleware");

router.post("/search-shows", searchShows);
router.get("/recommendations", authMiddleware, getRecommendations);

module.exports = router;