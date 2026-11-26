const express = require("express");
const router = express.Router();
const { searchShows, getRecommendations } = require("../controllers/aiController");
const { authMiddleware } = require("../middleware/authMiddleware");
const requireStrings = require("../middleware/requireStrings");

router.post("/search-shows", requireStrings("query"), searchShows);
router.get("/recommendations", authMiddleware, getRecommendations);

module.exports = router;