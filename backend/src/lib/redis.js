import Redis from "ioredis";

let redisClient = null;
let customMockClient = null;

export const setMockRedisClient = (mock) => {
  customMockClient = mock;
};

export const getRedisClient = () => {
  if (customMockClient) {
    return customMockClient;
  }

  if (process.env.NODE_ENV === "test" && !process.env.USE_REDIS_IN_TESTS) {
    return null;
  }

  if (!redisClient) {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379", 10),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    redisClient.on("error", (err) => {
      console.warn("[Redis] Client Warning:", err.message);
    });
  }

  return redisClient;
};

export default getRedisClient;
