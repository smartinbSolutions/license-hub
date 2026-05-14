import type { License } from "./types";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateLicenseKey(prefix = "POS"): string {
  const groups: string[] = [];
  const random = new Uint8Array(20);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(random);
  } else {
    for (let i = 0; i < random.length; i++) random[i] = Math.floor(Math.random() * 256);
  }
  for (let g = 0; g < 4; g++) {
    let s = "";
    for (let i = 0; i < 5; i++) s += ALPHABET[random[g * 5 + i] % ALPHABET.length];
    groups.push(s);
  }
  return `${prefix}-${groups.join("-")}`;
}

export function isExpired(license: Pick<License, "expiresAt">): boolean {
  return new Date(license.expiresAt).getTime() < Date.now();
}

export function shortHash(hash: string): string {
  if (!hash) return "";
  const clean = hash.replace(/^sha256:/, "");
  return clean.length > 12 ? `${clean.slice(0, 6)}…${clean.slice(-4)}` : clean;
}

export function copyToClipboard(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    return navigator.clipboard.writeText(text);
  }
  return Promise.resolve();
}
