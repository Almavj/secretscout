'use client';

import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, ShieldAlert, CheckCircle2, Clock, Activity, GitFork,
  Brain, Eye, Zap, TrendingDown, BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area,
  PieChart, Pie, Cell
} from 'recharts';
import type { DashboardStats } from '@/lib/types';

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'oklch(0.65 0.25 25)',
  high: 'oklch(0.75 0.18 55)',
  medium: 'oklch(0.65 0.20 280)',
  low: 'oklch(0.55 0.08 260)',
};

const SEVERITY_BG: Record<string, string> = {
  critical: 'bg-[oklch(0.65_0.25_25)]/15 text-[oklch(0.75_0.22_25)] border-[oklch(0.65_0.25_25)]/30',
  high: 'bg-[oklch(0.75_0.18_55)]/15 text-[oklch(0.80_0.16_55)] border-[oklch(0.75_0.18_55)]/30',
  medium: 'bg-[oklch(0.65_0.20_280)]/15 text-[oklch(0.75_0.18_280)] border-[oklch(0.65_0.20_280)]/30',
  low: 'bg-[oklch(0.55_0.08_260)]/15 text-[oklch(0.65_0.08_260)] border-[oklch(0.55_0.08_260)]/30',
};

export function DashboardView() {
  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: () => fetch('/api/dashboard').then(r => r.json()),
    refetchInterval: 30000,
  });

  if (isLoading) return <DashboardSkeleton />;

  const s = data!.summary;
  const metrics = [
    { label: 'Open Findings', value: s.openFindings, icon: AlertTriangle, color: 'text-[oklch(0.75_0.18_55)]', bg: 'bg-[oklch(0.75_0.18_55)]/10' },
    { label: 'Critical & Live', value: s.criticalOpen, icon: ShieldAlert, color: 'text-[oklch(0.65_0.25_25)]', bg: 'bg-[oklch(0.65_0.25_25)]/10', glow: true },
    { label: 'Verified Active', value: s.verifiedFindings, icon: CheckCircle2, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Avg MTTR (hrs)', value: s.avgMttr, icon: Clock, color: 'text-[oklch(0.65_0.20_280)]', bg: 'bg-[oklch(0.65_0.20_280)]/10', isFloat: true },
    { label: 'Active Scans', value: s.activeScans, icon: Activity, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Fork Leaks', value: s.forkMatches, icon: GitFork, color: 'text-[oklch(0.75_0.18_55)]', bg: 'bg-[oklch(0.75_0.18_55)]/10' },
    { label: 'AST-Filtered', value: s.astFiltered, icon: Brain, color: 'text-[oklch(0.65_0.20_280)]', bg: 'bg-[oklch(0.65_0.20_280)]/10' },
    { label: 'Remediated', value: s.remediatedFindings, icon: TrendingDown, color: 'text-primary', bg: 'bg-primary/10' },
  ];

  const recentScans = data!.recentScans;
  const findingsTrend = data!.findingsByDay;
  const pieData = data!.severityBreakdown.map(d => ({ ...d, fill: SEVERITY_COLORS[d.severity] || '#666' }));
  const categoryData = data!.categoryBreakdown;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Risk Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Organization-wide credential exposure overview for <span className="text-primary font-medium">Acme Corp</span>
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map(m => (
          <Card key={m.label} className={m.glow ? 'glow-critical' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className={`w-9 h-9 rounded-lg ${m.bg} flex items-center justify-center`}>
                  <m.icon className={`w-4.5 h-4.5 ${m.color}`} />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold font-mono">{m.isFloat ? m.value.toFixed(1) : m.value}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">{m.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Findings Trend */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Findings Trend (7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {findingsTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={findingsTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    {Object.entries(SEVERITY_COLORS).map(([key, color]) => (
                      <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: 'oklch(0.5 0 260)', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: 'oklch(0.5 0 260)', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'oklch(0.16 0.006 260)', border: '1px solid oklch(0.28 0.008 260)', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: 'oklch(0.88 0 260)' }}
                  />
                  <Area type="monotone" dataKey="critical" stackId="1" stroke={SEVERITY_COLORS.critical} fill={`url(#grad-critical)`} strokeWidth={2} />
                  <Area type="monotone" dataKey="high" stackId="1" stroke={SEVERITY_COLORS.high} fill={`url(#grad-high)`} strokeWidth={2} />
                  <Area type="monotone" dataKey="medium" stackId="1" stroke={SEVERITY_COLORS.medium} fill={`url(#grad-medium)`} strokeWidth={1.5} />
                  <Area type="monotone" dataKey="low" stackId="1" stroke={SEVERITY_COLORS.low} fill={`url(#grad-low)`} strokeWidth={1} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
            )}
          </CardContent>
        </Card>

        {/* Severity Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Severity Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="count" strokeWidth={0}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'oklch(0.16 0.006 260)', border: '1px solid oklch(0.28 0.008 260)', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {pieData.map(d => (
                <div key={d.severity} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: SEVERITY_COLORS[d.severity] }} />
                  <span className="text-[11px] text-muted-foreground capitalize">{d.severity} ({d.count})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Categories + Scans */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Findings by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={categoryData} layout="vertical" margin={{ left: 10, right: 10, top: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fill: 'oklch(0.5 0 260)', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="category" tick={{ fill: 'oklch(0.7 0 260)', fontSize: 11 }} tickLine={false} axisLine={false} width={90} />
                  <Tooltip contentStyle={{ background: 'oklch(0.16 0.006 260)', border: '1px solid oklch(0.28 0.008 260)', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill="oklch(0.72 0.19 163)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No data</div>
            )}
          </CardContent>
        </Card>

        {/* Recent Scans */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recent Scans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {recentScans.map(scan => (
                <div key={scan.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${scan.status === 'running' ? 'bg-primary animate-pulse-live' : scan.status === 'completed' ? 'bg-primary' : scan.status === 'failed' ? 'bg-destructive' : 'bg-muted-foreground'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium truncate">{scan.scanType.replace(/_/g, ' ')}</span>
                      {scan.scopeMode === 'public_discovery' && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-[oklch(0.75_0.18_55)]/50 text-[oklch(0.75_0.18_55)] h-4">PUBLIC</Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {scan.status === 'running' ? `Scanning... ${scan.statsTotal} checked` :
                       scan.status === 'completed' ? `${scan.statsNew} new / ${scan.statsTotal} total (${scan.statsDuplicate} dup)` :
                       scan.status === 'failed' ? 'Failed' : 'Queued'}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(scan.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div><Skeleton className="h-7 w-48" /><Skeleton className="h-4 w-72 mt-2" /></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2"><CardContent className="p-6"><Skeleton className="h-[240px] w-full" /></CardContent></Card>
        <Card><CardContent className="p-6"><Skeleton className="h-[240px] w-full" /></CardContent></Card>
      </div>
    </div>
  );
}