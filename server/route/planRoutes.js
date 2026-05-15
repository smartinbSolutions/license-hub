import { Router } from "express";
import { createPlan, deletePlan, getPlan, listPlans, updatePlan } from "../service/planService.js";

export const planRouter = Router();

planRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await listPlans());
  } catch (error) {
    next(error);
  }
});

planRouter.get("/:id", async (req, res, next) => {
  try {
    res.json(await getPlan(req.params.id));
  } catch (error) {
    next(error);
  }
});

planRouter.post("/", async (req, res, next) => {
  try {
    res.status(201).json(await createPlan(req.body));
  } catch (error) {
    next(error);
  }
});

planRouter.patch("/:id", async (req, res, next) => {
  try {
    res.json(await updatePlan(req.params.id, req.body));
  } catch (error) {
    next(error);
  }
});

planRouter.delete("/:id", async (req, res, next) => {
  try {
    await deletePlan(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
