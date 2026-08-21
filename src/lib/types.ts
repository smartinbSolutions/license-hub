export type LicenseStatus = "active" | "inactive" | "expired" | "revoked";

export interface Activation {
  deviceHash: string;
  deviceName: string;
  appVersion: string;
  activatedAt: string;
  lastSeenAt?: string;
}

export interface License {
  id: string;
  licenseKey: string;
  customerName: string;
  customerEmail: string;
  planId: string;
  planName?: string;
  status: LicenseStatus;
  maxDevices: number;
  startsAt: string;
  perpetual: boolean;
  expiresAt: string | null;
  notes?: string;
  activations: Activation[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface Plan {
  id: string;
  name: string;
  maxDevices: number;
  perpetual: boolean;
  durationDays: number | null;
  price: number;
  currency: string;
  features: string[];
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  adminUid: string;
  adminEmail: string;
  licenseId?: string;
  licenseKey?: string;
  deviceHash?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ActivationAttempt {
  id: string;
  licenseKey: string;
  deviceHash: string;
  deviceName: string;
  appVersion: string;
  success: boolean;
  failureReason?: string;
  createdAt: string;
  ipAddress?: string;
}
