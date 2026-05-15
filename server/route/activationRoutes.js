import { Router } from "express";
import { activateLicense } from "../service/activationService.js";

export const activationRouter = Router();

activationRouter.post("/activateLicense", async (req, res, next) => {
  try {
    res.json(
      await activateLicense({
        ...(req.body ?? {}),
        ipAddress: req.ip,
      }),
    );
  } catch (error) {
    next(error);
  }
});
