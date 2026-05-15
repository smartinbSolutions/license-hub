import { conflict, notFound } from "../model/errors.js";
import { getCollections } from "../model/db.js";
import { buildPlan, requirePlanFields, sanitizePlanUpdates } from "../model/plan.js";
import { now } from "../model/license.js";
import { recordAudit } from "./auditService.js";

function withoutMongoId(document) {
  if (!document) return null;
  const { _id, ...rest } = document;
  return rest;
}

async function findPlanOrThrow(plans, id) {
  const plan = await plans.findOne({ id });
  if (!plan) throw notFound("plan_not_found");
  return withoutMongoId(plan);
}

export async function listPlans() {
  const { plans } = await getCollections();
  const results = await plans.find({}, { sort: { createdAt: -1 } }).toArray();
  return results.map(withoutMongoId);
}

export async function getPlan(id) {
  const { plans } = await getCollections();
  return findPlanOrThrow(plans, id);
}

export async function createPlan(input) {
  const { plans, auditLogs } = await getCollections();
  const plan = buildPlan(input);
  requirePlanFields(plan);

  const existing = await plans.findOne({ id: plan.id });
  if (existing) throw conflict("plan_id_exists");

  await plans.insertOne(plan);
  await recordAudit(auditLogs, {
    action: "plan.created",
    metadata: { planId: plan.id, name: plan.name },
  });

  return withoutMongoId(plan);
}

export async function updatePlan(id, input) {
  const { plans, auditLogs } = await getCollections();
  const existing = await findPlanOrThrow(plans, id);
  const updates = sanitizePlanUpdates(input);
  const nextPlan = {
    ...existing,
    ...updates,
    updatedAt: now(),
  };
  requirePlanFields(nextPlan);

  await plans.replaceOne({ id }, nextPlan);
  await recordAudit(auditLogs, {
    action: "plan.updated",
    metadata: { planId: id, updates },
  });

  return withoutMongoId(nextPlan);
}

export async function deletePlan(id) {
  const { plans, licenses, auditLogs } = await getCollections();
  const plan = await findPlanOrThrow(plans, id);
  const licenseCount = await licenses.countDocuments({ planId: id });
  if (licenseCount > 0) throw conflict("plan_in_use");

  await plans.deleteOne({ id });
  await recordAudit(auditLogs, {
    action: "plan.deleted",
    metadata: { planId: plan.id, name: plan.name },
  });
}
