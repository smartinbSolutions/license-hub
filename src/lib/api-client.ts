import { API_BASE_URL } from "@/lib/api-config";
import { getStoredAdminToken } from "@/lib/auth-context";

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(getStoredAdminToken() ? { Authorization: `Bearer ${getStoredAdminToken()}` } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let message = `Request failed with ${response.status}`;
    try {
      const body = await response.json();
      message = body.error ?? message;
    } catch {
      // Keep the status-based message when the server did not return JSON.
    }
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
