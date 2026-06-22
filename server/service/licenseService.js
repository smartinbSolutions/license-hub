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

exports.listLicenses = async ({ product, region } = {}) => {
  const { licenses } = await getCollections();

  const query = {};

  if (product) query.product = product;
  if (region) query.region = region;

  const results = await licenses
    .find(query, {
      sort: { createdAt: -1 },
    })
    .toArray();

  return results.map((license) => publicLicense(withoutMongoId(license)));
};

exports.getLicense = async ({ id }) => {
  const { licenses } = await getCollections();

  const license = await licenses.findOne({ id });

  if (!license) {
    throw notFound("license_not_found");
  }

  return publicLicense(withoutMongoId(license));
};

exports.createLicense = async ({ input }) => {
  const { licenses, plans, auditLogs } = await getCollections();

  const planId = String(input?.planId || "").trim();

  const planDoc = await plans.findOne({ id: planId });

  if (!planDoc) {
    throw badRequest("A valid plan is required");
  }

  const plan = withoutMongoId(planDoc);

  const data = sanitizeLicenseInput(input ?? {}, plan);

  requireLicenseFields(data);

  const existing = await licenses.findOne({
    licenseKey: data.licenseKey,
  });

  if (existing) {
    throw conflict("license_key_exists");
  }

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
};

exports.updateLicense = async ({ id, input }) => {
  const { licenses, plans, auditLogs } = await getCollections();

  const existingDoc = await licenses.findOne({ id });

  if (!existingDoc) {
    throw notFound("license_not_found");
  }

  const existing = withoutMongoId(existingDoc);

  const updates = sanitizeLicenseUpdates(input);

  if (updates.planId && updates.planId !== existing.planId) {
    const planDoc = await plans.findOne({
      id: updates.planId,
    });

    if (!planDoc) {
      throw badRequest("A valid plan is required");
    }

    const plan = withoutMongoId(planDoc);

    updates.planName = plan.name;

    if (input.maxDevices === undefined) {
      updates.maxDevices = plan.maxDevices;
    }

    if (existing.product === "erp" && input.modules === undefined) {
      updates.modules = plan.modules || [];
    }
  }

  if (updates.licenseKey && updates.licenseKey !== existing.licenseKey) {
    const duplicate = await licenses.findOne({
      licenseKey: updates.licenseKey,
    });

    if (duplicate) {
      throw conflict("license_key_exists");
    }
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
  requireLicenseFields(nextLicense);

  await licenses.replaceOne({ id }, nextLicense);

  await recordAudit(auditLogs, {
    action: "license.updated",
    licenseId: nextLicense.id,
    licenseKey: nextLicense.licenseKey,
    metadata: updates,
  });

  return publicLicense(nextLicense);
};

exports.resetLicenseDevices = async ({ id }) => {
  const { licenses, auditLogs } = await getCollections();

  const existing = await licenses.findOne({ id });

  if (!existing) {
    throw notFound("license_not_found");
  }

  const license = withoutMongoId(existing);

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
};

exports.deleteLicense = async ({ id }) => {
  const { licenses, auditLogs } = await getCollections();

  const existing = await licenses.findOne({ id });

  if (!existing) {
    throw notFound("license_not_found");
  }

  const license = withoutMongoId(existing);

  await licenses.deleteOne({ id });

  await recordAudit(auditLogs, {
    action: "license.deleted",
    licenseId: license.id,
    licenseKey: license.licenseKey,
  });

  return true;
};
