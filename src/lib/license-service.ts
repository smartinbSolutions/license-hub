import { API_BASE_URL } from "@/lib/api-config";
import { getStoredAdminToken } from "@/lib/auth-context";
import type { License } from "@/lib/types";

const refreshEvents = new EventTarget();

async function request<T>(path: string, init?: RequestInit): Promise<T> {
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

function notifyRefresh() {
  refreshEvents.dispatchEvent(new Event("refresh"));
}

export function subscribeToLicenses(
  onNext: (licenses: License[]) => void,
  onError: (error: Error) => void
) {
  let active = true;

  async function load() {
    try {
      const licenses = await request<License[]>("/api/licenses");
      if (active) onNext(licenses);
    } catch (error) {
      if (active) onError(error instanceof Error ? error : new Error("Unable to load licenses"));
    }
  }

  const interval = window.setInterval(load, 5000);
  refreshEvents.addEventListener("refresh", load);
  void load();

  return () => {
    active = false;
    window.clearInterval(interval);
    refreshEvents.removeEventListener("refresh", load);
  };
}

export function subscribeToLicense(
  id: string,
  onNext: (license: License | null) => void,
  onError: (error: Error) => void
) {
  let active = true;

  async function load() {
    try {
      const license = await request<License>(`/api/licenses/${id}`);
      if (active) onNext(license);
    } catch (error) {
      if (!active) return;
      if (error instanceof Error && error.message === "license_not_found") {
        onNext(null);
      } else {
        onError(error instanceof Error ? error : new Error("Unable to load license"));
      }
    }
  }

  const interval = window.setInterval(load, 5000);
  refreshEvents.addEventListener("refresh", load);
  void load();

  return () => {
    active = false;
    window.clearInterval(interval);
    refreshEvents.removeEventListener("refresh", load);
  };
}

export async function createLicense(data: Partial<License>) {
  const license = await request<License>("/api/licenses", {
    method: "POST",
    body: JSON.stringify(data),
  });
  notifyRefresh();
  return license;
}

export async function updateLicense(id: string, data: Partial<License>) {
  const license = await request<License>(`/api/licenses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  notifyRefresh();
  return license;
}

export async function resetLicenseDevices(id: string) {
  const license = await request<License>(`/api/licenses/${id}/reset-devices`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  notifyRefresh();
  return license;
}

export async function deleteLicense(id: string) {
  await request<void>(`/api/licenses/${id}`, { method: "DELETE" });
  notifyRefresh();
}
