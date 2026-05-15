import { badRequest, conflict, notFound } from "../model/errors.js";
import { getCollections } from "../model/db.js";
import {
  generateId,
  hashLicenseKey,
  now,
  publicLicense,
  requireLicenseFields,
  sanitizeLicenseInput,
  sanitizeLicenseUpdates,
} from "../model/license.js";
import { recordAudit } from "./auditService.js";

function withoutMongoId(document) {
  if (!document) return null;
  const { _id, ...rest } = document;
  return rest;
}

async function findLicenseOrThrow(licenses, id) {
  const license = await licenses.findOne({ id });
  if (!license) throw notFound("license_not_found");
  return withoutMongoId(license);
}

export async function listLicenses() {
  const { licenses } = await getCollections();
  const results = await licenses.find({}, { sort: { createdAt: -1 } }).toArray();
  return results.map((license) => publicLicense(withoutMongoId(license)));
}

export async function getLicense(id) {
  const { licenses } = await getCollections();
  return publicLicense(await findLicenseOrThrow(licenses, id));
}

export async function createLicense(input) {
  const { licenses, plans, auditLogs } = await getCollections();
  const planId = String(input?.planId || "").trim();
  const plan = planId ? withoutMongoId(await plans.findOne({ id: planId })) : null;
  if (!plan) throw badRequest("A valid plan is required");

  const data = sanitizeLicenseInput(input ?? {}, plan);
  requireLicenseFields(data);

  const existing = await licenses.findOne({ licenseKey: data.licenseKey });
  if (existing) throw conflict("license_key_exists");

  const timestamp = now();
  const license = {
    id: generateId("lic"),
    ...data,
    licenseKeyHash: hashLicenseKey(data.licenseKey),
    activations: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: "local-admin",
    updatedBy: "local-admin",
  };

  await licenses.insertOne(license);
  await recordAudit(auditLogs, {
    action: "license.created",
    licenseId: license.id,
    licenseKey: license.licenseKey,
  });

  return publicLicense(license);
}

export async function updateLicense(id, input) {
  const { licenses, plans, auditLogs } = await getCollections();
  const existing = await findLicenseOrThrow(licenses, id);
  const updates = sanitizeLicenseUpdates(input);

  if (updates.planId && updates.planId !== existing.planId) {
    const plan = withoutMongoId(await plans.findOne({ id: updates.planId }));
    if (!plan) throw badRequest("A valid plan is required");
    updates.planName = plan.name;
    if (input.maxDevices === undefined) updates.maxDevices = plan.maxDevices;
  }

  if (updates.licenseKey && updates.licenseKey !== existing.licenseKey) {
    const duplicate = await licenses.findOne({ licenseKey: updates.licenseKey });
    if (duplicate) throw conflict("license_key_exists");
  }

  const nextLicense = {
    ...existing,
    ...updates,
    licenseKeyHash: updates.licenseKey
      ? hashLicenseKey(updates.licenseKey)
      : existing.licenseKeyHash,
    updatedAt: now(),
    updatedBy: "local-admin",
  };

  await licenses.replaceOne({ id }, nextLicense);
  await recordAudit(auditLogs, {
    action: "license.updated",
    licenseId: nextLicense.id,
    licenseKey: nextLicense.licenseKey,
    metadata: updates,
  });

  return publicLicense(nextLicense);
}

export async function resetLicenseDevices(id) {
  const { licenses, auditLogs } = await getCollections();
  const license = await findLicenseOrThrow(licenses, id);
  const nextLicense = {
    ...license,
    activations: [],
    updatedAt: now(),
    updatedBy: "local-admin",
  };

  await licenses.replaceOne({ id }, nextLicense);
  await recordAudit(auditLogs, {
    action: "device.reset",
    licenseId: nextLicense.id,
    licenseKey: nextLicense.licenseKey,
  });

  return publicLicense(nextLicense);
}

export async function deleteLicense(id) {
  const { licenses, auditLogs } = await getCollections();
  const license = await findLicenseOrThrow(licenses, id);

  await licenses.deleteOne({ id });
  await recordAudit(auditLogs, {
    action: "license.deleted",
    licenseId: license.id,
    licenseKey: license.licenseKey,
  });
}
