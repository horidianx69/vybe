const { createClient } = require("redis");

// No REDIS_URL (tests, or a laptop without Redis): no client, and VYBE runs without a cache
const redisClient = process.env.REDIS_URL
    ? createClient({ url: process.env.REDIS_URL })
    : null;

if (redisClient) {
    redisClient.on("ready", () => console.log("Connected to Redis"));
    redisClient.on("error", (err) => console.log("Redis error:", err.code || err.message));
}

module.exports = redisClient;
