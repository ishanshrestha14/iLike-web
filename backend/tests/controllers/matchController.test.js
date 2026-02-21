import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../server.js";
import Match from "../../models/Match.js";
import { createUser, createProfile, signToken } from "../helpers.js";

// setup.js handles MongoDB Memory Server lifecycle and clears collections beforeEach.

let userA, userB, tokenA, tokenB;

beforeEach(async () => {
  userA = await createUser({ name: "User A", email: "a@test.com" });
  userB = await createUser({ name: "User B", email: "b@test.com" });
  tokenA = signToken(userA._id);
  tokenB = signToken(userB._id);
  // likeUser requires the liked user to have a completed profile
  await createProfile(userA._id, { name: "User A" });
  await createProfile(userB._id, { name: "User B" });
});

describe("POST /api/matches/like/:userId", () => {
  it("creates a like with isMatch=false for a non-mutual scenario", async () => {
    const res = await request(app)
      .post(`/api/matches/like/${userB._id}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.isMatch).toBe(false);

    const match = await Match.findOne({ likerId: userA._id, likedId: userB._id });
    expect(match).not.toBeNull();
    expect(match.isMatch).toBe(false);
  });

  it("sets isMatch=true on both records when the like is mutual", async () => {
    // B likes A first
    await request(app)
      .post(`/api/matches/like/${userA._id}`)
      .set("Authorization", `Bearer ${tokenB}`)
      .expect(200);

    // A likes B — triggers mutual match detection
    const res = await request(app)
      .post(`/api/matches/like/${userB._id}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.isMatch).toBe(true);

    const [matchAB, matchBA] = await Promise.all([
      Match.findOne({ likerId: userA._id, likedId: userB._id }),
      Match.findOne({ likerId: userB._id, likedId: userA._id }),
    ]);
    expect(matchAB.isMatch).toBe(true);
    expect(matchBA.isMatch).toBe(true);
  });

  it("returns 400 when the same user is liked twice", async () => {
    await request(app)
      .post(`/api/matches/like/${userB._id}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .expect(200);

    const res = await request(app)
      .post(`/api/matches/like/${userB._id}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 for an invalid ObjectId in the URL", async () => {
    const res = await request(app)
      .post("/api/matches/like/not-a-valid-id")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 when no auth token is provided", async () => {
    const res = await request(app).post(`/api/matches/like/${userB._id}`);
    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/matches/like/:userId", () => {
  it("removes an existing like and returns 200", async () => {
    // Create the like first
    await request(app)
      .post(`/api/matches/like/${userB._id}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .expect(200);

    const res = await request(app)
      .delete(`/api/matches/like/${userB._id}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const match = await Match.findOne({ likerId: userA._id, likedId: userB._id });
    expect(match).toBeNull();
  });

  it("returns 404 when no like exists to remove", async () => {
    const res = await request(app)
      .delete(`/api/matches/like/${userB._id}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 for an invalid ObjectId in the URL", async () => {
    const res = await request(app)
      .delete("/api/matches/like/not-a-valid-id")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 when no auth token is provided", async () => {
    const res = await request(app).delete(`/api/matches/like/${userB._id}`);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/matches/undo", () => {
  it("undoes the most recent swipe and deletes the Match record", async () => {
    // Create a like via the API (creates a recent Match)
    await request(app)
      .post(`/api/matches/like/${userB._id}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .expect(200);

    const matchBefore = await Match.findOne({ likerId: userA._id, likedId: userB._id });
    expect(matchBefore).not.toBeNull();

    const res = await request(app)
      .post("/api/matches/undo")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const matchAfter = await Match.findOne({ likerId: userA._id, likedId: userB._id });
    expect(matchAfter).toBeNull();
  });

  it("returns 400 when there is no swipe to undo", async () => {
    const res = await request(app)
      .post("/api/matches/undo")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 when no auth token is provided", async () => {
    const res = await request(app).post("/api/matches/undo");
    expect(res.status).toBe(401);
  });
});
