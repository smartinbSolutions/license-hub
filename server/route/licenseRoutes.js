import { Router } from "express";
import {
  createLicense,
  deleteLicense,
  getLicense,
  listLicenses,
  resetLicenseDevices,
  updateLicense,
} from "../service/licenseService.js";

export const licenseRouter = Router();

licenseRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await listLicenses());
  } catch (error) {
    next(error);
  }
});

licenseRouter.get("/:id", async (req, res, next) => {
  try {
    res.json(await getLicense(req.params.id));
  } catch (error) {
    next(error);
  }
});

licenseRouter.post("/", async (req, res, next) => {
  try {
    res.status(201).json(await createLicense(req.body));
  } catch (error) {
    next(error);
  }
});

licenseRouter.patch("/:id", async (req, res, next) => {
  try {
    res.json(await updateLicense(req.params.id, req.body));
  } catch (error) {
    next(error);
  }
});

licenseRouter.post("/:id/reset-devices", async (req, res, next) => {
  try {
    res.json(await resetLicenseDevices(req.params.id));
  } catch (error) {
    next(error);
  }
});

licenseRouter.delete("/:id", async (req, res, next) => {
  try {
    await deleteLicense(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
