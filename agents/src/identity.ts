import { readFile } from "node:fs/promises";
import { createPrivateKey, createPublicKey, sign as nodeSign } from "node:crypto";
import { ed25519 } from "@noble/curves/ed25519";
import { keccak_256 } from "@noble/hashes/sha3";
import { privateKeyToAccount } from "viem/accounts";
import type { Account } from "viem";
import type { HexAddress } from "../../shared/types";

export interface Identity {
  /** Stable HeadId — equal to AXL peer-id (ed25519 pubkey hex). */
  id: string;
  index: number;
  axlPublicKeyHex: string;
  axlPrivateKey: Uint8Array;
  wallet: HexAddress;
  account: Account;
  sign: (data: Uint8Array | string) => Uint8Array;
}

function pemToRawEd25519PrivateKey(pem: string): Uint8Array {
  // PEM is PKCS#8 format. The ed25519 32-byte raw key sits at the end of the DER.
  const keyObj = createPrivateKey({ key: pem, format: "pem" });
  const der = keyObj.export({ format: "der", type: "pkcs8" });
  // Raw key is the last 32 bytes of the PKCS#8 DER for ed25519.
  return new Uint8Array(der.subarray(der.length - 32));
}

function deriveEvmKey(masterPk: HexAddress, headIndex: number): HexAddress {
  // Deterministic hackathon HD: keccak256(masterPK || headIndex || "hydra")
  // Not BIP32 — documented in README.
  const masterBytes = Uint8Array.from(
    Buffer.from(masterPk.replace(/^0x/, ""), "hex"),
  );
  const idxBytes = Buffer.alloc(4);
  idxBytes.writeUInt32BE(headIndex, 0);
  const tag = Buffer.from("hydra");
  const combined = Buffer.concat([masterBytes, idxBytes, tag]);
  const hash = keccak_256(combined);
  return ("0x" + Buffer.from(hash).toString("hex")) as HexAddress;
}

export async function loadIdentity(headIndex: number): Promise<Identity> {
  const pemPath = `keys/h${headIndex}.pem`;
  const pem = await readFile(pemPath, "utf8");

  const privKey = pemToRawEd25519PrivateKey(pem);
  const pubKey = ed25519.getPublicKey(privKey);
  const peerIdHex = Buffer.from(pubKey).toString("hex");

  const masterPk = process.env.OG_CHAIN_PK as HexAddress | undefined;
  if (!masterPk) {
    throw new Error("OG_CHAIN_PK missing in env");
  }
  const childPk = deriveEvmKey(masterPk, headIndex);
  const account = privateKeyToAccount(childPk);

  const keyObj = createPrivateKey({ key: pem, format: "pem" });

  return {
    id: peerIdHex,
    index: headIndex,
    axlPublicKeyHex: peerIdHex,
    axlPrivateKey: privKey,
    wallet: account.address,
    account,
    sign: (data) => {
      const buf = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
      return new Uint8Array(nodeSign(null, buf, keyObj));
    },
  };
}

export async function publicKeyHexFromPemFile(path: string): Promise<string> {
  const pem = await readFile(path, "utf8");
  const keyObj = createPrivateKey({ key: pem, format: "pem" });
  const pubKeyObj = createPublicKey(keyObj);
  const der = pubKeyObj.export({ format: "der", type: "spki" });
  // Raw 32-byte ed25519 pub key is last 32 bytes of SPKI DER.
  return Buffer.from(der.subarray(der.length - 32)).toString("hex");
}
