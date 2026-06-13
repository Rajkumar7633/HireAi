const redis = require('redis');

const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      if (retries >= 3) {
        // Stop retrying silently — Redis is optional for local dev
        return false;
      }
      return Math.min(retries * 200, 1000);
    }
  }
});

let _warned = false;
redisClient.on('error', (err) => {
  if (!_warned) {
    console.warn('⚠️  Redis unavailable (caching disabled):', err.code || err.message);
    _warned = true;
  }
});

redisClient.on('connect', () => {
  _warned = false;
  console.log('✅ Redis connected');
});

redisClient.connect().catch(() => {
  // Swallow — warning already printed via 'error' event
});

module.exports = redisClient;
