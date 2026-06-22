'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Crosshair, Brain, GitBranch, Shield
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { DetectionRule } from '@/lib/types';

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'border-destructive/40 text-destructive',
  high: 'border-[oklch(0.75_0.18_55)]/40 text-[oklch(0.85_0.15_55)]',
  medium: 'border-[oklch(0.65_0.20_280)]/40 text-[oklch(0.80_0.18_280)]',
  low: 'border-muted-foreground/40 text-muted-foreground',
};

export function DetectionView() {
  const { data: rules, isLoading } = useQuery<DetectionRule[]>({ queryKey: ['rules'], queryFn: () => fetch('/api/rules').then(r => r.json()) });

  const builtinRules = (rules || []).filter(r => r.isBuiltin);
  const customRules = (rules || []).filter(r => !r.isBuiltin);
  const enabledRules = (rules || []).filter(r => r.enabled).length;
  const astAwareRules = (rules || []).filter(r => r.isAstAware).length;
  const diffAwareRules = (rules || []).filter(r => r.isDiffAware).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Detection Engine</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Rules management with gitleaks baseline, AST-aware filtering, and diff-based history walking.
        </p>
      </div>

      {/* Engine Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold font-mono">{rules?.length || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Rules</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold font-mono text-primary">{enabledRules}</p>
            <p className="text-xs text-muted-foreground mt-1">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold font-mono text-[oklch(0.80_0.18_280)]">{astAwareRules}</p>
            <p className="text-xs text-muted-foreground mt-1">AST-Aware (tree-sitter)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold font-mono text-[oklch(0.85_0.15_55)]">{diffAwareRules}</p>
            <p className="text-xs text-muted-foreground mt-1">Diff-Aware (git log -G)</p>
          </CardContent>
        </Card>
      </div>

      {/* Detection Architecture Diagram */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Detection Pipeline Architecture</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {[
              { label: 'Discovery Layer', desc: 'Code search, events, GH Archive', icon: Crosshair, color: 'border-primary/40 bg-primary/5' },
              { label: 'Regex Engine', desc: 'gitleaks 150+ patterns baseline', icon: Crosshair, color: 'border-[oklch(0.75_0.18_55)]/40 bg-[oklch(0.75_0.18_55)]/5' },
              { label: 'AST Filter', desc: 'tree-sitter context validation', icon: Brain, color: 'border-[oklch(0.65_0.20_280)]/40 bg-[oklch(0.65_0.20_280)]/5' },
              { label: 'Diff Walk', desc: 'git log -p -G pattern (pickaxe)', icon: GitBranch, color: 'border-[oklch(0.65_0.20_280)]/40 bg-[oklch(0.65_0.20_280)]/5' },
              { label: 'Dedup Engine', desc: 'SHA256(file+pattern+commit)', icon: Shield, color: 'border-primary/40 bg-primary/5' },
            ].map((step, i) => (
              <div key={i} className="flex items-center shrink-0">
                <div className={`border rounded-lg p-3 ${step.color} min-w-[160px]`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <step.icon className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">{step.label}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{step.desc}</p>
                </div>
                {i < 4 && <svg className="w-4 h-4 text-muted-foreground mx-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Verification Panel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" /> Credential Verification (Opt-In)
          </CardTitle>
          <CardDescription className="text-xs">
            Verification makes safe, read-only, single-attempt API calls to confirm if a credential is active.
            This is <strong className="text-foreground">opt-in only</strong> — intended for credentials you legitimately own.
            Never auto-run against arbitrary internet-sourced findings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="border rounded-lg p-3 bg-muted/20">
              <p className="text-xs font-medium">AWS</p>
              <p className="text-[10px] text-muted-foreground mt-1">sts:GetCallerIdentity</p>
              <p className="text-[10px] text-muted-foreground">Single attempt, rate-limited</p>
            </div>
            <div className="border rounded-lg p-3 bg-muted/20">
              <p className="text-xs font-medium">Stripe</p>
              <p className="text-[10px] text-muted-foreground mt-1">GET /v1/account</p>
              <p className="text-[10px] text-muted-foreground">Read-only, no destructive ops</p>
            </div>
            <div className="border rounded-lg p-3 bg-muted/20">
              <p className="text-xs font-medium">GitHub</p>
              <p className="text-[10px] text-muted-foreground mt-1">GET /user</p>
              <p className="text-[10px] text-muted-foreground">Read-only identity check</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Rules Table */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Detection Rules ({rules?.length || 0})</h3>

        {builtinRules.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
              <span className="text-primary font-bold">&#10003;</span> gitleaks Baseline Rules ({builtinRules.length})
            </p>
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="max-h-[300px]">
                  <RulesTable rules={builtinRules} />
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}

        {customRules.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
              <span className="text-[oklch(0.85_0.15_55)] font-bold">+</span> Custom Rules ({customRules.length})
            </p>
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="max-h-[200px]">
                  <RulesTable rules={customRules} />
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function RulesTable({ rules }: { rules: DetectionRule[] }) {
  return (
    <table className="w-full text-xs">
      <thead className="sticky top-0 bg-card border-b border-border">
        <tr className="text-left text-muted-foreground">
          <th className="p-3 font-medium">Rule</th>
          <th className="p-3 font-medium">Pattern</th>
          <th className="p-3 font-medium">Category</th>
          <th className="p-3 font-medium">Severity</th>
          <th className="p-3 font-medium">AST</th>
          <th className="p-3 font-medium">Diff</th>
        </tr>
      </thead>
      <tbody>
        {rules.map(r => (
          <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
            <td className="p-3">
              <p className="font-medium">{r.name}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[200px] truncate">{r.description}</p>
            </td>
            <td className="p-3"><code className="text-[10px] font-mono text-primary/70 max-w-[180px] block truncate">{r.pattern}</code></td>
            <td className="p-3"><Badge variant="outline" className="text-[10px] h-5 capitalize">{r.category}</Badge></td>
            <td className="p-3"><Badge variant="outline" className={`text-[10px] h-5 ${SEVERITY_COLORS[r.severity]}`}>{r.severity}</Badge></td>
            <td className="p-3">{r.isAstAware ? <Brain className="w-3.5 h-3.5 text-[oklch(0.80_0.18_280)]" /> : <span className="text-muted-foreground">—</span>}</td>
            <td className="p-3">{r.isDiffAware ? <GitBranch className="w-3.5 h-3.5 text-[oklch(0.85_0.15_55)]" /> : <span className="text-muted-foreground">—</span>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}