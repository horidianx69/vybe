require("dotenv").config();

const http = require("http");

const app = require("./app");
const connectDB = require("./config/db");
const { initSocket } = require("./socket");

const PORT = process.env.PORT || 3001;

// Socket.IO attaches to an HTTP server, so we create it ourselves
const server = http.createServer(app);
initSocket(server);

connectDB()
    .then(() => {
        server.listen(PORT, () => {
            console.log("Server is running on port " + PORT);
        });
    })
    .catch((err) => {
        console.error("Database connection failed:", err);
        process.exit(1);
    });
