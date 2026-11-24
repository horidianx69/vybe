require("dotenv").config();

const http = require("http");
const cron = require("node-cron");

const app = require("./app");
const connectDB = require("./config/db");
const redisClient = require("./config/redis");
const { initSocket } = require("./socket");
const releaseStaleBookings = require("./jobs/releaseStaleBookings");

const PORT = process.env.PORT || 3001;

// Socket.IO attaches to an HTTP server, so we create it ourselves
const server = http.createServer(app);
initSocket(server);

// The cache is optional: VYBE starts even if Redis is not there yet
if (redisClient) {
    redisClient.connect().catch((err) => console.log("Redis connect failed:", err.message));
}

connectDB()
    .then(() => {
        server.listen(PORT, () => {
            console.log("Server is running on port " + PORT);
        });

        // Every minute, give back seats held by bookings nobody paid for
        cron.schedule("* * * * *", () => {
            releaseStaleBookings().catch((err) =>
                console.log("Release job failed:", err.message)
            );
        });
    })
    .catch((err) => {
        console.error("Database connection failed:", err);
        process.exit(1);
    });
