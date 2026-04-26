import { keccak_256 } from "@noble/hashes/sha3";
import type { HeadId } from "../../../shared/types";

const PROTOCOL_PREFIX = "hydra-v1";

function streamId(label: string): Uint8Array {
  return keccak_256(Buffer.from(`${PROTOCOL_PREFIX}:${label}`));
}

export const streams = {
  state: (headId: HeadId): Uint8Array => streamId(`state:${headId}`),
  events: (headId: HeadId): Uint8Array => streamId(`events:${headId}`),
  scarsGlobal: (): Uint8Array => streamId("scars:global"),
};
