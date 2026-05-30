const redisClient = require('../config/redis');

const CACHE_TTL = 300; // 5 minutes default TTL

/**
 * Cache middleware for GET requests
 * Caches response data in Redis for faster subsequent requests
 */
const cacheMiddleware = (keyPrefix, ttl = CACHE_TTL) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    try {
      const cacheKey = `${keyPrefix}:${req.originalUrl || req.url}`;
      
      // Try to get data from cache
      const cachedData = await redisClient.get(cacheKey);
      
      if (cachedData) {
        console.log(`Cache hit for: ${cacheKey}`);
        return res.json(JSON.parse(cachedData));
      }
      
      // Cache miss - store original res.json function
      const originalJson = res.json;
      
      // Override res.json to cache the response
      res.json = function(data) {
        // Cache the response
        redisClient.setEx(cacheKey, ttl, JSON.stringify(data)).catch(err => {
          console.error('Redis cache set error:', err);
        });
        
        // Call original res.json
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      // Continue without caching if Redis fails
      next();
    }
  };
};

/**
 * Invalidate cache for a specific key pattern
 */
const invalidateCache = async (pattern) => {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log(`Invalidated ${keys.length} cache keys matching pattern: ${pattern}`);
    }
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
};

/**
 * Set cache manually
 */
const setCache = async (key, data, ttl = CACHE_TTL) => {
  try {
    await redisClient.setEx(key, ttl, JSON.stringify(data));
  } catch (error) {
    console.error('Set cache error:', error);
  }
};

/**
 * Get cache manually
 */
const getCache = async (key) => {
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Get cache error:', error);
    return null;
  }
};

module.exports = {
  cacheMiddleware,
  invalidateCache,
  setCache,
  getCache
};
