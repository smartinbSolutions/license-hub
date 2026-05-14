import { generateId, now } from "../model/license.js";

export async function recordAudit(collection, entry) {
  await collection.insertOne({
    id: generateId("audit"),
    createdAt: now(),
    adminEmail: "local-admin",
    adminUid: "local-admin",
    ...entry,
  });
}
