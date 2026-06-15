const redisClient = require("../config/redis");
const isCacheEnabled = redisClient.isCacheEnabled;

const CACHE_TTL = 300; // 5 minutes default TTL

async function safeGet(key) {
  if (!isCacheEnabled()) return null;
  try {
    return await redisClient.get(key);
  } catch {
    if (typeof redisClient.disableRedis === "function") {
      redisClient.disableRedis("cache read failed");
    }
    return null;
  }
}

async function safeSetEx(key, ttl, value) {
  if (!isCacheEnabled()) return;
  try {
    await redisClient.setEx(key, ttl, value);
  } catch {
    if (typeof redisClient.disableRedis === "function") {
      redisClient.disableRedis("cache write failed");
    }
  }
}

/**
 * Cache middleware for GET requests
 */
const cacheMiddleware = (keyPrefix, ttl = CACHE_TTL) => {
  return async (req, res, next) => {
    if (req.method !== "GET" || !isCacheEnabled()) {
      return next();
    }

    const cacheKey = `${keyPrefix}:${req.originalUrl || req.url}`;
    const cachedData = await safeGet(cacheKey);

    if (cachedData) {
      try {
        return res.json(JSON.parse(cachedData));
      } catch {
        return next();
      }
    }

    const originalJson = res.json;

    res.json = function (data) {
      safeSetEx(cacheKey, ttl, JSON.stringify(data));
      return originalJson.call(this, data);
    };

    next();
  };
};

const invalidateCache = async (pattern) => {
  if (!isCacheEnabled()) return;

  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch {
    if (typeof redisClient.disableRedis === "function") {
      redisClient.disableRedis("cache invalidation failed");
    }
  }
};

const setCache = async (key, data, ttl = CACHE_TTL) => {
  await safeSetEx(key, ttl, JSON.stringify(data));
};

const getCache = async (key) => {
  const data = await safeGet(key);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
};

module.exports = {
  cacheMiddleware,
  invalidateCache,
  setCache,
  getCache,
};
