/**
 * Integration test for the Socket.IO Redis adapter against a REAL Redis.
 *
 * Proves the multi-instance promise: two independent Socket.IO servers wired to
 * the same Redis fan out room emits to each other. A client connected to server
 * B receives an event emitted from server A.
 *
 * Auto-skips unless BOTH are available:
 *   - a reachable Redis (REDIS_URL or redis://localhost:6379)
 *   - the optional `socket.io-client` dev dependency
 * so it never hard-fails in CI. To run it:
 *   npm i -D socket.io-client && REDIS_URL=redis://localhost:6379 \
 *     npx vitest run tests/socket/socketServer.integration.test.js
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Redis from "ioredis";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.resolve(__dirname, "../..");
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const clientInstalled = fs.existsSync(
  path.join(BACKEND_ROOT, "node_modules", "socket.io-client")
);

let redisAvailable = false;
{
  const probe = new Redis(REDIS_URL, {
    lazyConnect: true,
    connectTimeout: 1000,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });
  probe.on("error", () => {});
  try {
    await probe.connect();
    await probe.ping();
    redisAvailable = true;
  } catch {
    // unreachable — suite skips
  } finally {
    probe.disconnect();
  }
}

const shouldRun = redisAvailable && clientInstalled;

if (!shouldRun) {
  console.warn(
    `\n[Socket.IO Adapter Integration] Skipping — ${
      !redisAvailable ? `no Redis at ${REDIS_URL}` : "socket.io-client not installed"
    }.\n`
  );
}

describe.runIf(shouldRun)("Socket.IO Redis adapter — cross-instance", () => {
  let httpA, httpB, ioA, ioB, clients, clientSocket;

  beforeAll(async () => {
    const { createServer } = await import("http");
    const { Server } = await import("socket.io");
    const { createAdapter } = await import("@socket.io/redis-adapter");
    const { io: ioClient } = await import("socket.io-client");

    process.env.REDIS_URL = REDIS_URL;
    const { createAdapterClients } = await import("../../utils/redisClient.js");

    const pairA = createAdapterClients();
    const pairB = createAdapterClients();
    clients = [pairA, pairB];

    httpA = createServer();
    httpB = createServer();
    ioA = new Server(httpA);
    ioB = new Server(httpB);
    ioA.adapter(createAdapter(pairA.pubClient, pairA.subClient));
    ioB.adapter(createAdapter(pairB.pubClient, pairB.subClient));

    // Server B places every connecting socket into the target room.
    ioB.on("connection", (socket) => socket.join("user_test"));

    const portB = await new Promise((resolve) =>
      httpB.listen(0, () => resolve(httpB.address().port))
    );
    await new Promise((resolve) => httpA.listen(0, resolve));

    clientSocket = ioClient(`http://localhost:${portB}`);
    await new Promise((resolve) => clientSocket.on("connect", resolve));
    // Give the adapter a moment to register the room subscription.
    await new Promise((r) => setTimeout(r, 200));
  }, 30_000);

  afterAll(async () => {
    clientSocket?.close();
    ioA?.close();
    ioB?.close();
    httpA?.close();
    httpB?.close();
    for (const pair of clients ?? []) {
      pair?.pubClient.disconnect();
      pair?.subClient.disconnect();
    }
  });

  it("delivers a room emit from server A to a client on server B", async () => {
    const received = new Promise((resolve) =>
      clientSocket.on("cross_evt", resolve)
    );

    // Emit from the OTHER instance — only the Redis adapter makes this reach B.
    ioA.to("user_test").emit("cross_evt", { hello: "world" });

    const payload = await Promise.race([
      received,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timed out waiting for cross_evt")), 5000)
      ),
    ]);

    expect(payload).toEqual({ hello: "world" });
  }, 10_000);
});
