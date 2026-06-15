/**
 * Unit tests for faceDetectionService.js
 *
 * All heavy dependencies (@tensorflow/tfjs-node, @vladmandic/face-api) are
 * mocked so tests run in milliseconds with zero native OS dependencies.
 * canvas is no longer a dependency — no mock needed for it.
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
  node: {
    // Returns a fake Tensor3D with a dispose() method.
    // The actual shape/values don't matter — detectAllFaces is also mocked.
    decodeImage: vi.fn().mockReturnValue({ dispose: vi.fn() }),
  },
}));

vi.mock("@vladmandic/face-api", () => ({
  env: {
    monkeyPatch: vi.fn(), // kept in mock in case future code re-adds it
  },
  nets: {
    tinyFaceDetector: {
      loadFromDisk: vi.fn().mockResolvedValue(undefined),
    },
  },
  TinyFaceDetectorOptions: vi.fn().mockImplementation((opts) => opts),
  detectAllFaces: vi.fn(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const FAKE_BUFFER = Buffer.from("fake-image-data");

/**
 * Returns a fresh service instance and fresh mock references.
 * vi.resetModules() clears the module registry so modelLoadPromise and
 * the _tf / _faceapi singletons start at null for each test that calls this.
 */
async function freshImport() {
  vi.resetModules();
  const service = await import("../../services/faceDetectionService.js");
  const tf = await import("@tensorflow/tfjs-node");
  const faceapi = await import("@vladmandic/face-api");
  return { service, tf, faceapi };
}

// ── Suite 1: SKIP_FACE_DETECTION bypass ──────────────────────────────────────

describe("detectFace — bypass mode (SKIP_FACE_DETECTION=true)", () => {
  beforeEach(() => { process.env.SKIP_FACE_DETECTION = "true"; });
  afterEach(() => { delete process.env.SKIP_FACE_DETECTION; });

  it("returns true for any buffer without touching tf or the model", async () => {
    const { detectFace } = await import("../../services/faceDetectionService.js");
    const tf = await import("@tensorflow/tfjs-node");

    const result = await detectFace(FAKE_BUFFER);

    expect(result).toBe(true);
    expect(tf.node.decodeImage).not.toHaveBeenCalled();
  });
});

// ── Suite 2: Detection outcomes ───────────────────────────────────────────────

describe("detectFace — detection outcomes", () => {
  beforeEach(() => { delete process.env.SKIP_FACE_DETECTION; vi.clearAllMocks(); });

  it("returns true when faceapi detects one face", async () => {
    const { service, faceapi } = await freshImport();
    vi.mocked(faceapi.detectAllFaces).mockResolvedValueOnce([{ score: 0.92 }]);

    expect(await service.detectFace(FAKE_BUFFER)).toBe(true);
  });

  it("returns true when faceapi detects multiple faces", async () => {
    const { service, faceapi } = await freshImport();
    vi.mocked(faceapi.detectAllFaces).mockResolvedValueOnce([
      { score: 0.95 },
      { score: 0.87 },
    ]);

    expect(await service.detectFace(FAKE_BUFFER)).toBe(true);
  });

  it("returns false when faceapi returns an empty detections array", async () => {
    const { service, faceapi } = await freshImport();
    vi.mocked(faceapi.detectAllFaces).mockResolvedValueOnce([]);

    expect(await service.detectFace(FAKE_BUFFER)).toBe(false);
  });

  it("calls tensor.dispose() even when detectAllFaces throws", async () => {
    const { service, tf, faceapi } = await freshImport();
    const mockTensor = { dispose: vi.fn() };
    vi.mocked(tf.node.decodeImage).mockReturnValueOnce(mockTensor);
    vi.mocked(faceapi.detectAllFaces).mockRejectedValueOnce(new Error("inference error"));

    await expect(service.detectFace(FAKE_BUFFER)).rejects.toThrow("inference error");
    expect(mockTensor.dispose).toHaveBeenCalledTimes(1);
  });

  it("propagates a tf.node.decodeImage failure as a thrown error", async () => {
    const { service, tf } = await freshImport();
    vi.mocked(tf.node.decodeImage).mockImplementationOnce(() => {
      throw new Error("Unsupported image format");
    });

    await expect(service.detectFace(FAKE_BUFFER)).rejects.toThrow(
      "Unsupported image format"
    );
  });
});

// ── Suite 3: Singleton / lazy-load behaviour ─────────────────────────────────

describe("detectFace — singleton model loading", () => {
  beforeEach(() => {
    delete process.env.SKIP_FACE_DETECTION;
    // clearAllMocks resets call counts on the shared vi.fn() spy objects.
    // Without this, counts from earlier suites accumulate here.
    vi.clearAllMocks();
  });

  it("calls loadFromDisk exactly once regardless of how many detections run", async () => {
    const { service, faceapi } = await freshImport();
    vi.mocked(faceapi.detectAllFaces).mockResolvedValue([{ score: 0.9 }]);

    await service.detectFace(FAKE_BUFFER);
    await service.detectFace(FAKE_BUFFER);
    await service.detectFace(FAKE_BUFFER);

    expect(faceapi.nets.tinyFaceDetector.loadFromDisk).toHaveBeenCalledTimes(1);
  });

  it("handles concurrent calls safely — loadFromDisk still called only once", async () => {
    const { service, faceapi } = await freshImport();
    vi.mocked(faceapi.detectAllFaces).mockResolvedValue([{ score: 0.9 }]);

    const [r1, r2, r3] = await Promise.all([
      service.detectFace(FAKE_BUFFER),
      service.detectFace(FAKE_BUFFER),
      service.detectFace(FAKE_BUFFER),
    ]);

    expect(r1).toBe(true);
    expect(r2).toBe(true);
    expect(r3).toBe(true);
    expect(faceapi.nets.tinyFaceDetector.loadFromDisk).toHaveBeenCalledTimes(1);
  });
});

// ── Suite 4: preloadFaceDetectionModel ───────────────────────────────────────

describe("preloadFaceDetectionModel", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => {
    delete process.env.SKIP_FACE_DETECTION;
    vi.restoreAllMocks();
  });

  it("logs success when model weights load without error", async () => {
    delete process.env.SKIP_FACE_DETECTION;
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { service } = await freshImport();

    await service.preloadFaceDetectionModel();

    expect(consoleSpy).toHaveBeenCalledWith(
      "[FaceDetection] TinyFaceDetector model ready. Path:",
      expect.stringContaining("@vladmandic/face-api/model")
    );
  });

  it("calls process.exit(1) when loadFromDisk rejects", async () => {
    delete process.env.SKIP_FACE_DETECTION;
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => { throw new Error("process.exit intercepted"); });
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { service, faceapi } = await freshImport();
    vi.mocked(faceapi.nets.tinyFaceDetector.loadFromDisk).mockRejectedValueOnce(
      new Error("Model weights not found")
    );

    await expect(service.preloadFaceDetectionModel()).rejects.toThrow(
      "process.exit intercepted"
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("skips loading and warns when SKIP_FACE_DETECTION=true", async () => {
    process.env.SKIP_FACE_DETECTION = "true";
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { service, faceapi } = await freshImport();

    await service.preloadFaceDetectionModel();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("SKIP_FACE_DETECTION=true")
    );
    expect(faceapi.nets.tinyFaceDetector.loadFromDisk).not.toHaveBeenCalled();
  });
});
