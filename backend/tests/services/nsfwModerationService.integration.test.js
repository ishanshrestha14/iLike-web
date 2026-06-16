/**
 * Integration tests for nsfwModerationService.js
 *
 * These tests load the REAL nsfwjs model and run genuine inference against
 * fixture images. No mocks — this validates the full ML pipeline.
 *
 * ── Scope note: only the SAFE path is exercised here ─────────────────────────
 *   We deliberately do NOT commit explicit (Porn/Hentai) fixtures to the repo.
 *   The unsafe branch and the threshold policy are fully covered by the unit
 *   tests via mocked predictions. These integration tests confirm that real,
 *   non-explicit photos (the same fixtures used by face detection) are
 *   correctly classified as SAFE — i.e. no false positives that would block
 *   legitimate users.
 *
 * Prerequisites:
 *   1. Run `npm install` inside backend/ (installs nsfwjs with bundled model
 *      weights and @tensorflow/tfjs-node native bindings).
 *   2. The shared fixtures live in backend/tests/fixtures/ (face.jpeg etc.).
 *
 * ── Running ───────────────────────────────────────────────────────────────────
 *
 *   # Integration tests only (allow ~5–10s for TF warm-up):
 *   npx vitest run tests/services/nsfwModerationService.integration.test.js
 *
 *   # Full suite (unit + integration):
 *   npx vitest run
 *
 * Both the native packages AND fixture images must be present; otherwise every
 * test is skipped with a descriptive console warning — no hard failure.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Guard 1: native package availability ─────────────────────────────────────

const BACKEND_ROOT = path.resolve(__dirname, "../..");

function packageInstalled(name) {
  return fs.existsSync(path.join(BACKEND_ROOT, "node_modules", name));
}

const nativeDepsInstalled =
  packageInstalled("@tensorflow/tfjs-node") && packageInstalled("nsfwjs");

if (!nativeDepsInstalled) {
  console.warn(
    "\n[NsfwModeration Integration] Skipping — native packages not installed.\n" +
    "  Run: cd backend && npm install\n"
  );
}

// ── Guard 2: fixture image availability ──────────────────────────────────────

const FIXTURES = path.resolve(__dirname, "../fixtures");

const FIXTURE = {
  face: path.join(FIXTURES, "face.jpeg"),
  noFace: path.join(FIXTURES, "no-face.jpeg"),
  multipleFaces: path.join(FIXTURES, "multiple-faces.jpeg"),
};

const allFixturesPresent = Object.values(FIXTURE).every((f) => fs.existsSync(f));

if (nativeDepsInstalled && !allFixturesPresent) {
  const missing = Object.entries(FIXTURE)
    .filter(([, p]) => !fs.existsSync(p))
    .map(([key, p]) => `  ${key}: ${path.relative(process.cwd(), p)}`);

  console.warn(
    `\n[NsfwModeration Integration] Skipping — missing fixture image(s):\n${missing.join("\n")}\n`
  );
}

const shouldRun = nativeDepsInstalled && allFixturesPresent;

// ── Tests ─────────────────────────────────────────────────────────────────────
//
// moderateImage is dynamically imported inside beforeAll rather than at the top
// of the file. A static top-level import would be evaluated (and fail) even
// when describe.runIf() would skip the suite.

describe.runIf(shouldRun)("nsfwModerationService — real inference", () => {
  /** @type {import("../../services/nsfwModerationService.js").moderateImage} */
  let moderateImage;

  beforeAll(async () => {
    // setup.js sets SKIP_NSFW_MODERATION=true globally. Clear it here so this
    // suite exercises real ML inference.
    delete process.env.SKIP_NSFW_MODERATION;

    ({ moderateImage } = await import("../../services/nsfwModerationService.js"));

    // Pre-warm the singleton model so test timings reflect inference only,
    // not the TF initialisation cost.
    await moderateImage(fs.readFileSync(FIXTURE.face));
  }, 30_000);

  afterAll(() => {
    delete process.env.SKIP_NSFW_MODERATION;
  });

  it("classifies a normal headshot as safe", async () => {
    const result = await moderateImage(fs.readFileSync(FIXTURE.face));
    expect(result.isSafe).toBe(true);
    expect(result.scores).toHaveProperty("Neutral");
  }, 10_000);

  it("classifies a landscape/no-face photo as safe", async () => {
    expect((await moderateImage(fs.readFileSync(FIXTURE.noFace))).isSafe).toBe(true);
  }, 10_000);

  it("classifies a group photo as safe", async () => {
    expect((await moderateImage(fs.readFileSync(FIXTURE.multipleFaces))).isSafe).toBe(true);
  }, 10_000);

  it("returns a safe result for any buffer when SKIP_NSFW_MODERATION=true", async () => {
    process.env.SKIP_NSFW_MODERATION = "true";
    const result = await moderateImage(Buffer.from("not-an-image"));
    expect(result.isSafe).toBe(true);
    delete process.env.SKIP_NSFW_MODERATION;
  });
});
