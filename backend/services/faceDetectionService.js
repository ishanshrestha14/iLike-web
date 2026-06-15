/**
 * @fileoverview Server-side face detection gate using TinyFaceDetector.
 *
 * Detection engine: @vladmandic/face-api + @tensorflow/tfjs-node CPU backend.
 * Image decoding: tf.node.decodeImage — no `canvas` native dependency needed.
 *
 * Why tf.node.decodeImage instead of canvas?
 *   The `canvas` npm package requires Cairo/Pango system libraries and a native
 *   compile step that breaks on newer Node versions without those libs installed.
 *   @tensorflow/tfjs-node bundles its own libjpeg/libpng and exposes
 *   tf.node.decodeImage(), giving us JPEG/PNG → Tensor3D with zero extra deps.
 *
 * Phase 5 swap note:
 *   This file is the only file that changes when we migrate to native OpenCV
 *   in Docker. The detectFace / preloadFaceDetectionModel interface is
 *   intentionally stable — no controller changes required.
 *
 * Upload pipeline position:
 *   multer (Buffer in memory)
 *     → detectFace()           ← this module
 *     → uploadToCloudinary()
 *     → URL saved to DB
 *         ↓ false
 *     400 Bad Request           ← rejected before any Cloudinary cost
 */

import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

// @tensorflow/tfjs-node@4.22.0 calls util.isNullOrUndefined(), which Node.js
// removed in v22+. Patching it here via createRequire (CJS exports object is
// mutable; ESM namespace objects are frozen and reject direct assignment).
// Remove once tfjs-node ships a version that no longer uses this function.
try {
  const _require = createRequire(import.meta.url);
  const _util = _require("util");
  if (typeof _util.isNullOrUndefined !== "function") {
    _util.isNullOrUndefined = (v) => v === null || v === undefined;
  }
} catch (_) {
  // In environments where patching isn't needed or possible, continue silently.
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * TinyFaceDetector weights bundled inside the npm package.
 *
 * Path from backend/services/ → ../node_modules/ (backend/node_modules/).
 * NOT ../../node_modules — that would overshoot to the monorepo root.
 */
const MODELS_PATH = path.resolve(
  __dirname,
  "../node_modules/@vladmandic/face-api/model"
);

/** Minimum detection confidence [0–1]. */
const SCORE_THRESHOLD = 0.5;

/**
 * Lazily-loaded module references.
 * Populated on first real detectFace() call; null until then.
 * This avoids Vite resolving native packages at transform time — which would
 * crash test suites where those packages aren't installed.
 *
 * @type {typeof import("@tensorflow/tfjs-node") | null}
 */
let _tf = null;
/** @type {typeof import("@vladmandic/face-api") | null} */
let _faceapi = null;

/**
 * Dynamically imports @tensorflow/tfjs-node and @vladmandic/face-api
 * the first time they are needed. Subsequent calls are no-ops.
 *
 * @returns {Promise<void>}
 */
async function ensureInitialized() {
  if (_faceapi) return;

  // tfjs-node must be imported first — it registers the CPU backend kernel.
  _tf = await import("@tensorflow/tfjs-node");
  _faceapi = await import("@vladmandic/face-api");
  // No monkeyPatch needed — we feed tensors directly, not DOM image elements.
}

/**
 * Singleton Promise for the init + model-load sequence.
 * Storing the Promise (not a boolean) means concurrent callers await the
 * same in-flight load rather than triggering parallel loadFromDisk calls.
 *
 * @type {Promise<void> | null}
 */
let modelLoadPromise = null;

/**
 * Ensures the TinyFaceDetector weights are loaded exactly once.
 * Idempotent and concurrency-safe.
 *
 * @returns {Promise<void>}
 */
async function ensureModelLoaded() {
  if (!modelLoadPromise) {
    modelLoadPromise = ensureInitialized().then(() =>
      _faceapi.nets.tinyFaceDetector.loadFromDisk(MODELS_PATH)
    );
  }
  return modelLoadPromise;
}

/**
 * Detects whether at least one human face is present in the image buffer.
 *
 * Flow:
 *   1. Buffer → tf.node.decodeImage() → Tensor3D (no canvas required)
 *   2. Tensor3D → TinyFaceDetector → Detection[]
 *   3. tensor.dispose() — releases GPU/CPU memory immediately
 *
 * Set SKIP_FACE_DETECTION=true to bypass (tests / envs without ML packages).
 * The bypass returns before any dynamic import executes.
 *
 * @param {Buffer} buffer - Raw JPEG or PNG image buffer from multer memoryStorage.
 * @returns {Promise<boolean>} true if ≥ 1 face detected above SCORE_THRESHOLD.
 * @throws {Error} If model weights are missing or the buffer cannot be decoded.
 */
export async function detectFace(buffer) {
  if (process.env.SKIP_FACE_DETECTION === "true") return true;

  await ensureModelLoaded();

  // tf.node.decodeImage returns a Tensor3D (H×W×C). Must be disposed after use.
  const tensor = _tf.node.decodeImage(new Uint8Array(buffer), 3);

  try {
    const options = new _faceapi.TinyFaceDetectorOptions({
      scoreThreshold: SCORE_THRESHOLD,
    });
    const detections = await _faceapi.detectAllFaces(tensor, options);
    return detections.length > 0;
  } finally {
    tensor.dispose();
  }
}

/**
 * Pre-warms the TinyFaceDetector model at server startup.
 * Call once in server.js so the first upload request isn't penalised by
 * model-load latency (~200–400ms on cold start).
 *
 * Fail-fast on error: silent skip would let unvalidated photos through.
 *
 * @returns {Promise<void>}
 */
export async function preloadFaceDetectionModel() {
  if (process.env.SKIP_FACE_DETECTION === "true") {
    console.warn("[FaceDetection] Model preload skipped (SKIP_FACE_DETECTION=true)");
    return;
  }

  try {
    await ensureModelLoaded();
    console.log("[FaceDetection] TinyFaceDetector model ready. Path:", MODELS_PATH);
  } catch (err) {
    console.error(
      "[FaceDetection] FATAL: Could not load model weights from:\n ",
      MODELS_PATH,
      "\n  Ensure `npm install` has been run inside the backend/ directory.\n",
      err
    );
    process.exit(1);
  }
}
