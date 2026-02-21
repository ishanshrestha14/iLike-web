import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { authenticateToken } from "../../middleware/auth.js";
import User from "../../models/User.js";
import { createUser, signToken, expiredToken } from "../helpers.js";

// Minimal test app — avoids importing the full server (and its DB/listen side effects)
const app = express();
app.use(express.json());
app.get("/protected", authenticateToken, (req, res) => {
  res.json({ userId: req.userId, userName: req.user.name });
});

describe("authenticateToken middleware", () => {
  it("calls next() and sets req.userId + req.user for a valid token", async () => {
    const user = await createUser({ name: "Alice" });
    const token = signToken(user._id);

    const res = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(user._id.toString());
    expect(res.body.userName).toBe("Alice");
  });

  it("returns 401 when Authorization header is missing", async () => {
    const res = await request(app).get("/protected");
    expect(res.status).toBe(401);
  });

  it("returns 401 when header is present but missing 'Bearer ' prefix", async () => {
    const user = await createUser();
    const token = signToken(user._id);

    const res = await request(app)
      .get("/protected")
      .set("Authorization", token); // no "Bearer " prefix

    expect(res.status).toBe(401);
  });

  it("returns 401 for a random garbage token string", async () => {
    const res = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer this.is.not.a.valid.jwt");

    expect(res.status).toBe(401);
  });

  it("returns 401 for an expired JWT", async () => {
    const user = await createUser();
    const token = expiredToken(user._id);

    // Small delay to ensure the 1ms token has expired
    await new Promise((r) => setTimeout(r, 10));

    const res = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(401);
  });

  it("returns 401 when the user account has deletedAccount: true", async () => {
    const user = await createUser();
    const token = signToken(user._id);

    // Soft-delete the user after signing the token
    await User.findByIdAndUpdate(user._id, { deletedAccount: true });

    const res = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(401);
  });
});
