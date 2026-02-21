import User from "../models/User.js";
import Profile from "../models/Profile.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

/**
 * Create a real user in the in-memory test DB.
 * @param {object} overrides - Fields to override on the default user.
 *   Use overrides.plainPassword to control the password (default: 'Password123').
 *   All other overrides are spread directly onto the User document.
 */
export async function createUser(overrides = {}) {
  const { plainPassword = "Password123", ...rest } = overrides;
  const hashedPassword = await bcrypt.hash(plainPassword, 10);
  return User.create({
    name: "Test User",
    email: `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
    password: hashedPassword,
    ...rest,
  });
}

/**
 * Sign a valid 15-minute JWT for the given userId.
 */
export function signToken(userId) {
  return jwt.sign({ id: userId.toString() }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });
}

/**
 * Create a completed Profile for the given userId (required by likeUser route).
 */
export async function createProfile(userId, overrides = {}) {
  return Profile.create({
    userId,
    name: "Test Profile",
    gender: "Female",
    location: "Test City",
    intentions: ["Long-term relationship"],
    age: 25,
    bio: "Test bio for integration tests",
    interests: ["Reading"],
    height: "5'6\"",
    photoUrls: ["/uploads/test.jpg"],
    isProfileComplete: true,
    ...overrides,
  });
}

/**
 * Sign an already-expired JWT for the given userId.
 */
export function expiredToken(userId) {
  const pastTimestamp = Math.floor(Date.now() / 1000) - 60; // expired 60s ago
  return jwt.sign(
    { id: userId.toString(), exp: pastTimestamp },
    process.env.JWT_SECRET,
  );
}
