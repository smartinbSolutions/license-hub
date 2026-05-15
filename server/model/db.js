import { MongoClient } from "mongodb";

const defaultUri = "mongodb+srv://me:1234@cluster0.wp09nak.mongodb.net/posLicense?appName=Cluster0";
const mongoUri = process.env.MONGODB_URI ?? defaultUri;
const databaseName = process.env.MONGODB_DB_NAME ?? "posLicense";

let clientPromise;

function getClient() {
  if (!clientPromise) {
    const client = new MongoClient(mongoUri);
    clientPromise = client.connect();
  }

  return clientPromise;
}

export async function getDb() {
  const client = await getClient();
  return client.db(databaseName);
}

export async function getCollections() {
  const db = await getDb();

  return {
    licenses: db.collection("licenses"),
    plans: db.collection("plans"),
    auditLogs: db.collection("auditLogs"),
    activationAttempts: db.collection("activationAttempts"),
    adminUsers: db.collection("adminUsers"),
    adminSessions: db.collection("adminSessions"),
    adminPasswordResets: db.collection("adminPasswordResets"),
  };
}

export async function ensureIndexes() {
  const {
    licenses,
    plans,
    auditLogs,
    activationAttempts,
    adminUsers,
    adminSessions,
    adminPasswordResets,
  } = await getCollections();

  await Promise.all([
    licenses.createIndex({ id: 1 }, { unique: true }),
    licenses.createIndex({ licenseKey: 1 }, { unique: true }),
    licenses.createIndex({ createdAt: -1 }),
    plans.createIndex({ id: 1 }, { unique: true }),
    plans.createIndex({ createdAt: -1 }),
    auditLogs.createIndex({ createdAt: -1 }),
    activationAttempts.createIndex({ createdAt: -1 }),
    adminUsers.createIndex({ id: 1 }, { unique: true }),
    adminUsers.createIndex({ email: 1 }, { unique: true }),
    adminSessions.createIndex({ token: 1 }, { unique: true }),
    adminSessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    adminPasswordResets.createIndex({ token: 1 }, { unique: true }),
    adminPasswordResets.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);
}
