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

async function fetchTotalCommits(): Promise<number | null> {
  // Trick: per_page=1 + Link header rel="last" page index = total commit count
  const r = await fetch(`${BASE}/commits?per_page=1`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "hydra-evidence-page",
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
  const r = await fetch(`${BASE}/commits?per_page=5`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "hydra-evidence-page",
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
    headers: { "Cache-Control": "no-store" },
  });
}
