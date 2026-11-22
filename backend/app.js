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
const helmet = require("helmet");
const morgan = require("morgan");
const mongoose = require("mongoose");

const app = express();
app.set("trust proxy", 1);
// Middleware
app.use(helmet());
app.use(express.json());
app.use(
    cors({
        origin: process.env.CLIENT_URL || "http://localhost:5173",
    })
);
// A reset link carries a secret token in its URL: never write it to the logs
morgan.token("safe-url", (req) =>
    req.originalUrl.startsWith("/api/auth/reset-password/")
        ? "/api/auth/reset-password/[hidden]"
        : req.originalUrl
);

// One line per request, with how long the server took to answer
if (process.env.NODE_ENV !== "test") {
    app.use(morgan(":method :safe-url :status :response-time ms"));
}
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
    // 1 means connected. 0, 2 and 3 mean disconnected, connecting and disconnecting.
    const dbUp = mongoose.connection.readyState === 1;

    res.status(dbUp ? 200 : 503).json({
        success: dbUp,
        db: dbUp ? "up" : "down",
        uptime: Math.round(process.uptime()),
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
