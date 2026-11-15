const express = require("express");
const authRoutes = require("./routes/authRoutes");
const movieRoutes = require("./routes/movieRoutes");
const theatreRoutes = require("./routes/theatreRoutes");
const showRoutes = require("./routes/showRoutes");
const aiRoutes = require("./routes/aiRoutes");
const adminRoutes = require("./routes/adminRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const cors = require("cors");

const app = express();

// Middleware
app.use(express.json());
app.use(
    cors({
        origin: process.env.CLIENT_URL || "http://localhost:5173",
    })
);
app.use((req, res, next) => {
    console.log(
        `${req.method} ${req.url} - ${new Date().toISOString()}`
    );
    next();
});
app.use("/api/auth", authRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/theatres", theatreRoutes);
app.use("/api/shows", showRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);

// Health Check
app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "VYBE server is healthy",
    });
});
// 404 Catch-All
// app.use((req, res) => {
//     res.status(404).json({
//         success: false,
//         message: "Route not found",
//     });
// });
app.use(notFound);
app.use(errorHandler);

module.exports = app;
