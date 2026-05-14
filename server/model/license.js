import { createHash, randomBytes } from "node:crypto";
import { badRequest } from "./errors.js";
import { findPlan } from "./plan.js";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const writableLicenseFields = [
  "licenseKey",
  "customerName",
  "customerEmail",
  "planId",
  "planName",
  "status",
  "maxDevices",
  "startsAt",
  "expiresAt",
  "notes",
  "activations",
];

export function now() {
  return new Date().toISOString();
}

export function generateId(prefix) {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

export function generateLicenseKey(prefix = "POS") {
  const bytes = randomBytes(20);
  const groups = [];

  for (let groupIndex = 0; groupIndex < 4; groupIndex += 1) {
    let group = "";
    for (let charIndex = 0; charIndex < 5; charIndex += 1) {
      group += ALPHABET[bytes[groupIndex * 5 + charIndex] % ALPHABET.length];
    }
    groups.push(group);
  }

  return `${prefix}-${groups.join("-")}`;
}

export function hashLicenseKey(licenseKey) {
  return createHash("sha256").update(licenseKey.toUpperCase()).digest("hex");
}

export function publicLicense(license) {
  return {
    ...license,
    licenseKey: license.licenseKey,
    activations: license.activations ?? [],
  };
}

export function sanitizeLicenseInput(input) {
  const plan = findPlan(String(input.planId || "").trim());
  const startsAt = input.startsAt ? new Date(input.startsAt) : new Date();
  const expiresAt = input.expiresAt
    ? new Date(input.expiresAt)
    : new Date(startsAt.getTime() + (plan?.durationDays ?? 365) * 86400_000);

  return {
    licenseKey: String(input.licenseKey || generateLicenseKey()).trim().toUpperCase(),
    customerName: String(input.customerName || "").trim(),
    customerEmail: String(input.customerEmail || "").trim(),
    planId: String(input.planId || "").trim(),
    planName: plan?.name ?? (input.planName ? String(input.planName).trim() : undefined),
    status: input.status || "active",
    maxDevices: Math.max(1, Number(input.maxDevices || plan?.maxDevices || 1)),
    startsAt: startsAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    notes: input.notes ? String(input.notes).trim() : "",
  };
}

export function requireLicenseFields(license) {
  if (!license.customerName || !license.customerEmail || !license.planId || !license.expiresAt) {
    throw badRequest("Customer name, email, plan, and expiry are required");
  }
  if (!findPlan(license.planId)) {
    throw badRequest("A valid plan is required");
  }
  if (!license.licenseKey || !license.licenseKey.startsWith("POS-")) {
    throw badRequest("A valid license key is required");
  }
  if (!Number.isFinite(license.maxDevices) || license.maxDevices < 1) {
    throw badRequest("Max devices must be at least 1");
  }
  if (new Date(license.expiresAt).getTime() <= new Date(license.startsAt).getTime()) {
    throw badRequest("Expiry date must be after start date");
  }
}

export function sanitizeLicenseUpdates(input) {
  const updates = Object.fromEntries(
    Object.entries(input ?? {}).filter(([key]) => writableLicenseFields.includes(key))
  );

  if (updates.licenseKey) updates.licenseKey = String(updates.licenseKey).trim().toUpperCase();
  if (updates.startsAt) updates.startsAt = new Date(updates.startsAt).toISOString();
  if (updates.expiresAt) updates.expiresAt = new Date(updates.expiresAt).toISOString();
  if (updates.maxDevices) updates.maxDevices = Math.max(1, Number(updates.maxDevices));

  return updates;
}
