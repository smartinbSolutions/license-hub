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

// Get all licenses
licenseRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await listLicenses());
  } catch (error) {
    next(error);
  }
});

// Get single license
licenseRouter.get("/:id", async (req, res, next) => {
  try {
    res.json(
      await getLicense({
        id: req.params.id,
      }),
    );
  } catch (error) {
    next(error);
  }
});

// Create license
licenseRouter.post("/", async (req, res, next) => {
  try {
    res.status(201).json(
      await createLicense({
        input: req.body,
      }),
    );
  } catch (error) {
    next(error);
  }
});

// Update license
licenseRouter.patch("/:id", async (req, res, next) => {
  try {
    res.json(
      await updateLicense({
        id: req.params.id,
        input: req.body,
      }),
    );
  } catch (error) {
    next(error);
  }
});

// Reset all activated devices for license
licenseRouter.post("/:id/reset-devices", async (req, res, next) => {
  try {
    res.json(
      await resetLicenseDevices({
        id: req.params.id,
      }),
    );
  } catch (error) {
    next(error);
  }
});

// Delete license
licenseRouter.delete("/:id", async (req, res, next) => {
  try {
    await deleteLicense({
      id: req.params.id,
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
