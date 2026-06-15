/**
 * @fileoverview Singleton ioredis client.
 *
 * One shared connection for the whole backend — reused by the cache layer
 * (Task 2.1) and, later, the Socket.IO Redis adapter (Task 2.2).
 *
 * Graceful degradation is a hard requirement:
 *   Redis is an optimization, never a point of failure. If REDIS_URL is unset
 *   or the server is unreachable, getRedisClient() returns null and every
 *   caller is expected to fall through to its source of truth (MongoDB).
 *   We disable ioredis's infinite auto-retry so a missing Redis doesn't spam
 *   logs or hang requests — connection is attempted lazily and capped.
 *
 * Phase 5 swap note:
 *   Pointing at a Redis cluster / Elasticache is a REDIS_URL change only.
 */

import Redis from "ioredis";

/** @type {import("ioredis").Redis | null} */
let client = null;

/** True once we've decided Redis is unavailable, to avoid repeated setup. */
let disabled = false;

/**
 * Returns the shared Redis client, creating it on first call.
 * Returns null when REDIS_URL is not configured or Redis was marked disabled,
 * signalling callers to skip caching and hit the database directly.
 *
 * @returns {import("ioredis").Redis | null}
 */
export function getRedisClient() {
  if (disabled) return null;
  if (client) return client;

  const url = process.env.REDIS_URL;
  if (!url) {
    disabled = true;
    console.warn("[Redis] REDIS_URL not set — caching disabled, using DB only.");
    return null;
  }

  client = new Redis(url, {
    // Cap retries so a down Redis fails fast instead of queueing commands
    // forever. After this many attempts the client errors out and we degrade.
    maxRetriesPerRequest: 1,
    // Don't buffer commands while disconnected — fail immediately so callers
    // degrade to the DB rather than hanging.
    enableOfflineQueue: false,
    retryStrategy(times) {
      // Back off, then give up after a few tries (returning null stops retries).
      if (times > 3) {
        console.warn("[Redis] Giving up reconnect — caching disabled.");
        return null;
      }
      return Math.min(times * 200, 1000);
    },
  });

  client.on("connect", () => console.log("[Redis] Connected:", url));
  client.on("error", (err) => {
    // Logged once per error event; cacheService swallows the thrown errors so
    // requests still succeed against the DB.
    console.warn("[Redis] Connection error:", err.message);
  });

  return client;
}

/**
 * Closes the Redis connection (graceful shutdown / test teardown).
 * @returns {Promise<void>}
 */
export async function closeRedisClient() {
  if (client) {
    await client.quit().catch(() => {});
    client = null;
  }
  disabled = false;
}
