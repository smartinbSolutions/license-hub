import { apiRequest } from "@/lib/api-client";
import type { ActivationAttempt, AuditLog } from "@/lib/types";

export async function listAuditLogs(licenseId?: string) {
  const query = licenseId ? `?licenseId=${encodeURIComponent(licenseId)}` : "";
  return apiRequest<AuditLog[]>(`/api/audit-logs${query}`);
}

export async function listActivationAttempts() {
  return apiRequest<ActivationAttempt[]>("/api/activation-attempts");
}
