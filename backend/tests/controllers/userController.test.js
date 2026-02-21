import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../server.js";
import User from "../../models/user.js";
import { createUser, signToken } from "../helpers.js";

// setup.js (loaded via vitest setupFiles) handles MongoDB Memory Server lifecycle.
// beforeEach in setup.js clears all collections between tests.

describe("POST /api/users/register", () => {
  it("returns 201 with user data and sets refreshToken cookie for valid payload", async () => {
    const res = await request(app)
      .post("/api/users/register")
      .send({ name: "Alice", email: "alice@test.com", password: "Password123" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe("alice@test.com");
    expect(res.body.user).not.toHaveProperty("password");

    const cookies = res.headers["set-cookie"];
    expect(Array.isArray(cookies)).toBe(true);
    expect(cookies.some((c) => c.startsWith("refreshToken="))).toBe(true);
  });

  it("returns 400 for duplicate email", async () => {
    await createUser({ email: "dup@test.com" });

    const res = await request(app)
      .post("/api/users/register")
      .send({ name: "Bob", email: "dup@test.com", password: "Password123" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 when name is missing", async () => {
    const res = await request(app)
      .post("/api/users/register")
      .send({ email: "noname@test.com", password: "Password123" });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined(); // express-validator format
  });

  it("returns 400 for an invalid email format", async () => {
    const res = await request(app)
      .post("/api/users/register")
      .send({ name: "Charlie", email: "not-an-email", password: "Password123" });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it("returns 400 for a password shorter than 8 characters", async () => {
    const res = await request(app)
      .post("/api/users/register")
      .send({ name: "Dave", email: "dave@test.com", password: "abc" });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });
});

describe("POST /api/users/login", () => {
  it("returns 200 with token and sets refreshToken cookie for valid credentials", async () => {
    await createUser({ email: "login@test.com" }); // default plainPassword: 'Password123'

    const res = await request(app)
      .post("/api/users/login")
      .send({ email: "login@test.com", password: "Password123" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeTruthy();

    const cookies = res.headers["set-cookie"];
    expect(Array.isArray(cookies)).toBe(true);
    expect(cookies.some((c) => c.startsWith("refreshToken="))).toBe(true);
  });

  it("returns 401 for a wrong password", async () => {
    await createUser({ email: "wrongpw@test.com" });

    const res = await request(app)
      .post("/api/users/login")
      .send({ email: "wrongpw@test.com", password: "WrongPassword99" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 for a non-existent email", async () => {
    const res = await request(app)
      .post("/api/users/login")
      .send({ email: "ghost@test.com", password: "Password123" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 for a deleted account", async () => {
    const user = await createUser({ email: "deleted@test.com" });
    await User.findByIdAndUpdate(user._id, { deletedAccount: true });

    const res = await request(app)
      .post("/api/users/login")
      .send({ email: "deleted@test.com", password: "Password123" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe("DELETE /api/users/me", () => {
  it("soft-deletes the account when the correct password is provided", async () => {
    const user = await createUser({ email: "todelete@test.com" });
    const token = signToken(user._id);

    const res = await request(app)
      .delete("/api/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ password: "Password123" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify tombstone in DB
    const tombstone = await User.findById(user._id);
    expect(tombstone.deletedAccount).toBe(true);
    expect(tombstone.name).toBe("Deleted Account");
  });

  it("returns 400 when the password field is missing from the request body", async () => {
    const user = await createUser({ email: "nopw@test.com" });
    const token = signToken(user._id);

    const res = await request(app)
      .delete("/api/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 for a wrong password", async () => {
    const user = await createUser({ email: "badpw@test.com" });
    const token = signToken(user._id);

    const res = await request(app)
      .delete("/api/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ password: "WrongPassword99" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 when no auth token is provided", async () => {
    const res = await request(app)
      .delete("/api/users/me")
      .send({ password: "Password123" });

    expect(res.status).toBe(401);
  });
});
