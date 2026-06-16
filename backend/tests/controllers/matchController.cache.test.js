/**
 * Caching-behaviour tests for matchController.js
 *
 * cacheService is mocked so we can assert the controller's cache-aside wiring
 * without a running Redis: that getPotentialMatches consults the cache, serves
 * a hit verbatim, populates on a miss, and that writes invalidate both users'
 * feeds. The in-memory MongoDB (via setup.js) backs the cache-miss path.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock the cache layer (hoisted before server.js imports the controller) ────

vi.mock("../../services/cacheService.js", () => ({
  getCached: vi.fn(),
  setCached: vi.fn().mockResolvedValue(undefined),
  invalidatePattern: vi.fn().mockResolvedValue(undefined),
}));

import request from "supertest";
import app from "../../server.js";
import {
  getCached,
  setCached,
  invalidatePattern,
} from "../../services/cacheService.js";
import { createUser, createProfile, signToken } from "../helpers.js";

let userA, userB, tokenA;

beforeEach(async () => {
  vi.clearAllMocks();
  userA = await createUser({ name: "User A", email: "a@test.com" });
  userB = await createUser({ name: "User B", email: "b@test.com" });
  tokenA = signToken(userA._id);
  await createProfile(userA._id, { name: "User A" });
  await createProfile(userB._id, { name: "User B" });
});

const keyA = () => `matches:potential:${userA._id.toString()}:20:0`;

describe("GET /api/matches/potential — caching", () => {
  it("consults the cache and populates it on a miss with DB results", async () => {
    vi.mocked(getCached).mockResolvedValue(null); // miss

    const res = await request(app)
      .get("/api/matches/potential")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(getCached).toHaveBeenCalledWith(keyA());
    // userB is a valid candidate for userA → non-empty feed from the DB.
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.cached).toBeUndefined();
    // The fetched feed is written back to the cache.
    expect(setCached).toHaveBeenCalledWith(keyA(), expect.any(Array), 60);
  });

  it("serves a cache hit verbatim without touching the DB or re-caching", async () => {
    const cachedFeed = [{ id: "cached-1", name: "From Cache" }];
    vi.mocked(getCached).mockResolvedValue(cachedFeed);

    const res = await request(app)
      .get("/api/matches/potential")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.cached).toBe(true);
    expect(res.body.data).toEqual(cachedFeed);
    expect(res.body.count).toBe(1);
    // A hit must not repopulate the cache.
    expect(setCached).not.toHaveBeenCalled();
  });

  it("honours limit/skip in the cache key", async () => {
    vi.mocked(getCached).mockResolvedValue(null);

    await request(app)
      .get("/api/matches/potential?limit=5&skip=10")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(getCached).toHaveBeenCalledWith(
      `matches:potential:${userA._id.toString()}:5:10`
    );
  });
});

describe("match writes — cache invalidation", () => {
  it("likeUser invalidates the potential-matches feed for both users", async () => {
    vi.mocked(getCached).mockResolvedValue(null);

    await request(app)
      .post(`/api/matches/like/${userB._id}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .expect(200);

    expect(invalidatePattern).toHaveBeenCalledWith(
      `matches:potential:${userA._id.toString()}:*`
    );
    expect(invalidatePattern).toHaveBeenCalledWith(
      `matches:potential:${userB._id.toString()}:*`
    );
  });

  it("dislikeUser invalidates both users' feeds", async () => {
    // Seed a like so there is something to remove.
    await request(app)
      .post(`/api/matches/like/${userB._id}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .expect(200);
    vi.clearAllMocks();

    await request(app)
      .delete(`/api/matches/like/${userB._id}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .expect(200);

    expect(invalidatePattern).toHaveBeenCalledWith(
      `matches:potential:${userA._id.toString()}:*`
    );
    expect(invalidatePattern).toHaveBeenCalledWith(
      `matches:potential:${userB._id.toString()}:*`
    );
  });
});
