import { badRequest, forbidden, notFound } from "../model/errors.js";
import { getCollections } from "../model/db.js";
import { generateId, now } from "../model/license.js";
import { signPayload } from "./keyService.js";

async function recordAttempt(collection, request, success, failureReason) {
  await collection.insertOne({
    id: generateId("attempt"),
    licenseKey: request.licenseKey || null,
    deviceHash: request.deviceHash || null,
    deviceName: request.deviceName || null,
    appVersion: request.appVersion || null,
    success,
    failureReason: failureReason || null,
    createdAt: now(),
    ipAddress: request.ipAddress,
  });
}

async function failActivation(collection, request, error) {
  await recordAttempt(collection, request, false, error.message);
  throw error;
}

function withoutMongoId(document) {
  if (!document) return null;
  const { _id, ...rest } = document;
  return rest;
}

export async function activateLicense(request) {
  const { licenses, activationAttempts } = await getCollections();
  const { licenseKey, deviceHash, deviceName, appVersion } = request;

  if (!licenseKey || !deviceHash) {
    await failActivation(activationAttempts, request, badRequest("missing_fields"));
  }

  const key = String(licenseKey).trim().toUpperCase();
  const license = withoutMongoId(await licenses.findOne({ licenseKey: key }));
  if (!license) {
    await failActivation(activationAttempts, request, notFound("license_not_found"));
  }

  if (license.status !== "active") {
    await failActivation(activationAttempts, request, forbidden("license_not_active"));
  }

  if (new Date(license.startsAt).getTime() > Date.now()) {
    await failActivation(activationAttempts, request, forbidden("license_not_started"));
  }

  if (new Date(license.expiresAt).getTime() < Date.now()) {
    await failActivation(activationAttempts, request, forbidden("license_expired"));
  }

  const activations = license.activations ?? [];
  const existing = activations.find((activation) => activation.deviceHash === deviceHash);
  if (!existing && activations.length >= license.maxDevices) {
    await failActivation(activationAttempts, request, forbidden("device_limit_reached"));
  }

  if (existing) {
    existing.lastSeenAt = now();
    existing.deviceName = deviceName || existing.deviceName;
    existing.appVersion = appVersion || existing.appVersion;
  } else {
    activations.push({
      deviceHash,
      deviceName: deviceName || "Unknown device",
      appVersion: appVersion || "unknown",
      activatedAt: now(),
      lastSeenAt: now(),
    });
  }

  const payload = {
    licenseKey: license.licenseKey,
    deviceHash,
    issuedAt: now(),
    expiresAt: license.expiresAt,
    maxDevices: license.maxDevices,
    planId: license.planId,
  };

  await recordAttempt(activationAttempts, request, true);
  await licenses.updateOne(
    { id: license.id },
    {
      $set: {
        activations,
        updatedAt: now(),
        updatedBy: "local-admin",
      },
    }
  );

  return {
    payload,
    signature: signPayload(payload),
  };
}
