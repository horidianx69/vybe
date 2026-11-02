const express = require("express");
const router = express.Router();
const {
    getAllTheatresAdmin,
    approveTheatre,
    rejectTheatre,
} = require("../controllers/theatreController");
const {
    getAllShowsAdmin,
    approveShow,
    rejectShow,
} = require("../controllers/showController");
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware");

router.use(authMiddleware);
router.use(authorizeRoles("admin"));

// Theatre management
router.get("/theatres", getAllTheatresAdmin);
router.put("/theatres/approve/:id", approveTheatre);
router.put("/theatres/reject/:id", rejectTheatre);

// Show management
router.get("/shows", getAllShowsAdmin);
router.put("/shows/approve/:id", approveShow);
router.put("/shows/reject/:id", rejectShow);

module.exports = router;