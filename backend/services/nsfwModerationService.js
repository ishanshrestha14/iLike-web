/**
 * @fileoverview Server-side NSFW image moderation gate.
 *
 * Classification engine: nsfwjs (MobileNetV2) on the @tensorflow/tfjs-node CPU
 * backend. The model weights are bundled inside the nsfwjs package and loaded
 * from memory — no runtime download and no extra native dependency beyond the
 * tfjs-node we already ship for face detection.
 *
 * Why nsfwjs (classification) rather than a YOLO detector?
 *   A moderation gate needs a single whole-image safe/unsafe verdict, not
 *   bounding boxes. nsfwjs returns probabilities across five classes
 *   (Drawing / Hentai / Neutral / Porn / Sexy) which maps directly onto a
 *   policy decision. It also rides the exact same tfjs-node backend and the
 *   same tf.node.decodeImage path as faceDetectionService — one shared,
 *   deduped @tensorflow/tfjs-core instance, no second ML runtime.
 *
 * Phase 5 swap note:
 *   This file is the only file that changes if we migrate to a native YOLO /
 *   OpenCV moderation engine in Docker. The moderateImage /
 *   preloadNsfwModel interface is intentionally stable — no controller changes
 *   required. Mirrors faceDetectionService by design.
 *
 * Upload pipeline position (runs in parallel with detectFace):
 *   multer (Buffer in memory)
 *     → detectFace() && moderateImage()   ← gates
 *     → uploadToCloudinary()
 *     → URL saved to DB
 *         ↓ unsafe
 *     400 Bad Request                      ← rejected before any Cloudinary cost
 */

import { createRequire } from "module";

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

/**
 * Bundled nsfwjs model to load. "MobileNetV2" resolves to weights embedded in
 * the nsfwjs package (loaded from memory). Passing the name explicitly avoids
 * the library's default-model console.info notice.
 */
const MODEL_NAME = "MobileNetV2";

/**
 * Rejection policy. A photo is unsafe if any explicit class crosses its
 * threshold. "Sexy" is held to a higher bar than "Porn"/"Hentai" because a
 * dating app reasonably permits suggestive-but-clothed photos.
 *
 * Tune these constants to make moderation stricter or more lenient.
 */
const THRESHOLDS = {
  Porn: 0.7,
  Hentai: 0.7,
  Sexy: 0.85,
};

/**
 * Lazily-loaded module references.
 * Populated on first real moderateImage() call; null until then.
 * Deferring the imports keeps Vite from resolving native packages at transform
 * time, which would crash test suites where those packages aren't installed.
 *
 * @type {typeof import("@tensorflow/tfjs-node") | null}
 */
let _tf = null;
/** @type {typeof import("nsfwjs") | null} */
let _nsfwjs = null;
/** Loaded NSFWJS model instance. @type {import("nsfwjs").NSFWJS | null} */
let _model = null;

/**
 * Dynamically imports @tensorflow/tfjs-node and nsfwjs the first time they are
 * needed. Subsequent calls are no-ops.
 *
 * tfjs-node must be imported first: it registers the "tensorflow" CPU backend
 * on the shared tfjs-core instance that nsfwjs's "@tensorflow/tfjs" import also
 * uses. Because all @tensorflow/* packages dedupe to a single tfjs-core, the
 * node backend and tensors produced by tf.node.decodeImage are visible to the
 * model. Without this ordering, classification would fall back to a slow/absent
 * backend.
 *
 * @returns {Promise<void>}
 */
async function ensureInitialized() {
  if (_nsfwjs) return;

  _tf = await import("@tensorflow/tfjs-node");
  await _tf.ready(); // ensure the node backend is registered + active
  _nsfwjs = await import("nsfwjs");
}

/**
 * Singleton Promise for the init + model-load sequence.
 * Storing the Promise (not a boolean) means concurrent callers await the same
 * in-flight load rather than triggering parallel nsfwjs.load() calls.
 *
 * @type {Promise<void> | null}
 */
let modelLoadPromise = null;

/**
 * Ensures the nsfwjs model is loaded exactly once.
 * Idempotent and concurrency-safe.
 *
 * @returns {Promise<void>}
 */
async function ensureModelLoaded() {
  if (!modelLoadPromise) {
    modelLoadPromise = ensureInitialized().then(async () => {
      _model = await _nsfwjs.load(MODEL_NAME);
    });
  }
  return modelLoadPromise;
}

/**
 * @typedef {Object} ModerationResult
 * @property {boolean} isSafe        - false if any class crossed its threshold.
 * @property {string}  classification - Highest-probability class label.
 * @property {Record<string, number>} scores - Per-class probabilities [0–1].
 */

/**
 * Classifies an image buffer and decides whether it is safe to publish.
 *
 * Flow:
 *   1. Buffer → tf.node.decodeImage() → Tensor3D (no canvas required)
 *   2. Tensor3D → nsfwjs.classify() → [{ className, probability }, ...]
 *   3. tensor.dispose() — releases memory immediately
 *   4. Apply THRESHOLDS to produce a safe/unsafe verdict
 *
 * Set SKIP_NSFW_MODERATION=true to bypass (tests / envs without ML packages).
 * The bypass returns before any dynamic import executes.
 *
 * @param {Buffer} buffer - Raw JPEG or PNG image buffer from multer memoryStorage.
 * @returns {Promise<ModerationResult>}
 * @throws {Error} If model weights are missing or the buffer cannot be decoded.
 */
export async function moderateImage(buffer) {
  if (process.env.SKIP_NSFW_MODERATION === "true") {
    return { isSafe: true, classification: "Skipped", scores: {} };
  }

  await ensureModelLoaded();

  // tf.node.decodeImage returns a Tensor3D (H×W×C). Must be disposed after use.
  const tensor = _tf.node.decodeImage(new Uint8Array(buffer), 3);

  try {
    const predictions = await _model.classify(tensor);

    /** @type {Record<string, number>} */
    const scores = {};
    for (const { className, probability } of predictions) {
      scores[className] = probability;
    }

    // predictions are sorted desc by probability; [0] is the top class.
    const classification = predictions[0]?.className ?? "Unknown";

    const isSafe = !Object.entries(THRESHOLDS).some(
      ([cls, limit]) => (scores[cls] ?? 0) >= limit
    );

    return { isSafe, classification, scores };
  } finally {
    tensor.dispose();
  }
}

/**
 * Pre-warms the nsfwjs model at server startup so the first upload request
 * isn't penalised by model-load latency.
 *
 * Fail-fast on error: a silent skip would let unmoderated photos through.
 *
 * @returns {Promise<void>}
 */
export async function preloadNsfwModel() {
  if (process.env.SKIP_NSFW_MODERATION === "true") {
    console.warn(
      "[NsfwModeration] Model preload skipped (SKIP_NSFW_MODERATION=true)"
    );
    return;
  }

  try {
    await ensureModelLoaded();
    console.log("[NsfwModeration] nsfwjs model ready. Model:", MODEL_NAME);
  } catch (err) {
    console.error(
      "[NsfwModeration] FATAL: Could not load nsfwjs model.\n",
      "  Ensure `npm install` has been run inside the backend/ directory.\n",
      err
    );
    process.exit(1);
  }
}
