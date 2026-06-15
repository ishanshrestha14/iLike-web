/**
 * Unit tests for nsfwModerationService.js
 *
 * All heavy dependencies (@tensorflow/tfjs-node, nsfwjs) are mocked so tests run
 * in milliseconds with zero native OS dependencies.
 *
 * Isolation strategy:
 *   vi.mock() calls are hoisted before any import — the module under test
 *   receives mock implementations at the moment it first loads.
 *   For singleton-state tests (modelLoadPromise), vi.resetModules() + dynamic
 *   import() gives each test a completely fresh module instance.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mocks (hoisted by Vitest before any import resolves) ─────────────────────

vi.mock("@tensorflow/tfjs-node", () => ({
  ready: vi.fn().mockResolvedValue(undefined),
  node: {
    // Returns a fake Tensor3D with a dispose() method.
    // The actual shape/values don't matter — classify is also mocked.
    decodeImage: vi.fn().mockReturnValue({ dispose: vi.fn() }),
  },
}));

// nsfwjs.load() resolves to a model whose classify() returns the predictions
// array each test sets up. classifyMock is shared so tests can program it.
const classifyMock = vi.fn();
vi.mock("nsfwjs", () => ({
  load: vi.fn().mockResolvedValue({ classify: classifyMock }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const FAKE_BUFFER = Buffer.from("fake-image-data");

/**
 * Builds a full 5-class prediction array (sorted desc by probability, the way
 * nsfwjs returns it) from a partial { className: probability } map. Any class
 * not supplied gets probability 0.
 */
function predictions(scores) {
  const classes = ["Drawing", "Hentai", "Neutral", "Porn", "Sexy"];
  return classes
    .map((className) => ({ className, probability: scores[className] ?? 0 }))
    .sort((a, b) => b.probability - a.probability);
}

/**
 * Returns a fresh service instance and fresh mock references.
 * vi.resetModules() clears the module registry so modelLoadPromise and the
 * _tf / _nsfwjs / _model singletons start at null for each test that calls this.
 */
async function freshImport() {
  vi.resetModules();
  const service = await import("../../services/nsfwModerationService.js");
  const tf = await import("@tensorflow/tfjs-node");
  const nsfwjs = await import("nsfwjs");
  return { service, tf, nsfwjs };
}

// ── Suite 1: SKIP_NSFW_MODERATION bypass ─────────────────────────────────────

describe("moderateImage — bypass mode (SKIP_NSFW_MODERATION=true)", () => {
  beforeEach(() => { process.env.SKIP_NSFW_MODERATION = "true"; });
  afterEach(() => { delete process.env.SKIP_NSFW_MODERATION; });

  it("returns a safe result without touching tf or the model", async () => {
    const { moderateImage } = await import("../../services/nsfwModerationService.js");
    const tf = await import("@tensorflow/tfjs-node");

    const result = await moderateImage(FAKE_BUFFER);

    expect(result).toEqual({ isSafe: true, classification: "Skipped", scores: {} });
    expect(tf.node.decodeImage).not.toHaveBeenCalled();
  });
});

// ── Suite 2: Moderation outcomes ──────────────────────────────────────────────

describe("moderateImage — moderation outcomes", () => {
  beforeEach(() => { delete process.env.SKIP_NSFW_MODERATION; vi.clearAllMocks(); });

  it("marks a clearly neutral image as safe", async () => {
    const { service } = await freshImport();
    classifyMock.mockResolvedValueOnce(predictions({ Neutral: 0.97, Drawing: 0.02 }));

    const result = await service.moderateImage(FAKE_BUFFER);

    expect(result.isSafe).toBe(true);
    expect(result.classification).toBe("Neutral");
    expect(result.scores.Neutral).toBeCloseTo(0.97);
  });

  it("flags Porn at/above the 0.7 threshold as unsafe", async () => {
    const { service } = await freshImport();
    classifyMock.mockResolvedValueOnce(predictions({ Porn: 0.82, Neutral: 0.1 }));

    const result = await service.moderateImage(FAKE_BUFFER);

    expect(result.isSafe).toBe(false);
    expect(result.classification).toBe("Porn");
  });

  it("flags Hentai at/above the 0.7 threshold as unsafe", async () => {
    const { service } = await freshImport();
    classifyMock.mockResolvedValueOnce(predictions({ Hentai: 0.7, Neutral: 0.2 }));

    expect((await service.moderateImage(FAKE_BUFFER)).isSafe).toBe(false);
  });

  it("flags Sexy at/above the 0.85 threshold as unsafe", async () => {
    const { service } = await freshImport();
    classifyMock.mockResolvedValueOnce(predictions({ Sexy: 0.9, Neutral: 0.05 }));

    expect((await service.moderateImage(FAKE_BUFFER)).isSafe).toBe(false);
  });

  it("allows a suggestive-but-clothed image below the Sexy threshold", async () => {
    const { service } = await freshImport();
    // Sexy is the top class but stays under 0.85 → permitted on a dating app.
    classifyMock.mockResolvedValueOnce(predictions({ Sexy: 0.6, Neutral: 0.35 }));

    const result = await service.moderateImage(FAKE_BUFFER);

    expect(result.isSafe).toBe(true);
    expect(result.classification).toBe("Sexy");
  });

  it("calls tensor.dispose() even when classify throws", async () => {
    const { service, tf } = await freshImport();
    const mockTensor = { dispose: vi.fn() };
    vi.mocked(tf.node.decodeImage).mockReturnValueOnce(mockTensor);
    classifyMock.mockRejectedValueOnce(new Error("inference error"));

    await expect(service.moderateImage(FAKE_BUFFER)).rejects.toThrow("inference error");
    expect(mockTensor.dispose).toHaveBeenCalledTimes(1);
  });

  it("propagates a tf.node.decodeImage failure as a thrown error", async () => {
    const { service, tf } = await freshImport();
    vi.mocked(tf.node.decodeImage).mockImplementationOnce(() => {
      throw new Error("Unsupported image format");
    });

    await expect(service.moderateImage(FAKE_BUFFER)).rejects.toThrow(
      "Unsupported image format"
    );
  });
});

// ── Suite 3: Singleton / lazy-load behaviour ─────────────────────────────────

describe("moderateImage — singleton model loading", () => {
  beforeEach(() => { delete process.env.SKIP_NSFW_MODERATION; vi.clearAllMocks(); });

  it("calls nsfwjs.load exactly once regardless of how many calls run", async () => {
    const { service, nsfwjs } = await freshImport();
    classifyMock.mockResolvedValue(predictions({ Neutral: 0.99 }));

    await service.moderateImage(FAKE_BUFFER);
    await service.moderateImage(FAKE_BUFFER);
    await service.moderateImage(FAKE_BUFFER);

    expect(nsfwjs.load).toHaveBeenCalledTimes(1);
  });

  it("handles concurrent calls safely — load still called only once", async () => {
    const { service, nsfwjs } = await freshImport();
    classifyMock.mockResolvedValue(predictions({ Neutral: 0.99 }));

    const results = await Promise.all([
      service.moderateImage(FAKE_BUFFER),
      service.moderateImage(FAKE_BUFFER),
      service.moderateImage(FAKE_BUFFER),
    ]);

    expect(results.every((r) => r.isSafe)).toBe(true);
    expect(nsfwjs.load).toHaveBeenCalledTimes(1);
  });
});

// ── Suite 4: preloadNsfwModel ────────────────────────────────────────────────

describe("preloadNsfwModel", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => {
    delete process.env.SKIP_NSFW_MODERATION;
    vi.restoreAllMocks();
  });

  it("logs success when the model loads without error", async () => {
    delete process.env.SKIP_NSFW_MODERATION;
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { service } = await freshImport();

    await service.preloadNsfwModel();

    expect(consoleSpy).toHaveBeenCalledWith(
      "[NsfwModeration] nsfwjs model ready. Model:",
      "MobileNetV2"
    );
  });

  it("calls process.exit(1) when nsfwjs.load rejects", async () => {
    delete process.env.SKIP_NSFW_MODERATION;
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => { throw new Error("process.exit intercepted"); });
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { service, nsfwjs } = await freshImport();
    vi.mocked(nsfwjs.load).mockRejectedValueOnce(new Error("model load failed"));

    await expect(service.preloadNsfwModel()).rejects.toThrow(
      "process.exit intercepted"
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("skips loading and warns when SKIP_NSFW_MODERATION=true", async () => {
    process.env.SKIP_NSFW_MODERATION = "true";
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { service, nsfwjs } = await freshImport();

    await service.preloadNsfwModel();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("SKIP_NSFW_MODERATION=true")
    );
    expect(nsfwjs.load).not.toHaveBeenCalled();
  });
});
