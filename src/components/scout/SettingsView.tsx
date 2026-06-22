'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Shield, AlertTriangle, Github, Gitlab, GitBranch, Key,
  Lock, Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ScopeEntry, TokenPool } from '@/lib/types';

const TARGET_ICONS: Record<string, React.ElementType> = {
  github_org: Github,
  github_user: Github,
  repo_allowlist: GitBranch,
  gitlab_group: Gitlab,
  bitbucket_workspace: GitBranch,
};

const TARGET_LABELS: Record<string, string> = {
  github_org: 'GitHub Organization',
  github_user: 'GitHub User',
  repo_allowlist: 'Repository (Allowlist)',
  gitlab_group: 'GitLab Group',
  bitbucket_workspace: 'Bitbucket Workspace',
};

export function SettingsView() {
  const { data: scopeEntries, isLoading: sl } = useQuery<ScopeEntry[]>({ queryKey: ['scope'], queryFn: () => fetch('/api/scope').then(r => r.json()) });
  const { data: tokens, isLoading: tl } = useQuery<TokenPool[]>({ queryKey: ['tokens'], queryFn: () => fetch('/api/tokens').then(r => r.json()) });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Scope restrictions and token pool management.</p>
      </div>

      {/* =====================================================================
          HARD BOUNDARY: SCOPE RESTRICTION
          This is the most critical security control in the platform.

          DEFAULT BEHAVIOR:
          - Discovery layer ONLY scans repos/orgs explicitly listed in the scope allowlist below.
          - Scans default to scopeMode="restricted".

          The "public_discovery" / "scan all of public GitHub" module is:
          - A SEPARATE, CLEARLY-LABELED module
          - OPT-IN only (never enabled by default)
          - Intended for your own org's exposure monitoring or authorized bug bounty scope
          - NOT generalized internet-wide credential harvesting
          ===================================================================== */}
      <Card className="border-[oklch(0.65_0.25_25)]/40 glow-critical">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-[oklch(0.80_0.20_25)]">
            <Shield className="w-4 h-4" /> Scope Restriction (Hard Boundary)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-[oklch(0.65_0.25_25)]/10 rounded-lg border border-[oklch(0.65_0.25_25)]/20">
            <AlertTriangle className="w-5 h-5 text-[oklch(0.65_0.25_25)] shrink-0 mt-0.5" />
            <div className="text-xs space-y-1.5">
              <p className="font-medium text-[oklch(0.80_0.20_25)]">This control is baked into the design, not bolted on later.</p>
              <p className="text-muted-foreground">
                The discovery layer <strong className="text-foreground">defaults to scope-restricted mode</strong>: scanning only repos under orgs/users the authenticated account has explicit write/admin access to, or repos explicitly added via the allowlist below.
              </p>
              <p className="text-muted-foreground">
                The <strong className="text-foreground">"scan all of public GitHub"</strong> dork-based discovery is a separate, clearly-labeled module that is <strong className="text-[oklch(0.85_0.15_55)]">opt-in only</strong> — intended for your own org&apos;s exposure monitoring or authorized bug bounty scope — not generalized internet-wide credential harvesting.
              </p>
              <p className="text-muted-foreground">
                This line is what separates a credential scanner from unauthorized access tooling under most computer misuse statutes, including Kenya&apos;s Computer Misuse and Cybercrimes Act.
              </p>
            </div>
          </div>

          {/* Scope Mode Indicator */}
          <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium">Current Default Mode:</span>
            </div>
            <Badge variant="outline" className="border-primary/40 text-primary text-xs">RESTRICTED (Scope Allowlist Only)</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Scope Allowlist */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" /> Scope Allowlist
          <Badge variant="outline" className="text-[10px]">{scopeEntries?.length || 0} entries</Badge>
        </h3>
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[300px]">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card border-b border-border">
                  <tr className="text-left text-muted-foreground">
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Target</th>
                    <th className="p-3 font-medium">Required Access</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(scopeEntries || []).map(entry => {
                    const Icon = TARGET_ICONS[entry.targetType] || Shield;
                    return (
                      <tr key={entry.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5 text-primary" />
                            <span className="font-medium">{TARGET_LABELS[entry.targetType] || entry.targetType}</span>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-primary">{entry.targetValue}</td>
                        <td className="p-3">
                          <Badge variant="outline" className={`text-[10px] h-5 ${entry.accessLevel === 'admin' ? 'border-[oklch(0.65_0.25_25)]/40 text-[oklch(0.80_0.20_25)]' : 'border-[oklch(0.85_0.15_55)]/40 text-[oklch(0.85_0.15_55)]'}`}>
                            {entry.accessLevel === 'admin' ? 'Admin' : 'Write'}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px] h-5 border-primary/40 text-primary">Enabled</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Token Pool Management */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Key className="w-4 h-4 text-primary" /> Token Pool (Rotating Auth)
          <Badge variant="outline" className="text-[10px]">Rotates to avoid 30 req/min rate limit</Badge>
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          A pool of 5-10 GitHub Apps/PATs rotate to distribute API load and avoid the secondary rate limit. Tokens are used round-robin, skipping those with exhausted rate limits.
        </p>
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[350px]">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card border-b border-border">
                  <tr className="text-left text-muted-foreground">
                    <th className="p-3 font-medium">Token</th>
                    <th className="p-3 font-medium">Provider</th>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Rate Limit</th>
                    <th className="p-3 font-medium">Last Used</th>
                  </tr>
                </thead>
                <tbody>
                  {(tokens || []).map(token => {
                    const ratePct = (token.rateLimitRemaining / 30) * 100;
                    return (
                      <tr key={token.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="p-3">
                          <p className="font-medium">{token.label}</p>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            {token.providerType === 'github' ? <Github className="w-3.5 h-3.5" /> : <Gitlab className="w-3.5 h-3.5" />}
                            <span className="text-muted-foreground">{token.providerName}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px] h-5 capitalize">{token.tokenType.replace(/_/g, ' ')}</Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${ratePct > 50 ? 'bg-primary' : ratePct > 20 ? 'bg-[oklch(0.85_0.15_55)]' : 'bg-destructive'}`}
                                style={{ width: `${ratePct}%` }}
                              />
                            </div>
                            <span className="font-mono text-[10px] text-muted-foreground">{token.rateLimitRemaining}/30</span>
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground text-[10px]">
                          {token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleString() : 'Never'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}