import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const serverDir = dirname(dirname(fileURLToPath(import.meta.url)));

export const rootDir = join(serverDir, "..");
export const dataDir = join(rootDir, "data");
export const dataFile = join(dataDir, "licenses.json");
export const privateKeyFile = join(serverDir, "keys", "private.pem");
