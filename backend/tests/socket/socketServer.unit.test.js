/**
 * Unit tests for the Socket.IO Redis-adapter wiring and cross-instance
 * notification routing.
 *
 * The Redis adapter library and the adapter-client factory are mocked, so these
 * verify our logic — not the third-party adapter — with no Redis server.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks (hoisted before socketServer.js is imported) ───────────────────────

vi.mock("@socket.io/redis-adapter", () => ({
  createAdapter: vi.fn(() => "MOCK_ADAPTER"),
}));

vi.mock("../../utils/redisClient.js", () => ({
  createAdapterClients: vi.fn(),
}));

import SocketServer, { attachRedisAdapter } from "../../socket/socketServer.js";
import { createAdapter } from "@socket.io/redis-adapter";
import { createAdapterClients } from "../../utils/redisClient.js";

beforeEach(() => vi.clearAllMocks());

// ── attachRedisAdapter ───────────────────────────────────────────────────────

describe("attachRedisAdapter", () => {
  it("attaches the Redis adapter when client pair is available", () => {
    const pubClient = { id: "pub" };
    const subClient = { id: "sub" };
    vi.mocked(createAdapterClients).mockReturnValue({ pubClient, subClient });
    const io = { adapter: vi.fn() };

    const attached = attachRedisAdapter(io);

    expect(attached).toBe(true);
    expect(createAdapter).toHaveBeenCalledWith(pubClient, subClient);
    expect(io.adapter).toHaveBeenCalledWith("MOCK_ADAPTER");
  });

  it("no-ops (single-instance) when Redis is unavailable", () => {
    vi.mocked(createAdapterClients).mockReturnValue(null);
    const io = { adapter: vi.fn() };

    const attached = attachRedisAdapter(io);

    expect(attached).toBe(false);
    expect(createAdapter).not.toHaveBeenCalled();
    expect(io.adapter).not.toHaveBeenCalled();
  });
});

// ── sendToUser ───────────────────────────────────────────────────────────────
//
// Invoked against a fake `this` so we don't construct a whole Socket.IO server.
// The behaviour under test is purely that it targets the per-user room.

describe("sendToUser", () => {
  it("emits to the user_{id} room so the adapter routes cross-instance", () => {
    const emit = vi.fn();
    const io = { to: vi.fn().mockReturnValue({ emit }) };

    SocketServer.prototype.sendToUser.call({ io }, "abc123", "new_notification", {
      count: 1,
    });

    expect(io.to).toHaveBeenCalledWith("user_abc123");
    expect(emit).toHaveBeenCalledWith("new_notification", { count: 1 });
  });

  it("does not depend on the local userSockets map", () => {
    const emit = vi.fn();
    const io = { to: vi.fn().mockReturnValue({ emit }) };
    // `this` has an EMPTY userSockets map — delivery must still happen via room.
    const ctx = { io, userSockets: new Map() };

    SocketServer.prototype.sendToUser.call(ctx, "offline-locally", "evt", {});

    expect(io.to).toHaveBeenCalledWith("user_offline-locally");
    expect(emit).toHaveBeenCalledWith("evt", {});
  });
});
