import { Router } from "express";
import { listPlans } from "../service/planService.js";

export const planRouter = Router();

planRouter.get("/", (_req, res) => {
  res.json(listPlans());
});
