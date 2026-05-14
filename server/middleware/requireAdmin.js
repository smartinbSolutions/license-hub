import { forbidden } from "../model/errors.js";
import { getUserByToken } from "../service/authService.js";

export async function requireAdmin(req, _res, next) {
  try {
    const header = req.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    const user = await getUserByToken(token);

    if (!user) throw forbidden("Admin login required");

    req.admin = user;
    next();
  } catch (error) {
    next(error);
  }
}
