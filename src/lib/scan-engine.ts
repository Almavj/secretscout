import { db } from './db';
import { BUILTIN_RULES, buildDedupHash, type DetectionRuleDef } from './detection-rules';
import { GitHubClient, BUILTIN_DORKS, isInScope, RateLimitError, type RateLimitInfo } from './github-client';

export type ScanProgressCallback = (event: { type: string; scanId: string; data?: Record<string, unknown> }) => void;

export interface ScanConfig {
  organizationId: string; providerId?: string; dorkTemplateId?: string;
  scanType: string; scopeMode: string; customQuery?: string; targetRepo?: string;
}

const MIN_RATE_LIMIT_BUFFER = 3;

export class ScanEngine {
  private callbacks: ScanProgressCallback[] = [];
  onProgress(cb: ScanProgressCallback) { this.callbacks.push(cb); }
  private emit(e: { type: string; scanId: string; data?: Record<string, unknown> }) { for (const cb of this.callbacks) cb(e); }

  async executeScan(config: ScanConfig) {
    const scanId = `scan-${Date.now()}`;
    await db.scan.create({ data: { id: scanId, organizationId: config.organizationId, providerId: config.providerId || null, dorkTemplateId: config.dorkTemplateId || null, status: 'running', scanType: config.scanType, scopeMode: config.scopeMode, startedAt: new Date() } });
    this.emit({ type: 'started', scanId, data: { scanType: config.scanType, scopeMode: config.scopeMode } });

    try {
      const scopeEntries = await db.scopeEntry.findMany({ where: { organizationId: config.organizationId } });
      if (scopeEntries.length === 0 && config.scopeMode === 'restricted') throw new Error('No scope entries. Add repos/orgs in Settings first.');

      const providers = await db.sourceProvider.findMany({ where: { organizationId: config.organizationId, enabled: true, type: 'github' }, include: { tokenPools: { where: { enabled: true } } } });
      const client = new GitHubClient();
      for (const p of providers) for (const t of p.tokenPools) client.addToken({ token: t.tokenValue, label: t.label, id: t.id });
      if (client.size === 0) throw new Error('No GitHub tokens. Add one in Settings.');

      const queries: Array<{ query: string; dorkName: string }> = [];
      if (config.customQuery) { queries.push({ query: config.customQuery, dorkName: 'Custom' }); }
      else if (config.targetRepo) { for (const d of BUILTIN_DORKS) queries.push({ query: d.queryTemplate.replace('{org}', config.targetRepo), dorkName: d.name }); }
      else {
        const targets = scopeEntries.filter(e => e.enabled).map(e => e.targetValue);
        if (!targets.length) throw new Error('No scope targets.');
        for (const d of BUILTIN_DORKS) for (const t of targets) queries.push({ query: d.queryTemplate.replace('{org}', t), dorkName: d.name });
      }

      let totalChecked = 0, totalNew = 0, totalDup = 0;
      let lastRateLimit: RateLimitInfo | null = null;

      for (let i = 0; i < queries.length; i++) {
        const q = queries[i];

        if (lastRateLimit && lastRateLimit.remaining <= MIN_RATE_LIMIT_BUFFER) {
          const waitMs = Math.max((lastRateLimit.reset * 1000) - Date.now(), 1000);
          this.emit({ type: 'progress', scanId, data: { status: 'running', statsTotal: totalChecked, statsNew: totalNew, statsDuplicate: totalDup, progress: Math.round(((i) / queries.length) * 100), currentQuery: `Rate limit pause — waiting ${Math.ceil(waitMs / 1000)}s` } });
          await client.waitForRateLimit(lastRateLimit.reset);
        }

        try {
          const { results, totalCount, rateLimit } = await client.codeSearch(q.query);
          lastRateLimit = rateLimit;
          totalChecked += totalCount;

          await this.updateTokenRateLimit(config.organizationId, rateLimit);

          for (const r of results) {
            if (config.scopeMode === 'restricted' && !isInScope(r.repository.full_name, scopeEntries)) continue;

            const content = await client.fetchFileContent(r.repository.full_name, r.path);
            if (!content) continue;

            for (const rule of BUILTIN_RULES) {
              try {
                const rx = new RegExp(rule.pattern, 'g');
                const matches = content.matchAll(rx);
                for (const match of matches) {
                  const val = rule.secretGroup > 0 && match[rule.secretGroup] ? match[rule.secretGroup] : match[0];
                  if (!val) continue;

                  const dv = val.length > 200 ? val.substring(0, 200) + '...' : val;
                  const matchIndex = match.index ?? 0;
                  const ln = content.substring(0, matchIndex).split('\n').length;
                  const hash = buildDedupHash(r.path, rule.id, dv, (r.sha || '').substring(0, 12));

                  const existing = await db.finding.findUnique({ where: { dedupHash: hash } });
                  if (existing) { totalDup++; continue; }

                  totalNew++;
                  const f = await db.finding.create({
                    data: {
                      organizationId: config.organizationId, scanId, ruleId: rule.id,
                      dedupHash: hash, secretType: rule.name, matchedPattern: rule.pattern,
                      matchedValue: dv, fileUrl: r.html_url, filePath: r.path,
                      repoName: r.repository.full_name, repoUrl: r.repository.html_url,
                      commitHash: (r.sha || '').substring(0, 12),
                      commitUrl: `${r.repository.html_url}/commit/${r.sha}`,
                      commitMessage: '', commitAuthor: 'github-search', commitDate: new Date(),
                      branch: 'main', lineNumber: ln, severity: rule.severity,
                      isVerified: false, isAstFiltered: false, isStillPresent: true,
                      isForkMatch: r.repository.fork,
                      upstreamRepo: r.repository.parent?.full_name || null, status: 'open',
                    },
                  });
                  await db.findingEvent.create({ data: { findingId: f.id, eventType: 'discovered', actor: 'scan-engine', note: `Found via "${q.dorkName}"` } });
                  this.emit({ type: 'finding', scanId, data: { id: f.id, secretType: f.secretType, severity: f.severity, repoName: f.repoName, filePath: f.filePath, commitHash: f.commitHash, commitAuthor: f.commitAuthor, isVerified: false, isForkMatch: f.isForkMatch, discoveredAt: f.discoveredAt.toISOString(), status: 'open' } });
                }
              } catch { /* regex compile error — skip rule */ }
            }
          }

          this.emit({ type: 'progress', scanId, data: { status: 'running', statsTotal: totalChecked, statsNew: totalNew, statsDuplicate: totalDup, progress: Math.round(((i + 1) / queries.length) * 100), currentQuery: q.dorkName } });
        } catch (err: unknown) {
          if (err instanceof RateLimitError) {
            this.emit({ type: 'progress', scanId, data: { status: 'running', statsTotal: totalChecked, statsNew: totalNew, statsDuplicate: totalDup, progress: Math.round(((i) / queries.length) * 100), currentQuery: `Rate limited — waiting ${Math.ceil(err.waitMs / 1000)}s` } });
            await client.waitForRateLimit(err.resetTimestamp);
            i--;
            continue;
          }
          const message = err instanceof Error ? err.message : String(err);
          this.emit({ type: 'error', scanId, data: { query: q.dorkName, error: message } });
        }
      }

      await db.scan.update({ where: { id: scanId }, data: { status: 'completed', completedAt: new Date(), statsTotal: totalChecked, statsNew: totalNew, statsDuplicate: totalDup } });
      this.emit({ type: 'complete', scanId, data: { statsTotal: totalChecked, statsNew: totalNew, statsDuplicate: totalDup } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      await db.scan.update({ where: { id: scanId }, data: { status: 'failed', errorMessage: message, completedAt: new Date() } });
      this.emit({ type: 'error', scanId, data: { error: message } });
      throw err;
    }
  }

  private async updateTokenRateLimit(orgId: string, rateLimit: RateLimitInfo): Promise<void> {
    try {
      const tok = await db.tokenPool.findFirst({
        where: { provider: { organizationId: orgId, type: 'github' }, enabled: true },
        orderBy: { lastUsedAt: 'desc' },
      });
      if (tok) {
        await db.tokenPool.update({
          where: { id: tok.id },
          data: { rateLimitRemaining: rateLimit.remaining, rateLimitResetAt: new Date(rateLimit.reset * 1000), lastUsedAt: new Date() },
        });
      }
    } catch { /* non-critical */ }
  }
}

export const scanEngine = new ScanEngine();
