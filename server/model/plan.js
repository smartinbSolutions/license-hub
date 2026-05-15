import { badRequest } from "./errors.js";
import { generateId, now } from "./license.js";

export const writablePlanFields = [
  "name",
  "maxDevices",
  "durationDays",
  "price",
  "currency",
  "features",
  "status",
];

export function sanitizePlanInput(input) {
  return {
    id: input.id ? String(input.id).trim() : generateId("plan"),
    name: String(input.name || "").trim(),
    maxDevices: Math.max(1, Number(input.maxDevices || 1)),
    durationDays: Math.max(1, Number(input.durationDays || 365)),
    price: Math.max(0, Number(input.price || 0)),
    currency: String(input.currency || "USD")
      .trim()
      .toUpperCase(),
    features: Array.isArray(input.features)
      ? input.features.map((feature) => String(feature).trim()).filter(Boolean)
      : [],
    status: input.status === "inactive" ? "inactive" : "active",
  };
}

export function sanitizePlanUpdates(input) {
  const updates = Object.fromEntries(
    Object.entries(input ?? {}).filter(([key]) => writablePlanFields.includes(key)),
  );

  if (updates.name !== undefined) updates.name = String(updates.name).trim();
  if (updates.maxDevices !== undefined)
    updates.maxDevices = Math.max(1, Number(updates.maxDevices));
  if (updates.durationDays !== undefined)
    updates.durationDays = Math.max(1, Number(updates.durationDays));
  if (updates.price !== undefined) updates.price = Math.max(0, Number(updates.price));
  if (updates.currency !== undefined)
    updates.currency = String(updates.currency).trim().toUpperCase();
  if (updates.features !== undefined) {
    updates.features = Array.isArray(updates.features)
      ? updates.features.map((feature) => String(feature).trim()).filter(Boolean)
      : [];
  }
  if (updates.status !== undefined) {
    updates.status = updates.status === "inactive" ? "inactive" : "active";
  }

  return updates;
}

export function requirePlanFields(plan) {
  if (!plan.name) throw badRequest("Plan name is required");
  if (!Number.isFinite(plan.maxDevices) || plan.maxDevices < 1) {
    throw badRequest("Max devices must be at least 1");
  }
  if (!Number.isFinite(plan.durationDays) || plan.durationDays < 1) {
    throw badRequest("Duration must be at least 1 day");
  }
  if (!plan.currency) throw badRequest("Currency is required");
}

export function buildPlan(input) {
  const timestamp = now();
  return {
    ...sanitizePlanInput(input ?? {}),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
