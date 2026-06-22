import { createHash, randomBytes } from "node:crypto";
import { badRequest } from "./errors.js";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const PRODUCTS = { POS: "pos", ERP: "erp" };
export const ERP_REGIONS = { SY: "sy", TR: "tr" };
export const ERP_MODULES = ["accounting", "inventory", "hr", "pos", "restaurant", "maintenance"];
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
  "product",
  "region",
  "modules",
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

export function sanitizeLicenseInput(input, plan) {
  const startsAt = input.startsAt ? new Date(input.startsAt) : new Date();

  const expiresAt = input.expiresAt
    ? new Date(input.expiresAt)
    : new Date(startsAt.getTime() + (plan?.durationDays ?? 365) * 86400_000);

  const product = String(input.product || PRODUCTS.POS).toLowerCase();

  const region =
    product === PRODUCTS.ERP ? String(input.region || ERP_REGIONS.SY).toLowerCase() : null;

  const modules =
    product === PRODUCTS.ERP
      ? Array.isArray(input.modules)
        ? input.modules
        : plan?.modules || []
      : [];

  const defaultPrefix = product === PRODUCTS.ERP ? `ERP-${region.toUpperCase()}` : "POS";

  return {
    product,
    region,
    modules,

    licenseKey: String(input.licenseKey || generateLicenseKey(defaultPrefix))
      .trim()
      .toUpperCase(),

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

  if (!license.licenseKey) {
    throw badRequest("A valid license key is required");
  }

  if (license.product === PRODUCTS.POS && !license.licenseKey.startsWith("POS-")) {
    throw badRequest("POS licenses must start with POS-");
  }

  if (license.product === PRODUCTS.ERP && !/^ERP-(TR|SY)-/.test(license.licenseKey)) {
    throw badRequest("ERP licenses must start with ERP-TR- or ERP-SY-");
  }

  if (license.product === PRODUCTS.ERP && !license.region) {
    throw badRequest("ERP licenses require a region");
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
    Object.entries(input ?? {}).filter(([key]) => writableLicenseFields.includes(key)),
  );

  if (updates.licenseKey) updates.licenseKey = String(updates.licenseKey).trim().toUpperCase();
  if (updates.startsAt) updates.startsAt = new Date(updates.startsAt).toISOString();
  if (updates.expiresAt) updates.expiresAt = new Date(updates.expiresAt).toISOString();
  if (updates.maxDevices) updates.maxDevices = Math.max(1, Number(updates.maxDevices));
  if (updates.product) updates.product = String(updates.product).toLowerCase();
  if (updates.region) updates.region = String(updates.region).toLowerCase();
  if (updates.modules && !Array.isArray(updates.modules)) updates.modules = [];

  return updates;
}
