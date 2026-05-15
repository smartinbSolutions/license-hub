import cors from "cors";
import express from "express";
import { ensureIndexes } from "./model/db.js";
import { requireAdmin } from "./middleware/requireAdmin.js";
import { activationRouter } from "./route/activationRoutes.js";
import { activationAttemptRouter, auditLogRouter } from "./route/activityRoutes.js";
import { authRouter } from "./route/authRoutes.js";
import { licenseRouter } from "./route/licenseRoutes.js";
import { planRouter } from "./route/planRoutes.js";
import { ensureDefaultAdmin } from "./service/authService.js";

const app = express();
const port = Number(process.env.PORT ?? 8787);

app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api", activationRouter);
app.use("/api/plans", requireAdmin, planRouter);
app.use("/api/licenses", requireAdmin, licenseRouter);
app.use("/api/audit-logs", requireAdmin, auditLogRouter);
app.use("/api/activation-attempts", requireAdmin, activationAttemptRouter);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status ?? 500).json({ error: error.message ?? "server_error" });
});

try {
  await ensureIndexes();
  await ensureDefaultAdmin();
  app.listen(port, () => {
    console.log(`License API listening on http://127.0.0.1:${port}`);
  });
} catch (error) {
  console.error("Failed to start License API", error);
  process.exitCode = 1;
}
