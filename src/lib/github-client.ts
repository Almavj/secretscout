// SecretScout Pro — GitHub API Client

import { BUILTIN_RULES } from './detection-rules';

interface GitHubSearchResult {
  name: string; path: string; sha: string; html_url: string;
  repository: { full_name: string; html_url: string; fork: boolean; parent?: { full_name: string } };
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

  async codeSearch(query: string, opts?: { perPage?: number; page?: number }) {
    const t = this.nextToken();
    if (!t) throw new Error('No GitHub tokens configured. Add a token in Settings.');
    const params = new URLSearchParams({ q: query, per_page: String(opts?.perPage || 30), page: String(opts?.page || 1) });
    const res = await fetch(`https://api.github.com/search/code?${params}`, {
      headers: { 'Authorization': `Bearer ${t.token}`, 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'SecretScout-Pro/1.0', 'X-GitHub-Api-Version': '2022-11-28' },
    });
    const rateLimit = { limit: +res.headers.get('x-ratelimit-limit')!, remaining: +res.headers.get('x-ratelimit-remaining')!, reset: +res.headers.get('x-ratelimit-reset')!, used: +res.headers.get('x-ratelimit-used')! };
    if (res.status === 403) throw new Error(`GitHub rate limit exceeded. Reset at ${new Date(rateLimit.reset * 1000).toISOString()}`);
    if (res.status === 401) throw new Error(`GitHub token "${t.label}" is invalid or expired.`);
    if (!res.ok) throw new Error(`GitHub API error (${res.status}): ${await res.text()}`);
    const data = await res.json();
    return { results: (data.items || []) as GitHubSearchResult[], totalCount: data.total_count, rateLimit };
  }

  async fetchFileContent(repo: string, path: string): Promise<string> {
    const t = this.nextToken();
    if (!t) throw new Error('No GitHub tokens configured.');
    const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      headers: { 'Authorization': `Bearer ${t.token}`, 'Accept': 'application/vnd.github.v3.raw', 'User-Agent': 'SecretScout-Pro/1.0' },
    });
    if (!res.ok) throw new Error(`Failed to fetch ${repo}/${path}`);
    return res.text();
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