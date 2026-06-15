/**
 * Unit tests for cacheService.js
 *
 * The Redis client (utils/redisClient.js) is mocked so these tests run with no
 * Redis server and verify the cache-aside logic + the degradation contract:
 * every function must behave as a miss / no-op when Redis is absent or errors.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "events";

// ── Mock the Redis client module ─────────────────────────────────────────────

vi.mock("../../utils/redisClient.js", () => ({
  getRedisClient: vi.fn(),
}));

import { getRedisClient } from "../../utils/redisClient.js";
import {
  getCached,
  setCached,
  invalidate,
  invalidatePattern,
  DEFAULT_TTL_SECONDS,
} from "../../services/cacheService.js";

/** Builds a fake ioredis client with vi.fn() methods. */
function makeRedisMock(overrides = {}) {
  return {
    get: vi.fn(),
    set: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(1),
    scanStream: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── getCached ─────────────────────────────────────────────────────────────────

describe("getCached", () => {
  it("returns parsed value on a cache hit", async () => {
    const redis = makeRedisMock({ get: vi.fn().mockResolvedValue('[{"id":1}]') });
    vi.mocked(getRedisClient).mockReturnValue(redis);

    expect(await getCached("k")).toEqual([{ id: 1 }]);
    expect(redis.get).toHaveBeenCalledWith("k");
  });

  it("returns null on a cache miss", async () => {
    vi.mocked(getRedisClient).mockReturnValue(makeRedisMock({ get: vi.fn().mockResolvedValue(null) }));
    expect(await getCached("k")).toBeNull();
  });

  it("returns null (degrades) when Redis is unavailable", async () => {
    vi.mocked(getRedisClient).mockReturnValue(null);
    expect(await getCached("k")).toBeNull();
  });

  it("returns null when the client throws", async () => {
    vi.mocked(getRedisClient).mockReturnValue(
      makeRedisMock({ get: vi.fn().mockRejectedValue(new Error("conn reset")) })
    );
    expect(await getCached("k")).toBeNull();
  });
});

// ── setCached ─────────────────────────────────────────────────────────────────

describe("setCached", () => {
  it("serialises and sets with the given TTL", async () => {
    const redis = makeRedisMock();
    vi.mocked(getRedisClient).mockReturnValue(redis);

    await setCached("k", { a: 1 }, 120);

    expect(redis.set).toHaveBeenCalledWith("k", '{"a":1}', "EX", 120);
  });

  it("defaults to DEFAULT_TTL_SECONDS when ttl omitted", async () => {
    const redis = makeRedisMock();
    vi.mocked(getRedisClient).mockReturnValue(redis);

    await setCached("k", [1, 2]);

    expect(redis.set).toHaveBeenCalledWith("k", "[1,2]", "EX", DEFAULT_TTL_SECONDS);
  });

  it("is a no-op when Redis is unavailable", async () => {
    vi.mocked(getRedisClient).mockReturnValue(null);
    await expect(setCached("k", {})).resolves.toBeUndefined();
  });

  it("swallows client errors", async () => {
    vi.mocked(getRedisClient).mockReturnValue(
      makeRedisMock({ set: vi.fn().mockRejectedValue(new Error("oom")) })
    );
    await expect(setCached("k", {})).resolves.toBeUndefined();
  });
});

// ── invalidate ────────────────────────────────────────────────────────────────

describe("invalidate", () => {
  it("deletes the given key", async () => {
    const redis = makeRedisMock();
    vi.mocked(getRedisClient).mockReturnValue(redis);

    await invalidate("k");

    expect(redis.del).toHaveBeenCalledWith("k");
  });

  it("is a no-op when Redis is unavailable", async () => {
    vi.mocked(getRedisClient).mockReturnValue(null);
    await expect(invalidate("k")).resolves.toBeUndefined();
  });
});

// ── invalidatePattern ─────────────────────────────────────────────────────────

describe("invalidatePattern", () => {
  it("scans and deletes every matched key chunk", async () => {
    const stream = new EventEmitter();
    const redis = makeRedisMock({ scanStream: vi.fn().mockReturnValue(stream) });
    vi.mocked(getRedisClient).mockReturnValue(redis);

    const promise = invalidatePattern("matches:potential:42:*");

    // Simulate ioredis scanStream emitting two chunks then ending.
    stream.emit("data", ["matches:potential:42:20:0", "matches:potential:42:20:20"]);
    stream.emit("data", []); // empty chunk should not trigger a del
    stream.emit("end");

    await promise;

    expect(redis.scanStream).toHaveBeenCalledWith({
      match: "matches:potential:42:*",
      count: 100,
    });
    expect(redis.del).toHaveBeenCalledTimes(1);
    expect(redis.del).toHaveBeenCalledWith(
      "matches:potential:42:20:0",
      "matches:potential:42:20:20"
    );
  });

  it("is a no-op when Redis is unavailable", async () => {
    vi.mocked(getRedisClient).mockReturnValue(null);
    await expect(invalidatePattern("x:*")).resolves.toBeUndefined();
  });

  it("swallows stream errors", async () => {
    const stream = new EventEmitter();
    const redis = makeRedisMock({ scanStream: vi.fn().mockReturnValue(stream) });
    vi.mocked(getRedisClient).mockReturnValue(redis);

    const promise = invalidatePattern("x:*");
    stream.emit("error", new Error("scan failed"));

    await expect(promise).resolves.toBeUndefined();
  });
});
