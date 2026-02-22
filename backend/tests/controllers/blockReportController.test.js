import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../server.js";
import Block from "../../models/Block.js";
import Report from "../../models/Report.js";
import Match from "../../models/Match.js";
import Chat from "../../models/Chat.js";
import {
  createUser,
  createMutualMatch,
  createChatDirect,
  signToken,
} from "../helpers.js";

// setup.js handles MongoDB Memory Server lifecycle and clears all collections beforeEach.

let userA, userB, tokenA;

beforeEach(async () => {
  userA = await createUser({ name: "User A", email: "a@block.com" });
  userB = await createUser({ name: "User B", email: "b@block.com" });
  tokenA = signToken(userA._id);
});

// ─── blockUser ────────────────────────────────────────────────────────────────

describe("POST /api/users/block/:id", () => {
  it("blocks a user → 200, creates Block record, removes Match records, deactivates shared chats", async () => {
    await createMutualMatch(userA._id, userB._id);
    await createChatDirect(userA._id, userB._id);

    const res = await request(app)
      .post(`/api/users/block/${userB._id}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Block record created
    const block = await Block.findOne({ blockerId: userA._id, blockedId: userB._id });
    expect(block).not.toBeNull();

    // Match records removed
    const matches = await Match.find({
      $or: [
        { likerId: userA._id, likedId: userB._id },
        { likerId: userB._id, likedId: userA._id },
      ],
    });
    expect(matches).toHaveLength(0);

    // Shared chat deactivated
    const chat = await Chat.findOne({
      participants: { $all: [userA._id, userB._id] },
    });
    expect(chat.isActive).toBe(false);
  });

  it("returns 400 when blocking yourself", async () => {
    const res = await request(app)
      .post(`/api/users/block/${userA._id}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 when the user is already blocked", async () => {
    await Block.create({ blockerId: userA._id, blockedId: userB._id });

    const res = await request(app)
      .post(`/api/users/block/${userB._id}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 404 for a non-existent user", async () => {
    const fakeId = "507f1f77bcf86cd799439011";

    const res = await request(app)
      .post(`/api/users/block/${fakeId}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 for an invalid user ID", async () => {
    const res = await request(app)
      .post("/api/users/block/not-a-valid-id")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app).post(`/api/users/block/${userB._id}`);
    expect(res.status).toBe(401);
  });
});

// ─── reportUser ───────────────────────────────────────────────────────────────

describe("POST /api/users/report/:id", () => {
  it("submits a report → 200, creates Report record", async () => {
    const res = await request(app)
      .post(`/api/users/report/${userB._id}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ reason: "spam", description: "Sending spam messages" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const report = await Report.findOne({
      reporterId: userA._id,
      reportedId: userB._id,
    });
    expect(report).not.toBeNull();
    expect(report.reason).toBe("spam");
  });

  it("returns 400 when reporting yourself", async () => {
    const res = await request(app)
      .post(`/api/users/report/${userA._id}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ reason: "spam" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 when reason is missing", async () => {
    const res = await request(app)
      .post(`/api/users/report/${userB._id}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ description: "No reason given" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 when the same user is reported twice", async () => {
    await Report.create({
      reporterId: userA._id,
      reportedId: userB._id,
      reason: "spam",
    });

    const res = await request(app)
      .post(`/api/users/report/${userB._id}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ reason: "harassment" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 404 for a non-existent user", async () => {
    const fakeId = "507f1f77bcf86cd799439011";

    const res = await request(app)
      .post(`/api/users/report/${fakeId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ reason: "spam" });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app)
      .post(`/api/users/report/${userB._id}`)
      .send({ reason: "spam" });

    expect(res.status).toBe(401);
  });
});
