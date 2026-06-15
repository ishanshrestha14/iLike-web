/**
 * Integration tests for profileController.js against the REAL profile API.
 *
 * Uses the global in-memory MongoDB from setup.js (no self-managed connection)
 * and the shared helpers, matching matchController.test.js. SKIP_FACE_DETECTION
 * and SKIP_NSFW_MODERATION are set globally by setup.js, so the upload gates are
 * bypassed here — these tests exercise the controller logic, not the ML models.
 *
 * Routes under test (see routes/profileRoutes.js):
 *   GET  /api/profile/me
 *   POST /api/profile/setup
 *   PUT  /api/profile/update
 *
 * Note on rate limiting: uploadLimiter (max 10 / 15-min window, shared in-memory
 * across the test process) guards /setup and /update. Preconditions are created
 * directly via Profile.create to keep authenticated upload-route HTTP calls well
 * under that cap. Unauthenticated requests 401 at verifyToken before the limiter.
 */

import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../server.js";
import Profile from "../../models/Profile.js";
import { createUser, createProfile, signToken } from "../helpers.js";

let user, token;

beforeEach(async () => {
  user = await createUser({ name: "Profile User", email: "p@test.com" });
  token = signToken(user._id);
});

/** A complete, valid setup payload. photoUrls uses a legacy /uploads/ path,
 *  which isValidPhotoUrl accepts — satisfying the "at least one photo"
 *  requirement without uploading a real file. */
const validSetup = {
  name: "Alice",
  gender: "Female",
  location: "Test City",
  intentions: ["Long-term relationship"],
  age: 25,
  bio: "Test bio for the profile controller",
  interests: ["Reading", "Music"],
  height: "5'6\"",
  photoUrls: ["/uploads/test.jpg"],
};

describe("GET /api/profile/me", () => {
  it("returns 404 when the user has no profile", async () => {
    const res = await request(app)
      .get("/api/profile/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not found/i);
  });

  it("returns the profile when it exists", async () => {
    await createProfile(user._id, { name: "Alice", bio: "Hello world" });

    const res = await request(app)
      .get("/api/profile/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Alice");
    expect(res.body.data.bio).toBe("Hello world");
  });

  it("returns 401 without an auth token", async () => {
    const res = await request(app).get("/api/profile/me");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/profile/setup", () => {
  it("creates a profile with valid data and returns a fresh token", async () => {
    const res = await request(app)
      .post("/api/profile/setup")
      .set("Authorization", `Bearer ${token}`)
      .send(validSetup);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe(validSetup.name);
    expect(res.body.data.isProfileComplete).toBe(true);
    expect(res.body.token).toBeTruthy();

    const saved = await Profile.findOne({ userId: user._id });
    expect(saved).not.toBeNull();
    expect(saved.age).toBe(25);
    expect(saved.photoUrls).toContain("/uploads/test.jpg");
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await request(app)
      .post("/api/profile/setup")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Only a name" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/required/i);
  });

  it("returns 401 without an auth token", async () => {
    const res = await request(app).post("/api/profile/setup").send(validSetup);
    expect(res.status).toBe(401);
  });
});

describe("PUT /api/profile/update", () => {
  it("updates an allowed field on an existing profile", async () => {
    await createProfile(user._id, { name: "Alice", bio: "Original bio" });

    const res = await request(app)
      .put("/api/profile/update")
      .set("Authorization", `Bearer ${token}`)
      .send({ bio: "Updated bio" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.bio).toBe("Updated bio");

    const saved = await Profile.findOne({ userId: user._id });
    expect(saved.bio).toBe("Updated bio");
  });

  it("returns 404 when the user has no profile to update", async () => {
    const stranger = await createUser({ email: "stranger@test.com" });
    const strangerToken = signToken(stranger._id);

    const res = await request(app)
      .put("/api/profile/update")
      .set("Authorization", `Bearer ${strangerToken}`)
      .send({ bio: "Nothing to update" });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not found/i);
  });
});
