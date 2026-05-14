/**
 * Cloud Functions for POS License Manager
 * --------------------------------------------------------------
 * Deploy to Firebase project `pos-license-manager`.
 *
 *   firebase init functions
 *   firebase functions:secrets:set LICENSE_PRIVATE_KEY
 *   firebase deploy --only functions
 *
 * Generate the RSA-2048 keypair locally:
 *   openssl genpkey -algorithm RSA -out private.pem -pkeyopt rsa_keygen_bits:2048
 *   openssl rsa -in private.pem -pubout -out public.pem
 *
 * Store the contents of private.pem in the LICENSE_PRIVATE_KEY secret.
 * Embed public.pem into the Electron app for offline verification.
 */

const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();

const LICENSE_PRIVATE_KEY = defineSecret("LICENSE_PRIVATE_KEY");

// ---------- helpers ----------

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateLicenseKey(prefix = "POS") {
  const bytes = crypto.randomBytes(20);
  const groups = [];
  for (let g = 0; g < 4; g++) {
    let s = "";
    for (let i = 0; i < 5; i++) s += ALPHABET[bytes[g * 5 + i] % ALPHABET.length];
    groups.push(s);
  }
  return `${prefix}-${groups.join("-")}`;
}

async function requireAdmin(req) {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required");
  if (req.auth.token.admin !== true) {
    throw new HttpsError("permission-denied", "Admin only");
  }
  return { uid, email: req.auth.token.email };
}

async function writeAuditLog(entry) {
  await db.collection("auditLogs").add({
    ...entry,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

function signPayload(payload, privateKeyPem) {
  const data = Buffer.from(JSON.stringify(payload));
  const signature = crypto.sign("RSA-SHA256", data, privateKeyPem);
  return signature.toString("base64");
}

// ---------- Admin callable functions ----------

exports.createLicense = onCall(async (req) => {
  const admin_ = await requireAdmin(req);
  const {
    licenseKey,
    customerName,
    customerEmail,
    planId,
    status = "active",
    maxDevices = 1,
    startsAt,
    expiresAt,
    notes,
  } = req.data || {};

  if (!customerName || !customerEmail || !planId || !expiresAt) {
    throw new HttpsError("invalid-argument", "Missing required fields");
  }
  const key = (licenseKey || generateLicenseKey()).toUpperCase();

  const dup = await db.collection("licenses").where("licenseKey", "==", key).limit(1).get();
  if (!dup.empty) throw new HttpsError("already-exists", "License key already exists");

  const now = admin.firestore.FieldValue.serverTimestamp();
  const ref = await db.collection("licenses").add({
    licenseKey: key,
    customerName,
    customerEmail,
    planId,
    status,
    maxDevices: Number(maxDevices),
    startsAt: new Date(startsAt || Date.now()),
    expiresAt: new Date(expiresAt),
    notes: notes || "",
    activations: [],
    createdAt: now,
    updatedAt: now,
    createdBy: admin_.email,
    updatedBy: admin_.email,
  });

  await writeAuditLog({
    action: "license.created",
    adminUid: admin_.uid,
    adminEmail: admin_.email,
    licenseId: ref.id,
    licenseKey: key,
  });
  return { id: ref.id, licenseKey: key };
});

exports.updateLicense = onCall(async (req) => {
  const admin_ = await requireAdmin(req);
  const { id, ...updates } = req.data || {};
  if (!id) throw new HttpsError("invalid-argument", "License id required");

  const ref = db.collection("licenses").doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw new HttpsError("not-found", "License not found");

  if (updates.startsAt) updates.startsAt = new Date(updates.startsAt);
  if (updates.expiresAt) updates.expiresAt = new Date(updates.expiresAt);

  await ref.update({
    ...updates,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: admin_.email,
  });
  await writeAuditLog({
    action: "license.updated",
    adminUid: admin_.uid,
    adminEmail: admin_.email,
    licenseId: id,
    licenseKey: doc.data().licenseKey,
    metadata: updates,
  });
  return { ok: true };
});

exports.resetLicenseDevices = onCall(async (req) => {
  const admin_ = await requireAdmin(req);
  const { id } = req.data || {};
  const ref = db.collection("licenses").doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw new HttpsError("not-found", "License not found");

  await ref.update({
    activations: [],
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: admin_.email,
  });
  await writeAuditLog({
    action: "device.reset",
    adminUid: admin_.uid,
    adminEmail: admin_.email,
    licenseId: id,
    licenseKey: doc.data().licenseKey,
  });
  return { ok: true };
});

exports.deleteLicense = onCall(async (req) => {
  const admin_ = await requireAdmin(req);
  const { id } = req.data || {};
  const ref = db.collection("licenses").doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw new HttpsError("not-found", "License not found");

  await ref.delete();
  await writeAuditLog({
    action: "license.deleted",
    adminUid: admin_.uid,
    adminEmail: admin_.email,
    licenseId: id,
    licenseKey: doc.data().licenseKey,
  });
  return { ok: true };
});

// ---------- Public activation endpoint ----------

exports.activateLicense = onRequest(
  { secrets: [LICENSE_PRIVATE_KEY], cors: true },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "method_not_allowed" });
    }

    const { licenseKey, deviceHash, deviceName, appVersion } = req.body || {};
    const ip = req.headers["x-forwarded-for"] || req.ip;

    async function recordAttempt(success, failureReason) {
      await db.collection("activationAttempts").add({
        licenseKey: licenseKey || null,
        deviceHash: deviceHash || null,
        deviceName: deviceName || null,
        appVersion: appVersion || null,
        success,
        failureReason: failureReason || null,
        ipAddress: ip,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    if (!licenseKey || !deviceHash) {
      await recordAttempt(false, "missing_fields");
      return res.status(400).json({ error: "missing_fields" });
    }

    const snap = await db
      .collection("licenses")
      .where("licenseKey", "==", String(licenseKey).toUpperCase())
      .limit(1)
      .get();

    if (snap.empty) {
      await recordAttempt(false, "not_found");
      return res.status(404).json({ error: "license_not_found" });
    }

    const ref = snap.docs[0].ref;
    const license = snap.docs[0].data();

    if (license.status !== "active") {
      await recordAttempt(false, `status_${license.status}`);
      return res.status(403).json({ error: `license_${license.status}` });
    }

    const expiresAt = license.expiresAt.toDate
      ? license.expiresAt.toDate()
      : new Date(license.expiresAt);
    if (expiresAt.getTime() < Date.now()) {
      await recordAttempt(false, "expired");
      return res.status(403).json({ error: "license_expired" });
    }

    const activations = license.activations || [];
    const existingIdx = activations.findIndex((a) => a.deviceHash === deviceHash);

    if (existingIdx === -1) {
      if (activations.length >= license.maxDevices) {
        await recordAttempt(false, "device_limit_reached");
        return res.status(403).json({ error: "device_limit_reached" });
      }
      activations.push({
        deviceHash,
        deviceName: deviceName || "unknown",
        appVersion: appVersion || "unknown",
        activatedAt: new Date(),
        lastSeenAt: new Date(),
      });
    } else {
      activations[existingIdx] = {
        ...activations[existingIdx],
        lastSeenAt: new Date(),
        appVersion: appVersion || activations[existingIdx].appVersion,
      };
    }

    await ref.update({
      activations,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const issuedAt = new Date().toISOString();
    const payload = {
      licenseKey: license.licenseKey,
      deviceHash,
      issuedAt,
      expiresAt: expiresAt.toISOString(),
      maxDevices: license.maxDevices,
      planId: license.planId,
    };
    const signature = signPayload(payload, LICENSE_PRIVATE_KEY.value());

    await recordAttempt(true);
    return res.status(200).json({ payload, signature });
  }
);
