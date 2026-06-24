'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Github, Gitlab, RefreshCw, Play, CheckCircle2, XCircle, Clock,
  AlertCircle, Loader2, FileSearch, GitFork, Database, Radio, Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import type { SourceProvider, Scan, DorkTemplate } from '@/lib/types';

const PROVIDER_ICONS: Record<string, React.ElementType> = {
  github: Github,
  gitlab: Gitlab,
  bitbucket: Database,
};

const SCAN_STATUS: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  running: { icon: Loader2, color: 'text-primary', label: 'Running' },
  completed: { icon: CheckCircle2, color: 'text-primary', label: 'Completed' },
  failed: { icon: XCircle, color: 'text-destructive', label: 'Failed' },
  queued: { icon: Clock, color: 'text-muted-foreground', label: 'Queued' },
  cancelled: { icon: AlertCircle, color: 'text-muted-foreground', label: 'Cancelled' },
};

const SCAN_TYPE_ICONS: Record<string, React.ElementType> = {
  scheduled_dork: FileSearch,
  realtime_event: Radio,
  gharchive_bulk: Database,
  fork_walk: GitFork,
  manual: Play,
};

function timeAgo(d: string | null): string {
  if (!d) return 'N/A';
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function DiscoveryView() {
  const queryClient = useQueryClient();
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [customQuery, setCustomQuery] = useState('');
  const [useCustomQuery, setUseCustomQuery] = useState(false);

  const { data: providers } = useQuery<SourceProvider[]>({ queryKey: ['providers'], queryFn: () => apiFetch('/api/providers') });
  const { data: scans } = useQuery<Scan[]>({ queryKey: ['scans'], queryFn: () => apiFetch('/api/scans') });
  const { data: dorks } = useQuery<DorkTemplate[]>({ queryKey: ['dorks'], queryFn: () => apiFetch('/api/dorks') });

  const triggerScan = useMutation({
    mutationFn: () => apiFetch('/api/scan/trigger', {
      method: 'POST',
      body: JSON.stringify({
        scanType: 'manual',
        scopeMode: 'restricted',
        customQuery: useCustomQuery ? customQuery : undefined,
      }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scans'] });
      setScanDialogOpen(false);
      setCustomQuery('');
      setUseCustomQuery(false);
      toast.success('Scan started! Check Live Feed for results.');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Discovery Layer</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Source providers, dork templates, and scan execution pipeline.
          </p>
        </div>
        <Button size="sm" className="text-xs" onClick={() => setScanDialogOpen(true)}>
          <Zap className="w-3.5 h-3.5 mr-1.5" /> Start Scan
        </Button>
      </div>

      {/* Source Providers */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" /> Source Providers
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(providers || []).map(p => {
            const Icon = PROVIDER_ICONS[p.type] || Database;
            const config = JSON.parse(p.config || '{}');
            return (
              <Card key={p.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5" />
                      <CardTitle className="text-sm">{p.name}</CardTitle>
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize">{p.type}</Badge>
                  </div>
                  <CardDescription className="text-[11px]">
                    {p.tokenPools?.length || 0} tokens &middot; {p._count?.scans || 0} scans &middot; {p.dorkTemplates?.length || 0} dorks
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">API Endpoint</span>
                    <code className="text-[10px] text-primary">{config.apiEndpoint || 'default'}</code>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Fork Scanning</span>
                    <span className={config.scanForks ? 'text-primary' : 'text-muted-foreground'}>{config.scanForks ? 'Enabled' : 'Disabled'}</span>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Token Pool</p>
                    <div className="space-y-1">
                      {(p.tokenPools || []).map(t => (
                        <div key={t.id} className="flex items-center justify-between text-[11px] py-0.5">
                          <span className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${t.enabled ? 'bg-primary' : 'bg-muted-foreground'}`} />
                            <span className="truncate max-w-[160px]">{t.label}</span>
                          </span>
                          <span className="text-muted-foreground font-mono">{t.rateLimitRemaining}/30</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {(!providers || providers.length === 0) && (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground text-sm">
                No providers configured. Add a GitHub token in Settings first.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Separator />

      {/* Dork Templates */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <FileSearch className="w-4 h-4 text-primary" /> Dork Template Engine
          <Badge variant="outline" className="text-[10px]">Config-Driven</Badge>
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          New dork queries are added via configuration (database/config), not code changes. Templates use <code className="text-primary font-mono">{'{org}'}</code> and <code className="text-primary font-mono">{'{repo}'}</code> placeholders.
        </p>
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[320px]">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card border-b border-border">
                  <tr className="text-left text-muted-foreground">
                    <th className="p-3 font-medium">Name</th>
                    <th className="p-3 font-medium">Query Template</th>
                    <th className="p-3 font-medium">Category</th>
                    <th className="p-3 font-medium">Severity</th>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Last Run</th>
                  </tr>
                </thead>
                <tbody>
                  {(dorks || []).map(d => (
                    <tr key={d.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="p-3 font-medium">{d.name}</td>
                      <td className="p-3"><code className="text-[10px] font-mono text-primary/80">{d.queryTemplate}</code></td>
                      <td className="p-3"><Badge variant="outline" className="text-[10px] h-5">{d.category}</Badge></td>
                      <td className="p-3"><Badge variant="outline" className={`text-[10px] h-5 ${d.severity === 'critical' ? 'border-destructive/40 text-destructive' : 'border-[oklch(0.75_0.18_55)]/40 text-[oklch(0.85_0.15_55)]'}`}>{d.severity}</Badge></td>
                      <td className="p-3">{d.isBuiltin ? <Badge variant="outline" className="text-[10px] h-5 border-primary/40 text-primary">Builtin</Badge> : <Badge variant="outline" className="text-[10px] h-5">Custom</Badge>}</td>
                      <td className="p-3 text-muted-foreground">{d.lastRunAt ? timeAgo(d.lastRunAt) : 'Never'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Scan History */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-primary" /> Scan History
        </h3>
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[400px]">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card border-b border-border">
                  <tr className="text-left text-muted-foreground">
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Scope</th>
                    <th className="p-3 font-medium">Provider</th>
                    <th className="p-3 font-medium">Results</th>
                    <th className="p-3 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {(scans || []).map(scan => {
                    const st = SCAN_STATUS[scan.status] || SCAN_STATUS.queued;
                    const StIcon = st.icon;
                    return (
                      <tr key={scan.id} className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${scan.status === 'running' ? 'animate-scan-line relative overflow-hidden' : ''}`}>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <StIcon className={`w-3.5 h-3.5 ${st.color} ${scan.status === 'running' ? 'animate-spin' : ''}`} />
                            <span className={st.color}>{st.label}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            {React.createElement(SCAN_TYPE_ICONS[scan.scanType] || Play, { className: 'w-3.5 h-3.5 text-muted-foreground' })}
                            <span className="capitalize">{scan.scanType.replace(/_/g, ' ')}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          {scan.scopeMode === 'public_discovery' ? (
                            <Badge variant="outline" className="text-[10px] h-5 border-[oklch(0.75_0.18_55)]/50 text-[oklch(0.75_0.18_55)]">PUBLIC (Opt-In)</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] h-5 border-primary/40 text-primary">RESTRICTED</Badge>
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground">{scan.provider?.name || '—'}</td>
                        <td className="p-3">
                          {scan.status === 'running' ? (
                            <span className="font-mono">{scan.statsTotal} checked...</span>
                          ) : scan.status === 'completed' ? (
                            <span className="font-mono">{scan.statsNew} new / {scan.statsTotal} total</span>
                          ) : scan.status === 'failed' ? (
                            <span className="text-destructive truncate max-w-[200px] block">{scan.errorMessage}</span>
                          ) : (
                            <span className="text-muted-foreground">Queued</span>
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground whitespace-nowrap">
                          {scan.startedAt ? (scan.completedAt
                            ? `${Math.round((new Date(scan.completedAt).getTime() - new Date(scan.startedAt).getTime()) / 60000)}m`
                            : 'In progress...'
                          ) : '—'}
                          <br /><span className="text-[10px]">{timeAgo(scan.createdAt)}</span>
                        </td>
                      </tr>
                    );
                  })}
                  {(!scans || scans.length === 0) && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted-foreground">
                        No scans yet. Click &quot;Start Scan&quot; to begin.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Start Scan Dialog */}
      <Dialog open={scanDialogOpen} onOpenChange={setScanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-4 h-4" /> Start Scan
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-xs">
              <p className="font-medium text-primary">How scanning works:</p>
              <p className="text-muted-foreground mt-1">
                SecretScout runs 12 GitHub Code Search queries (dorks) against your scope entries,
                then checks each result with 20 regex detection rules to find leaked credentials.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium">Query Mode</label>
              <Select value={useCustomQuery ? 'custom' : 'dorks'} onValueChange={v => setUseCustomQuery(v === 'custom')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dorks">Use built-in dork templates (recommended)</SelectItem>
                  <SelectItem value="custom">Custom GitHub search query</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {useCustomQuery && (
              <div className="space-y-2">
                <label className="text-xs font-medium">Custom Query</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-xs font-mono"
                  placeholder='e.g. "myorg" filename:.env SECRET_KEY'
                  value={customQuery}
                  onChange={e => setCustomQuery(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground">
                  Use GitHub Code Search syntax. Your scope restrictions still apply.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2 bg-muted/30 rounded-lg">
                <p className="text-muted-foreground">Scan Type</p>
                <p className="font-medium mt-0.5">Manual</p>
              </div>
              <div className="p-2 bg-muted/30 rounded-lg">
                <p className="text-muted-foreground">Scope Mode</p>
                <p className="font-medium mt-0.5">Restricted</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setScanDialogOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              disabled={triggerScan.isPending || (useCustomQuery && !customQuery)}
              onClick={() => triggerScan.mutate()}
            >
              {triggerScan.isPending ? (
                <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Starting...</>
              ) : (
                <><Zap className="w-3 h-3 mr-1" /> Start Scan</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
