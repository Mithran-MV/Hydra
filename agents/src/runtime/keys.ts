import { generateKeyPairSync } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Generate a fresh ed25519 keypair and write the PKCS#8 PEM private key.
 * Used at runtime when spawning resurrection children.
 */
export async function generateEd25519Pem(path: string): Promise<void> {
  if (existsSync(path)) {
    throw new Error(`refusing to overwrite existing key: ${path}`);
  }
  await mkdir(dirname(path), { recursive: true });
  const { privateKey } = generateKeyPairSync("ed25519");
  const pem = privateKey.export({ format: "pem", type: "pkcs8" });
  const text = typeof pem === "string" ? pem : pem.toString("utf8");
  await writeFile(path, text, { mode: 0o600 });
}
