import { Router } from "express";
import { listActivationAttempts, listAuditLogs } from "../service/activityService.js";

export const auditLogRouter = Router();
export const activationAttemptRouter = Router();

auditLogRouter.get("/", async (req, res, next) => {
  try {
    res.json(await listAuditLogs({ licenseId: req.query.licenseId }));
  } catch (error) {
    next(error);
  }
});

activationAttemptRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await listActivationAttempts());
  } catch (error) {
    next(error);
  }
});
