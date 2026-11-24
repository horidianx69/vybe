const redisClient = require("../config/redis");

// Every helper checks isReady first: while Redis is down, a command would wait, not fail
const getCache = async (key) => {
    if (!redisClient?.isReady) return null;
    try {
        const value = await redisClient.get(key);
        return value ? JSON.parse(value) : null;
    } catch (err) {
        console.log("Cache read failed:", err.message);
        return null;
    }
};

const setCache = async (key, data, seconds) => {
    if (!redisClient?.isReady) return;
    try {
        await redisClient.set(key, JSON.stringify(data), { EX: seconds });
    } catch (err) {
        console.log("Cache write failed:", err.message);
    }
};

const clearCache = async (key) => {
    if (!redisClient?.isReady) return;
    try {
        await redisClient.del(key);
    } catch (err) {
        console.log("Cache clear failed:", err.message);
    }
};

module.exports = { getCache, setCache, clearCache };
