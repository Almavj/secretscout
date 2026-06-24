// SecretScout Pro — GitHub API Client

interface GitHubSearchResult {
  name: string; path: string; sha: string; html_url: string; size?: number;
  repository: { full_name: string; html_url: string; fork: boolean; parent?: { full_name: string } };
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  used: number;
}

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.svg',
  '.mp3', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm',
  '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.exe', '.dll', '.so', '.dylib', '.bin',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.sqlite', '.db',
]);

const MAX_FILE_SIZE = 1024 * 1024; // 1MB — skip larger files

function isBinaryFile(path: string): boolean {
  const ext = '.' + path.split('.').pop()?.toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class GitHubClient {
  private tokens: Array<{ token: string; label: string; id: string }> = [];
  private idx = 0;

  addToken(t: { token: string; label: string; id: string }) { this.tokens.push(t); }
  get size() { return this.tokens.length; }

  private nextToken() {
    if (this.tokens.length === 0) return null;
    return this.tokens[this.idx++ % this.tokens.length];
  }

  buildQuery(template: string, placeholders: Record<string, string>): string {
    let q = template;
    for (const [k, v] of Object.entries(placeholders)) q = q.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    return q;
  }

  async codeSearch(query: string, opts?: { perPage?: number; page?: number }): Promise<{ results: GitHubSearchResult[]; totalCount: number; rateLimit: RateLimitInfo }> {
    const t = this.nextToken();
    if (!t) throw new Error('No GitHub tokens configured. Add a token in Settings.');

    const params = new URLSearchParams({
      q: query,
      per_page: String(opts?.perPage || 30),
      page: String(opts?.page || 1),
    });

    const res = await fetch(`https://api.github.com/search/code?${params}`, {
      headers: {
        'Authorization': `Bearer ${t.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'SecretScout-Pro/1.0',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    const rateLimit: RateLimitInfo = {
      limit: Number(res.headers.get('x-ratelimit-limit') || 30),
      remaining: Number(res.headers.get('x-ratelimit-remaining') || 0),
      reset: Number(res.headers.get('x-ratelimit-reset') || 0),
      used: Number(res.headers.get('x-ratelimit-used') || 0),
    };

    if (res.status === 403 && rateLimit.remaining === 0) {
      const waitMs = Math.max((rateLimit.reset * 1000) - Date.now(), 1000);
      throw new RateLimitError(`Rate limit exhausted. Resets in ${Math.ceil(waitMs / 1000)}s`, rateLimit.reset, waitMs);
    }

    if (res.status === 403) throw new Error(`GitHub rate limit exceeded (secondary). Reset at ${new Date(rateLimit.reset * 1000).toISOString()}`);
    if (res.status === 401) throw new Error(`GitHub token "${t.label}" is invalid or expired.`);
    if (!res.ok) throw new Error(`GitHub API error (${res.status}): ${await res.text()}`);

    const data = await res.json();
    return { results: (data.items || []) as GitHubSearchResult[], totalCount: data.total_count, rateLimit };
  }

  async fetchFileContent(repo: string, path: string): Promise<string | null> {
    const t = this.nextToken();
    if (!t) throw new Error('No GitHub tokens configured.');

    if (isBinaryFile(path)) return null;

    const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      headers: {
        'Authorization': `Bearer ${t.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'SecretScout-Pro/1.0',
      },
    });

    if (!res.ok) return null;

    const contentLength = Number(res.headers.get('content-length') || 0);
    if (contentLength > MAX_FILE_SIZE) return null;

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/octet-stream')) return null;

    const json = await res.json();
    if (json.size && json.size > MAX_FILE_SIZE) return null;

    const downloadUrl = json.download_url;
    if (!downloadUrl) return null;

    const fileRes = await fetch(downloadUrl, {
      headers: { 'Authorization': `Bearer ${t.token}`, 'User-Agent': 'SecretScout-Pro/1.0' },
    });

    if (!fileRes.ok) return null;

    const text = await fileRes.text();
    if (text.length > MAX_FILE_SIZE) return null;

    let nullCount = 0;
    const checkLen = Math.min(text.length, 8000);
    for (let i = 0; i < checkLen; i++) {
      if (text.charCodeAt(i) === 0) nullCount++;
    }
    if (nullCount > checkLen * 0.01) return null;

    return text;
  }

  async waitForRateLimit(resetTimestamp: number): Promise<void> {
    const waitMs = Math.max((resetTimestamp * 1000) - Date.now(), 1000);
    if (waitMs > 0) {
      await sleep(waitMs);
    }
  }
}

export class RateLimitError extends Error {
  resetTimestamp: number;
  waitMs: number;

  constructor(message: string, resetTimestamp: number, waitMs: number) {
    super(message);
    this.name = 'RateLimitError';
    this.resetTimestamp = resetTimestamp;
    this.waitMs = waitMs;
  }
}

export const BUILTIN_DORKS = [
  { name: 'AWS Keys in Env Files', queryTemplate: '{org} filename:.env AKIA', category: 'cloud', severity: 'critical' },
  { name: 'GitHub PATs in Config', queryTemplate: '{org} filename:config ghp_', category: 'git_platform', severity: 'critical' },
  { name: 'Stripe Keys', queryTemplate: '{org} sk_live_', category: 'payment', severity: 'critical' },
  { name: 'Private Keys', queryTemplate: '{org} "BEGIN PRIVATE KEY"', category: 'crypto', severity: 'critical' },
  { name: 'Slack Tokens', queryTemplate: '{org} xoxb-', category: 'messaging', severity: 'high' },
  { name: 'Database URIs', queryTemplate: '{org} "mongodb://" password OR "postgres://" password', category: 'database', severity: 'critical' },
  { name: 'Generic API Keys', queryTemplate: '{org} "api_key" = OR "API_KEY" =', category: 'generic', severity: 'high' },
  { name: 'Secrets in Dockerfiles', queryTemplate: '{org} filename:Dockerfile ENV SECRET', category: 'infrastructure', severity: 'high' },
  { name: 'SendGrid Keys', queryTemplate: '{org} SG.', category: 'email', severity: 'high' },
  { name: 'Google API Keys', queryTemplate: '{org} AIza', category: 'cloud', severity: 'high' },
  { name: 'JWT Tokens', queryTemplate: '{org} eyJhbGci', category: 'auth', severity: 'medium' },
  { name: 'Heroku Keys', queryTemplate: '{org} HEROKU_API_KEY', category: 'platform', severity: 'high' },
];

export function isInScope(repo: string, scope: Array<{ targetType: string; targetValue: string; enabled: boolean }>): boolean {
  const r = repo.toLowerCase();
  for (const e of scope) {
    if (!e.enabled) continue;
    const t = e.targetValue.toLowerCase().replace(/^@/, '');
    if (e.targetType === 'github_org' || e.targetType === 'github_user') { if (r.startsWith(t + '/')) return true; }
    if (e.targetType === 'repo_allowlist') { if (r === t || r.startsWith(t + '/')) return true; }
  }
  return false;
}
