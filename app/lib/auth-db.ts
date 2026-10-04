import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not defined");
}

const globalForMongo = globalThis as unknown as {
  betterAuthMongoClient?: MongoClient;
  betterAuthMongoConnection?: Promise<MongoClient>;
};

const client =
  globalForMongo.betterAuthMongoClient ??
  new MongoClient(uri, {
    serverSelectionTimeoutMS: 5_000,
    connectTimeoutMS: 5_000,
    socketTimeoutMS: 30_000,
    maxPoolSize: 10,
  });

if (!globalForMongo.betterAuthMongoClient) {
  globalForMongo.betterAuthMongoClient = client;
}

export const mongoClient = client;
export const mongoDb = client.db();

export function connectMongo(): Promise<MongoClient> {
  const existingConnection = globalForMongo.betterAuthMongoConnection;
  if (existingConnection) {
    return existingConnection;
  }

  const connection = mongoClient.connect().catch((error: unknown) => {
    if (globalForMongo.betterAuthMongoConnection === connection) {
      delete globalForMongo.betterAuthMongoConnection;
    }
    throw error;
  });

  globalForMongo.betterAuthMongoConnection = connection;
  return connection;
}