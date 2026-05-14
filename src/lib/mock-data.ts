import type { License, Plan, AuditLog, ActivationAttempt } from "./types";

const now = Date.now();
const day = 86400000;

export const mockPlans: Plan[] = [
  {
    id: "plan_starter",
    name: "Starter",
    maxDevices: 1,
    durationDays: 365,
    price: 99,
    currency: "USD",
    features: ["Single terminal", "Email support"],
    status: "active",
    createdAt: new Date(now - 120 * day).toISOString(),
    updatedAt: new Date(now - 30 * day).toISOString(),
  },
  {
    id: "plan_business",
    name: "Business",
    maxDevices: 3,
    durationDays: 365,
    price: 249,
    currency: "USD",
    features: ["3 terminals", "Inventory", "Priority support"],
    status: "active",
    createdAt: new Date(now - 100 * day).toISOString(),
    updatedAt: new Date(now - 10 * day).toISOString(),
  },
  {
    id: "plan_enterprise",
    name: "Enterprise",
    maxDevices: 10,
    durationDays: 365,
    price: 799,
    currency: "USD",
    features: ["10 terminals", "Multi-location", "SLA", "Dedicated CSM"],
    status: "active",
    createdAt: new Date(now - 90 * day).toISOString(),
    updatedAt: new Date(now - 5 * day).toISOString(),
  },
];

const customers = [
  ["Acme Coffee Co.", "ops@acmecoffee.com"],
  ["Bluebird Bistro", "owner@bluebirdbistro.com"],
  ["Corner Mart", "admin@cornermart.io"],
  ["Daily Grind", "hello@dailygrind.shop"],
  ["Elm Street Diner", "contact@elmstdiner.com"],
  ["Fresh Greens", "support@freshgreens.co"],
  ["Golden Bakery", "team@goldenbakery.com"],
  ["Harbor Books", "info@harborbooks.io"],
];

function makeKey(seed: number) {
  const groups: string[] = [];
  for (let g = 0; g < 4; g++) {
    let s = "";
    for (let i = 0; i < 5; i++) {
      const v = (seed * (g + 1) * (i + 7)) % 36;
      s += "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[v % 32];
    }
    groups.push(s);
  }
  return `POS-${groups.join("-")}`;
}

export const mockLicenses: License[] = customers.map((c, i) => {
  const plan = mockPlans[i % mockPlans.length];
  const expiryOffset = i === 1 ? -10 : i === 4 ? -2 : 200 + i * 12;
  const status =
    i === 6 ? "revoked" : i === 7 ? "inactive" : expiryOffset < 0 ? "expired" : "active";
  const used = Math.min(plan.maxDevices, (i % (plan.maxDevices + 1)));
  const activations = Array.from({ length: used }).map((_, k) => ({
    deviceHash: `sha256:${(i * 1000 + k * 31).toString(16).padStart(8, "0")}${"abcdef0123456789".repeat(4).slice(0, 56)}`,
    deviceName: ["Counter Mac", "Backoffice PC", "Terminal-2", "Kitchen Display"][k % 4],
    appVersion: "1.4.2",
    activatedAt: new Date(now - (30 - i - k) * day).toISOString(),
    lastSeenAt: new Date(now - (1 + k) * day).toISOString(),
  }));
  return {
    id: `lic_${i + 1}`,
    licenseKey: makeKey(i + 11),
    customerName: c[0],
    customerEmail: c[1],
    planId: plan.id,
    planName: plan.name,
    status: status as License["status"],
    maxDevices: plan.maxDevices,
    startsAt: new Date(now - (60 + i * 10) * day).toISOString(),
    expiresAt: new Date(now + expiryOffset * day).toISOString(),
    notes: i === 0 ? "Pilot account, escalate if issues." : "",
    activations,
    createdAt: new Date(now - (60 + i * 10) * day).toISOString(),
    updatedAt: new Date(now - i * day).toISOString(),
    createdBy: "admin@pos-license.app",
  };
});

export const mockAuditLogs: AuditLog[] = Array.from({ length: 18 }).map((_, i) => ({
  id: `log_${i + 1}`,
  action: [
    "license.created",
    "license.updated",
    "license.revoked",
    "device.reset",
    "admin.login",
    "license.activated",
  ][i % 6],
  adminUid: "uid_admin_01",
  adminEmail: "admin@pos-license.app",
  licenseId: mockLicenses[i % mockLicenses.length].id,
  licenseKey: mockLicenses[i % mockLicenses.length].licenseKey,
  deviceHash: i % 3 === 0 ? mockLicenses[i % mockLicenses.length].activations[0]?.deviceHash : undefined,
  metadata: { source: "dashboard" },
  createdAt: new Date(now - i * 3600_000).toISOString(),
  ipAddress: "10.0.0.42",
  userAgent: "Mozilla/5.0 Chrome/130",
}));

export const mockActivationAttempts: ActivationAttempt[] = Array.from({ length: 14 }).map(
  (_, i) => ({
    id: `att_${i + 1}`,
    licenseKey: mockLicenses[i % mockLicenses.length].licenseKey,
    deviceHash: `sha256:${i.toString(16).padStart(8, "0")}…`,
    deviceName: ["Counter", "Backoffice", "Terminal-2"][i % 3],
    appVersion: "1.4.2",
    success: i % 4 !== 0,
    failureReason: i % 4 === 0 ? "device_limit_reached" : undefined,
    createdAt: new Date(now - i * 1800_000).toISOString(),
    ipAddress: "192.168." + (i + 1) + ".10",
  })
);

// 30-day activations time series
export const mockActivationSeries = Array.from({ length: 30 }).map((_, i) => {
  const d = new Date(now - (29 - i) * day);
  return {
    date: d.toISOString().slice(5, 10),
    activations: 2 + Math.round(Math.sin(i / 3) * 3 + (i % 5)),
  };
});
