/**
 * Integration tests for faceDetectionService.js
 *
 * These tests load the REAL @vladmandic/face-api model and run genuine inference
 * against fixture images. No mocks — this validates the full ML pipeline.
 *
 * Prerequisites:
 *   1. Run `npm install` inside backend/ (installs @vladmandic/face-api with
 *      bundled model weights and @tensorflow/tfjs-node native bindings).
 *   2. Place the three fixture images below in backend/tests/fixtures/.
 *      No system libraries needed — canvas is not a dependency anymore.
 *
 * ── Fixture images required ──────────────────────────────────────────────────
 *
 *   backend/tests/fixtures/
 *
 *   face.jpg
 *     A single, clear front-facing headshot. The face should fill most of the
 *     frame with good lighting. Aim for confidence ≥ 0.7.
 *     Source: your own photo, or any royalty-free portrait on https://unsplash.com.
 *
 *   no-face.jpg
 *     An image that contains ZERO human faces — a landscape or food photo works.
 *     Source: any non-portrait image from https://unsplash.com.
 *
 *   multiple-faces.jpg
 *     A group photo with ≥ 2 clearly visible faces. Verifies the service
 *     returns true (not false) for multi-person photos.
 *     Source: any group shot on https://unsplash.com.
 *
 * ── Running ───────────────────────────────────────────────────────────────────
 *
 *   # Integration tests only (allow ~5–10s for TF warm-up):
 *   npx vitest run tests/services/faceDetectionService.integration.test.js
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
  packageInstalled("@tensorflow/tfjs-node") &&
  packageInstalled("@vladmandic/face-api");

if (!nativeDepsInstalled) {
  console.warn(
    "\n[FaceDetection Integration] Skipping — native packages not installed.\n" +
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
    `\n[FaceDetection Integration] Skipping — missing fixture image(s):\n${missing.join("\n")}\n` +
    "  See the file header for instructions on which images to source.\n"
  );
}

const shouldRun = nativeDepsInstalled && allFixturesPresent;

// ── Tests ─────────────────────────────────────────────────────────────────────
//
// detectFace is dynamically imported inside beforeAll rather than at the top
// of the file. A static top-level import would be evaluated (and fail) even
// when describe.runIf() would skip the suite.
//
// Raw fs.readFileSync() buffers are passed directly — tf.node.decodeImage
// handles JPEG/PNG decoding internally, no canvas required.

describe.runIf(shouldRun)("faceDetectionService — real inference", () => {
  /** @type {import("../../services/faceDetectionService.js").detectFace} */
  let detectFace;

  beforeAll(async () => {
    // setup.js sets SKIP_FACE_DETECTION=true globally. Clear it here so this
    // suite exercises real ML inference.
    delete process.env.SKIP_FACE_DETECTION;

    ({ detectFace } = await import("../../services/faceDetectionService.js"));

    // Pre-warm the singleton model so test timings reflect inference only,
    // not the ~200–400ms TF initialisation cost.
    await detectFace(fs.readFileSync(FIXTURE.face));
  }, 30_000);

  afterAll(() => {
    delete process.env.SKIP_FACE_DETECTION;
  });

  it("returns true for a single clear face photo", async () => {
    expect(await detectFace(fs.readFileSync(FIXTURE.face))).toBe(true);
  }, 10_000);

  it("returns false for an image with no human faces", async () => {
    expect(await detectFace(fs.readFileSync(FIXTURE.noFace))).toBe(false);
  }, 10_000);

  it("returns true for a group photo with multiple faces", async () => {
    expect(await detectFace(fs.readFileSync(FIXTURE.multipleFaces))).toBe(true);
  }, 10_000);

  it("returns true for any buffer when SKIP_FACE_DETECTION=true", async () => {
    process.env.SKIP_FACE_DETECTION = "true";
    expect(await detectFace(Buffer.from("not-an-image"))).toBe(true);
    delete process.env.SKIP_FACE_DETECTION;
  });
});
