export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const REPO = "Mithran-MV/Hydra";
const BASE = `https://api.github.com/repos/${REPO}`;

interface CommitSummary {
  sha: string;
  shortSha: string;
  subject: string;
  author: string;
  date: string;
  htmlUrl: string;
}

interface CommitsSnapshot {
  refreshedAt: number;
  repo: string;
  totalCommits: number | null;
  recent: CommitSummary[];
}

// Per-request nonce to bust any edge / fetch caching between us and GitHub.
// Without this, Cloudflare in front of hydra.hacklabs.in occasionally serves
// a stale Response.json snapshot back to clients even with `cache: "no-store"`,
// which leaves the chronicle page showing older commits long after a push.
function nonce(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function fetchTotalCommits(): Promise<number | null> {
  // Trick: per_page=1 + Link header rel="last" page index = total commit count
  const r = await fetch(`${BASE}/commits?per_page=1&_=${nonce()}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "hydra-evidence-page",
      "Cache-Control": "no-cache",
    },
    cache: "no-store",
  });
  if (!r.ok) return null;
  const link = r.headers.get("link") ?? "";
  const m = link.match(/[?&]page=(\d+)>;\s*rel="last"/);
  if (m) return Number(m[1]);
  // Single page case (very small repos): the count is whatever's in the body
  const body = (await r.json()) as unknown[];
  return Array.isArray(body) ? body.length : null;
}

async function fetchRecent(): Promise<CommitSummary[]> {
  const r = await fetch(`${BASE}/commits?per_page=5&_=${nonce()}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "hydra-evidence-page",
      "Cache-Control": "no-cache",
    },
    cache: "no-store",
  });
  if (!r.ok) return [];
  const body = (await r.json()) as Array<{
    sha: string;
    html_url: string;
    commit: {
      message: string;
      author: { name: string; date: string };
    };
  }>;
  return body.map((c) => ({
    sha: c.sha,
    shortSha: c.sha.slice(0, 7),
    subject: c.commit.message.split("\n")[0],
    author: c.commit.author.name,
    date: c.commit.author.date,
    htmlUrl: c.html_url,
  }));
}

export async function GET() {
  const refreshedAt = Date.now();
  const [total, recent] = await Promise.all([
    fetchTotalCommits().catch(() => null),
    fetchRecent().catch(() => []),
  ]);
  const snap: CommitsSnapshot = {
    refreshedAt,
    repo: REPO,
    totalCommits: total,
    recent,
  };
  return Response.json(snap, {
    headers: {
      // Belt + braces: explicit no-store for browser, Pragma for legacy
      // proxies, Surrogate-Control to bypass Cloudflare's edge cache (which
      // otherwise serves stale snapshots even when the origin says no-store).
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
      "Surrogate-Control": "no-store",
      "CDN-Cache-Control": "no-store",
    },
  });
}
