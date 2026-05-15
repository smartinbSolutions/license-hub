import { getCollections } from "../model/db.js";

function withoutMongoId(document) {
  if (!document) return null;
  const { _id, ...rest } = document;
  return rest;
}

export async function listAuditLogs({ licenseId } = {}) {
  const { auditLogs } = await getCollections();
  const filter = licenseId ? { licenseId } : {};
  const results = await auditLogs.find(filter, { sort: { createdAt: -1 }, limit: 500 }).toArray();
  return results.map(withoutMongoId);
}

export async function listActivationAttempts() {
  const { activationAttempts } = await getCollections();
  const results = await activationAttempts
    .find({}, { sort: { createdAt: -1 }, limit: 500 })
    .toArray();
  return results.map(withoutMongoId);
}
