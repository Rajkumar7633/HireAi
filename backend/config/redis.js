const redis = require("redis");

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const redisExplicitlyDisabled = process.env.REDIS_ENABLED === "false";

let cacheEnabled = false;
let warnedUnavailable = false;

function warnOnce(message) {
  if (warnedUnavailable) return;
  warnedUnavailable = true;
  console.warn(`⚠️  Redis caching disabled: ${message}`);
}

/** No-op stub — all cache ops become silent no-ops */
function createNoopClient() {
  return {
    isOpen: false,
    connect: async () => {},
    get: async () => null,
    setEx: async () => undefined,
    keys: async () => [],
    del: async () => 0,
    quit: async () => undefined,
    disconnect: async () => undefined,
  };
}

let redisClient = createNoopClient();

function isCacheEnabled() {
  return cacheEnabled === true && redisClient.isOpen === true;
}

function disableRedis(reason) {
  cacheEnabled = false;
  try {
    if (redisClient?.isOpen) {
      redisClient.quit().catch(() => {});
    }
  } catch {}
  redisClient = createNoopClient();
  if (reason) warnOnce(reason);
}

if (redisExplicitlyDisabled) {
  warnOnce("REDIS_ENABLED=false");
} else {
  const liveClient = redis.createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries >= 2) {
          disableRedis("could not connect (start Redis or set REDIS_ENABLED=false in backend/.env)");
          return false;
        }
        return Math.min(retries * 200, 800);
      },
    },
  });

  liveClient.on("error", (err) => {
    cacheEnabled = false;
    if (String(err?.message || "").includes("ClientClosedError")) return;
    warnOnce(err.code || err.message || "connection error");
  });

  liveClient.on("ready", () => {
    cacheEnabled = true;
    warnedUnavailable = false;
    console.log("✅ Redis connected — response caching enabled");
  });

  liveClient.on("end", () => {
    cacheEnabled = false;
  });

  redisClient = liveClient;

  liveClient.connect().catch(() => {
    disableRedis("initial connection failed on " + redisUrl);
  });
}

module.exports = redisClient;
module.exports.isCacheEnabled = isCacheEnabled;
module.exports.disableRedis = disableRedis;
