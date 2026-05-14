import { Router } from "express";
import {
  getUserByToken,
  login,
  logout,
  requestPasswordReset,
  resetPassword,
} from "../service/authService.js";

export const authRouter = Router();

function bearerToken(req) {
  const header = req.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

authRouter.get("/me", async (req, res, next) => {
  try {
    const user = await getUserByToken(bearerToken(req));
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    res.json(await login(req.body?.email, req.body?.password));
  } catch (error) {
    next(error);
  }
});

authRouter.post("/logout", async (req, res, next) => {
  try {
    await logout(bearerToken(req));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

authRouter.post("/request-password-reset", async (req, res, next) => {
  try {
    res.json(await requestPasswordReset(req.body?.email));
  } catch (error) {
    next(error);
  }
});

authRouter.post("/reset-password", async (req, res, next) => {
  try {
    res.json(await resetPassword(req.body?.token, req.body?.password));
  } catch (error) {
    next(error);
  }
});
