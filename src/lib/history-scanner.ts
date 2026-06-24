// SecretScout Pro — Historical Commit Scanner
// Scans git history for secrets that were committed and then deleted/rotated.

import { BUILTIN_RULES, buildDedupHash, type DetectionRuleDef } from './detection-rules';
import { db } from './db';

interface CommitDiff {
  sha: string;
  message: string;
  author: string;
  date: string;
  files: Array<{
    filename: string;
    patch?: string;
    status: string;
  }>;
}

interface HistoryScanConfig {
  organizationId: string;
  scanId: string;
  repo: string;
  token: string;
  since?: string;
  until?: string;
  maxCommits?: number;
}

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.svg',
  '.mp3', '.mp4', '.avi', '.mov', '.zip', '.tar', '.gz', '.pdf',
  '.exe', '.dll', '.so', '.dylib', '.bin', '.woff', '.woff2', '.ttf',
]);

function isBinaryFile(filename: string): boolean {
  const ext = '.' + filename.split('.').pop()?.toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class HistoryScanner {
  private abortController: AbortController | null = null;

  abort() {
    this.abortController?.abort();
  }

  async scanHistory(config: HistoryScanConfig): Promise<{ scanned: number; findings: number; duplicates: number }> {
    const { organizationId, scanId, repo, token, since, until, maxCommits = 500 } = config;
    this.abortController = new AbortController();

    let scanned = 0;
    let findings = 0;
    let duplicates = 0;
    let page = 1;
    const perPage = 100;

    while (scanned < maxCommits && !this.abortController.signal.aborted) {
      const commits = await this.fetchCommits(repo, token, page, perPage, since, until);
      if (commits.length === 0) break;

      for (const commit of commits) {
        if (this.abortController.signal.aborted) break;
        if (scanned >= maxCommits) break;

        const diffs = await this.fetchCommitDiffs(repo, token, commit.sha);
        for (const diff of diffs) {
          if (!diff.patch || isBinaryFile(diff.filename)) continue;

          const patchContent = diff.patch;
          for (const rule of BUILTIN_RULES) {
            try {
              const rx = new RegExp(rule.pattern, 'g');
              const matches = patchContent.matchAll(rx);
              for (const match of matches) {
                const val = rule.secretGroup > 0 && match[rule.secretGroup] ? match[rule.secretGroup] : match[0];
                if (!val) continue;

                const dv = val.length > 200 ? val.substring(0, 200) + '...' : val;
                const hash = buildDedupHash(diff.filename, rule.id, dv, commit.sha.substring(0, 12));

                const existing = await db.finding.findUnique({ where: { dedupHash: hash } });
                if (existing) { duplicates++; continue; }

                findings++;
                const f = await db.finding.create({
                  data: {
                    organizationId, scanId, ruleId: rule.id,
                    dedupHash: hash, secretType: `${rule.name} (historical)`,
                    matchedPattern: rule.pattern, matchedValue: dv,
                    fileUrl: `https://github.com/${repo}/blob/${commit.sha}/${diff.filename}`,
                    filePath: diff.filename,
                    repoName: repo, repoUrl: `https://github.com/${repo}`,
                    commitHash: commit.sha.substring(0, 12),
                    commitUrl: `https://github.com/${repo}/commit/${commit.sha}`,
                    commitMessage: commit.message,
                    commitAuthor: commit.author,
                    commitDate: new Date(commit.date),
                    branch: 'main', lineNumber: null,
                    severity: rule.severity,
                    isVerified: false, isAstFiltered: false, isStillPresent: false,
                    isForkMatch: false, upstreamRepo: null, status: 'open',
                  },
                });

                await db.findingEvent.create({
                  data: { findingId: f.id, eventType: 'discovered', actor: 'history-scanner', note: `Found in commit ${commit.sha.substring(0, 7)} — may have been deleted/rotated` },
                });
              }
            } catch { /* regex compile error */ }
          }
        }

        scanned++;
        await sleep(100);
      }

      page++;
      await sleep(1000);
    }

    return { scanned, findings, duplicates };
  }

  private async fetchCommits(repo: string, token: string, page: number, perPage: number, since?: string, until?: string): Promise<Array<{ sha: string; message: string; author: string; date: string }>> {
    const params = new URLSearchParams({ per_page: String(perPage), page: String(page) });
    if (since) params.set('since', since);
    if (until) params.set('until', until);

    const res = await fetch(`https://api.github.com/repos/${repo}/commits?${params}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'SecretScout-Pro/1.0' },
    });

    if (!res.ok) return [];

    const data = await res.json();
    return data.map((c: Record<string, unknown>) => ({
      sha: c.sha as string,
      message: (c.commit as Record<string, string>)?.message?.split('\n')[0] || '',
      author: (c.commit as Record<string, Record<string, string>>)?.author?.name || 'unknown',
      date: (c.commit as Record<string, Record<string, string>>)?.author?.date || '',
    }));
  }

  private async fetchCommitDiffs(repo: string, token: string, sha: string): Promise<Array<{ filename: string; patch?: string; status: string }>> {
    const res = await fetch(`https://api.github.com/repos/${repo}/commits/${sha}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'SecretScout-Pro/1.0' },
    });

    if (!res.ok) return [];

    const data = await res.json();
    return (data.files || []).map((f: Record<string, unknown>) => ({
      filename: f.filename as string,
      patch: f.patch as string | undefined,
      status: f.status as string,
    }));
  }
}

export const historyScanner = new HistoryScanner();
