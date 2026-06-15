import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

// Set test environment variables before any module imports resolve
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-for-vitest";
// Bypass face detection in all non-ML tests. Without this, any test that hits
// an upload endpoint would fail because the native packages (@tensorflow/tfjs-node,
// canvas) are not installed in CI or before `npm install` is run.
// Tests in faceDetectionService.unit.test.js manage this env var themselves.
// Tests in faceDetectionService.integration.test.js delete it in beforeAll.
process.env.SKIP_FACE_DETECTION = "true";

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  const collections = await mongoose.connection.db.collections();
  for (let collection of collections) {
    await collection.deleteMany({});
  }
});
