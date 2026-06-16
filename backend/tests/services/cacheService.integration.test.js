/**
 * Integration tests for cacheService.js against a REAL Redis server.
 *
 * These validate the full round-trip (serialise → store → TTL → SCAN-delete)
 * that the mocked unit tests cannot. They auto-skip when no Redis is reachable,
 * mirroring the ML services' integration pattern — no hard failure in CI.
 *
 * ── Running ───────────────────────────────────────────────────────────────────
 *   Start Redis (e.g. `docker run -p 6379:6379 redis`) then:
 *     REDIS_URL=redis://localhost:6379 npx vitest run tests/services/cacheService.integration.test.js
 *
 * Without REDIS_URL (or an unreachable server) every test is skipped.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// ── Probe: is a Redis server actually reachable? ─────────────────────────────
// Top-level await runs before the suite is defined, so describe.runIf gets a
// concrete boolean. The probe uses a short timeout and never throws.

let redisAvailable = false;
{
  const probe = new Redis(REDIS_URL, {
    lazyConnect: true,
    connectTimeout: 1000,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });
  probe.on("error", () => {}); // swallow connection errors during probing
  try {
    await probe.connect();
    await probe.ping();
    redisAvailable = true;
  } catch {
    console.warn(
      `\n[CacheService Integration] Skipping — no Redis reachable at ${REDIS_URL}.\n` +
        "  Start one with: docker run -p 6379:6379 redis\n"
    );
  } finally {
    probe.disconnect();
  }
}

describe.runIf(redisAvailable)("cacheService — real Redis", () => {
  let cache;

  beforeAll(async () => {
    // Ensure the client module picks up a valid URL, then import the service.
    process.env.REDIS_URL = REDIS_URL;
    cache = await import("../../services/cacheService.js");
  });

  afterAll(async () => {
    const { closeRedisClient } = await import("../../utils/redisClient.js");
    await closeRedisClient();
  });

  it("round-trips a value through set → get", async () => {
    await cache.setCached("test:roundtrip", { hello: "world" }, 30);
    expect(await cache.getCached("test:roundtrip")).toEqual({ hello: "world" });
  });

  it("returns null after a single-key invalidate", async () => {
    await cache.setCached("test:del", [1, 2, 3], 30);
    await cache.invalidate("test:del");
    expect(await cache.getCached("test:del")).toBeNull();
  });

  it("deletes every key matching a pattern", async () => {
    await Promise.all([
      cache.setCached("test:ptn:42:20:0", ["a"], 30),
      cache.setCached("test:ptn:42:20:20", ["b"], 30),
      cache.setCached("test:ptn:99:20:0", ["c"], 30), // different user — must survive
    ]);

    await cache.invalidatePattern("test:ptn:42:*");

    expect(await cache.getCached("test:ptn:42:20:0")).toBeNull();
    expect(await cache.getCached("test:ptn:42:20:20")).toBeNull();
    expect(await cache.getCached("test:ptn:99:20:0")).toEqual(["c"]);

    // Cleanup
    await cache.invalidatePattern("test:ptn:*");
  });

  it("respects TTL expiry", async () => {
    await cache.setCached("test:ttl", { x: 1 }, 1);
    await new Promise((r) => setTimeout(r, 1200));
    expect(await cache.getCached("test:ttl")).toBeNull();
  }, 5000);
});
