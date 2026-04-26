import { writeFile, readdir, mkdir } from "node:fs/promises";

export interface AxlPorts {
  apiPort: number;
  listenPort: number;
}

export function portsForHead(headIndex: number): AxlPorts {
  // h1 → listen 9001, api 9002 ; h2 → 9011/9012 ; h3 → 9021/9022 ; …
  return {
    listenPort: 9001 + (headIndex - 1) * 10,
    apiPort: 9002 + (headIndex - 1) * 10,
  };
}

export async function writeAxlConfig(headIndex: number): Promise<string> {
  await mkdir("configs", { recursive: true });
  const { listenPort, apiPort } = portsForHead(headIndex);
  const config = {
    PrivateKeyPath: `keys/h${headIndex}.pem`,
    Peers: ["tls://127.0.0.1:9001"], // bootstrap from head-1
    Listen: [`tls://127.0.0.1:${listenPort}`],
    api_port: apiPort,
  };
  const path = `configs/h${headIndex}.json`;
  await writeFile(path, JSON.stringify(config, null, 2));
  return path;
}

/** Find the next free head index by scanning keys/. */
export async function nextFreeHeadIndex(
  startAt = 1,
  keysDir = "keys",
): Promise<number> {
  let entries: string[] = [];
  try {
    entries = await readdir(keysDir);
  } catch {
    return startAt;
  }
  const used = new Set<number>();
  for (const f of entries) {
    const m = f.match(/^h(\d+)\.pem$/);
    if (m) used.add(Number(m[1]));
  }
  let i = startAt;
  while (used.has(i)) i++;
  return i;
}
