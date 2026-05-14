import { sign } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { privateKeyFile } from "../model/paths.js";

export function loadPrivateKey() {
  if (process.env.LICENSE_PRIVATE_KEY) return process.env.LICENSE_PRIVATE_KEY;
  if (existsSync(privateKeyFile)) return readFileSync(privateKeyFile, "utf8");
  return null;
}

export function signPayload(payload) {
  const privateKey = loadPrivateKey();
  if (!privateKey) return null;

  return sign("RSA-SHA256", Buffer.from(JSON.stringify(payload)), privateKey).toString("base64");
}
