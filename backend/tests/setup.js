import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

// Set test environment variables before any module imports resolve
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-for-vitest";

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
