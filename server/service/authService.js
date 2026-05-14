import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { badRequest, forbidden } from "../model/errors.js";
import { getCollections } from "../model/db.js";
import { generateId } from "../model/license.js";

const sessionDays = 7;
const resetMinutes = 30;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = String(storedHash || "").split(":");
  if (!salt || !hash) return false;

  const actual = Buffer.from(hashPassword(password, salt).split(":")[1], "hex");
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function publicAdmin(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export async function ensureDefaultAdmin() {
  const { adminUsers } = await getCollections();
  const count = await adminUsers.countDocuments();
  if (count > 0) return;

  const email = normalizeEmail(process.env.ADMIN_EMAIL || "admin@pos-license.local");
  const password = process.env.ADMIN_PASSWORD || "admin123456";

  await adminUsers.insertOne({
    id: generateId("admin"),
    email,
    name: "Admin",
    role: "admin",
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  console.log(`Created default admin user: ${email} / ${password}`);
}

export async function login(email, password) {
  const { adminUsers, adminSessions } = await getCollections();
  const user = await adminUsers.findOne({ email: normalizeEmail(email) });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw forbidden("Invalid email or password");
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + sessionDays * 86400_000);

  await adminSessions.insertOne({
    token,
    userId: user.id,
    createdAt: new Date(),
    expiresAt,
  });

  return {
    token,
    user: publicAdmin(user),
  };
}

export async function logout(token) {
  if (!token) return;
  const { adminSessions } = await getCollections();
  await adminSessions.deleteOne({ token });
}

export async function getUserByToken(token) {
  if (!token) return null;

  const { adminUsers, adminSessions } = await getCollections();
  const session = await adminSessions.findOne({ token, expiresAt: { $gt: new Date() } });
  if (!session) return null;

  const user = await adminUsers.findOne({ id: session.userId });
  return user ? publicAdmin(user) : null;
}

export async function requestPasswordReset(email) {
  const { adminUsers, adminPasswordResets } = await getCollections();
  const user = await adminUsers.findOne({ email: normalizeEmail(email) });

  if (!user) return { ok: true };

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + resetMinutes * 60_000);

  await adminPasswordResets.insertOne({
    token,
    userId: user.id,
    used: false,
    createdAt: new Date(),
    expiresAt,
  });

  console.log(`Password reset token for ${user.email}: ${token}`);
  return { ok: true, resetToken: token };
}

export async function resetPassword(token, password) {
  if (!token || !password || String(password).length < 8) {
    throw badRequest("Reset token and an 8+ character password are required");
  }

  const { adminUsers, adminPasswordResets } = await getCollections();
  const reset = await adminPasswordResets.findOne({
    token,
    used: false,
    expiresAt: { $gt: new Date() },
  });

  if (!reset) throw forbidden("Invalid or expired reset token");

  await adminUsers.updateOne(
    { id: reset.userId },
    {
      $set: {
        passwordHash: hashPassword(password),
        updatedAt: new Date().toISOString(),
      },
    }
  );
  await adminPasswordResets.updateOne({ token }, { $set: { used: true } });

  return { ok: true };
}
