const express = require("express");
const router = express.Router();
const {
    createBooking,
    cancelBooking,
    getBookingsByUser,
    getTicket
} = require("../controllers/bookingController");
const { authMiddleware } = require("../middleware/authMiddleware");

router.get("/my/bookings", authMiddleware, getBookingsByUser);
router.post("/", authMiddleware, createBooking);
router.get("/ticket/:id", authMiddleware, getTicket);
router.put("/cancel/:id", authMiddleware, cancelBooking);

module.exports = router; 