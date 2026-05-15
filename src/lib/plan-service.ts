import { apiRequest } from "@/lib/api-client";
import type { Plan } from "@/lib/types";

export async function listPlans() {
  return apiRequest<Plan[]>("/api/plans");
}

export async function createPlan(data: Partial<Plan>) {
  return apiRequest<Plan>("/api/plans", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updatePlan(id: string, data: Partial<Plan>) {
  return apiRequest<Plan>(`/api/plans/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deletePlan(id: string) {
  return apiRequest<void>(`/api/plans/${id}`, { method: "DELETE" });
}
