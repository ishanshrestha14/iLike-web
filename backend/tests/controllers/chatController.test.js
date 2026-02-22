import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../server.js";
import Message from "../../models/Message.js";
import {
  createUser,
  createMutualMatch,
  createChatDirect,
  signToken,
} from "../helpers.js";

// setup.js handles MongoDB Memory Server lifecycle and clears all collections beforeEach.

let userA, userB, tokenA, tokenB, chat;

beforeEach(async () => {
  userA = await createUser({ name: "User A", email: "a@chat.com" });
  userB = await createUser({ name: "User B", email: "b@chat.com" });
  tokenA = signToken(userA._id);
  tokenB = signToken(userB._id);
  await createMutualMatch(userA._id, userB._id);
  chat = await createChatDirect(userA._id, userB._id);
});

// ─── createChat ──────────────────────────────────────────────────────────────

describe("POST /api/chats", () => {
  it("creates a new chat when users are mutually matched → 201 with chatId", async () => {
    // Set up fresh users with a match but no existing chat
    const u1 = await createUser({ email: "new1@chat.com" });
    const u2 = await createUser({ email: "new2@chat.com" });
    await createMutualMatch(u1._id, u2._id);

    const res = await request(app)
      .post("/api/chats")
      .set("Authorization", `Bearer ${signToken(u1._id)}`)
      .send({ otherUserId: u2._id.toString() });

    expect(res.status).toBe(201);
    expect(res.body.chatId).toBeTruthy();
    expect(res.body.otherUserId.toString()).toBe(u2._id.toString());
  });

  it("returns existing chat (200) when a chat already exists between the users", async () => {
    const res = await request(app)
      .post("/api/chats")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ otherUserId: userB._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.chatId.toString()).toBe(chat._id.toString());
  });

  it("returns 403 when users are not matched", async () => {
    const stranger = await createUser({ email: "stranger@chat.com" });

    const res = await request(app)
      .post("/api/chats")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ otherUserId: stranger._id.toString() });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 for an invalid otherUserId", async () => {
    const res = await request(app)
      .post("/api/chats")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ otherUserId: "not-a-valid-id" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app)
      .post("/api/chats")
      .send({ otherUserId: userB._id.toString() });

    expect(res.status).toBe(401);
  });
});

// ─── sendMessage ─────────────────────────────────────────────────────────────

describe("POST /api/chats/:chatId/messages", () => {
  it("sends a message → 201 with messageId and content", async () => {
    const res = await request(app)
      .post(`/api/chats/${chat._id}/messages`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ content: "Hello there!" });

    expect(res.status).toBe(201);
    expect(res.body.messageId).toBeTruthy();
    expect(res.body.content).toBe("Hello there!");
    expect(res.body.senderId.toString()).toBe(userA._id.toString());
  });

  it("returns 400 for empty content", async () => {
    const res = await request(app)
      .post(`/api/chats/${chat._id}/messages`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ content: "   " });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 for an invalid chatId", async () => {
    const res = await request(app)
      .post("/api/chats/not-a-valid-id/messages")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ content: "Hello" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 404 when user is not a participant in the chat", async () => {
    const outsider = await createUser({ email: "outsider@chat.com" });

    const res = await request(app)
      .post(`/api/chats/${chat._id}/messages`)
      .set("Authorization", `Bearer ${signToken(outsider._id)}`)
      .send({ content: "Can I join?" });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app)
      .post(`/api/chats/${chat._id}/messages`)
      .send({ content: "Hello" });

    expect(res.status).toBe(401);
  });
});

// ─── deleteMessage ────────────────────────────────────────────────────────────

describe("DELETE /api/chats/:chatId/messages/:messageId", () => {
  let sentMessageId;

  beforeEach(async () => {
    // Send a message to get a real messageId
    const res = await request(app)
      .post(`/api/chats/${chat._id}/messages`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ content: "To be deleted" });
    sentMessageId = res.body.messageId;
  });

  it("soft-deletes own message → 200 and sets deletedAt in DB", async () => {
    const res = await request(app)
      .delete(`/api/chats/${chat._id}/messages/${sentMessageId}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const msg = await Message.findOne({ messageId: sentMessageId });
    expect(msg.deletedAt).not.toBeNull();
  });

  it("returns 403 when trying to delete another user's message", async () => {
    const res = await request(app)
      .delete(`/api/chats/${chat._id}/messages/${sentMessageId}`)
      .set("Authorization", `Bearer ${tokenB}`); // B tries to delete A's message

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("returns 404 for a non-existent messageId", async () => {
    const res = await request(app)
      .delete(`/api/chats/${chat._id}/messages/nonexistent-msg-id`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app).delete(
      `/api/chats/${chat._id}/messages/${sentMessageId}`
    );

    expect(res.status).toBe(401);
  });
});
