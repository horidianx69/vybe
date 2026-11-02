const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const {
    createPaymentIntent,
    verifyPayment,
} = require("../controllers/paymentController");

router.post("/create-payment-intent", authMiddleware, createPaymentIntent);
router.post("/verify-payment", authMiddleware, verifyPayment);

module.exports = router;
