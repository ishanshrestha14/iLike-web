/**
 * @fileoverview Cache-aside helper layer over Redis.
 *
 * Thin abstraction (get / set / invalidate / invalidatePattern) so controllers
 * never touch the Redis client directly and a future engine swap (cluster,
 * different store) is confined to this file + redisClient.js.
 *
 * Degradation contract:
 *   Every function swallows Redis/connection errors and behaves as a cache
 *   miss / no-op. A caller can always treat the cache as best-effort and fall
 *   through to MongoDB. Cache problems must never surface as request failures.
 *
 * Values are JSON-serialised. Only store plain serialisable data.
 */

import { getRedisClient } from "../utils/redisClient.js";

/** Default time-to-live for cached entries, in seconds. */
export const DEFAULT_TTL_SECONDS = 60;

/**
 * Reads and deserialises a cached value.
 *
 * @template T
 * @param {string} key
 * @returns {Promise<T | null>} Parsed value, or null on miss / error / no Redis.
 */
export async function getCached(key) {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn("[Cache] getCached failed (degrading to miss):", err.message);
    return null;
  }
}

/**
 * Serialises and stores a value with a TTL.
 *
 * @param {string} key
 * @param {unknown} value - Must be JSON-serialisable.
 * @param {number} [ttlSeconds=DEFAULT_TTL_SECONDS]
 * @returns {Promise<void>}
 */
export async function setCached(key, value, ttlSeconds = DEFAULT_TTL_SECONDS) {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch (err) {
    console.warn("[Cache] setCached failed (ignored):", err.message);
  }
}

/**
 * Deletes a single key.
 *
 * @param {string} key
 * @returns {Promise<void>}
 */
export async function invalidate(key) {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.del(key);
  } catch (err) {
    console.warn("[Cache] invalidate failed (ignored):", err.message);
  }
}

/**
 * Deletes every key matching a glob-style pattern (e.g. "matches:potential:42:*").
 *
 * Uses SCAN (via scanStream) rather than KEYS so it never blocks the Redis
 * event loop on large keyspaces. Deletions are batched per scan chunk.
 *
 * @param {string} pattern
 * @returns {Promise<void>}
 */
export async function invalidatePattern(pattern) {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    await new Promise((resolve, reject) => {
      const stream = redis.scanStream({ match: pattern, count: 100 });
      const pending = [];

      stream.on("data", (keys) => {
        if (keys.length) pending.push(redis.del(...keys));
      });
      stream.on("end", () => resolve(Promise.all(pending)));
      stream.on("error", reject);
    });
  } catch (err) {
    console.warn("[Cache] invalidatePattern failed (ignored):", err.message);
  }
}
