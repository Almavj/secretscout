'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import {
  Shield, Eye, GitFork, ExternalLink, Clock, User, FileCode2,
  Filter, Radio
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/lib/store';
import type { Finding, LiveFinding } from '@/lib/types';
import { cn } from '@/lib/utils';

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'border-l-[oklch(0.65_0.25_25)] bg-[oklch(0.65_0.25_25)]/5',
  high: 'border-l-[oklch(0.75_0.18_55)] bg-[oklch(0.75_0.18_55)]/5',
  medium: 'border-l-[oklch(0.65_0.20_280)] bg-[oklch(0.65_0.20_280)]/5',
  low: 'border-l-[oklch(0.55_0.08_260)] bg-[oklch(0.55_0.08_260)]/5',
};

const SEVERITY_BADGE: Record<string, string> = {
  critical: 'bg-[oklch(0.65_0.25_25)]/20 text-[oklch(0.80_0.20_25)] border-[oklch(0.65_0.25_25)]/40',
  high: 'bg-[oklch(0.75_0.18_55)]/20 text-[oklch(0.85_0.15_55)] border-[oklch(0.75_0.18_55)]/40',
  medium: 'bg-[oklch(0.65_0.20_280)]/20 text-[oklch(0.80_0.18_280)] border-[oklch(0.65_0.20_280)]/40',
  low: 'bg-[oklch(0.55_0.08_260)]/20 text-[oklch(0.70_0.08_260)] border-[oklch(0.55_0.08_260)]/40',
};

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-destructive/15 text-destructive border-destructive/30',
  acknowledged: 'bg-[oklch(0.75_0.18_55)]/15 text-[oklch(0.85_0.15_55)] border-[oklch(0.75_0.18_55)]/30',
  remediated: 'bg-primary/15 text-primary border-primary/30',
  false_positive: 'bg-muted text-muted-foreground border-border',
  accepted_risk: 'bg-muted text-muted-foreground border-border',
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function FindingCard({ finding, isLive }: { finding: Finding | LiveFinding; isLive?: boolean }) {
  const { setSelectedFindingId } = useAppStore();
  const isFull = 'filePath' in finding && 'commitMessage' in finding;

  return (
    <div
      className={cn(
        'border-l-4 rounded-lg p-4 cursor-pointer transition-all hover:brightness-110',
        SEVERITY_STYLES[finding.severity] || SEVERITY_STYLES.high,
        isLive && 'animate-in fade-in slide-in-from-top-2 duration-300'
      )}
      onClick={() => 'id' in finding && setSelectedFindingId(finding.id)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cn('text-[10px] px-1.5 h-5 font-mono', SEVERITY_BADGE[finding.severity])}>
              {finding.severity.toUpperCase()}
            </Badge>
            {finding.isVerified && (
              <Badge variant="outline" className="text-[10px] px-1.5 h-5 border-primary/40 text-primary">
                <Shield className="w-2.5 h-2.5 mr-0.5" /> VERIFIED
              </Badge>
            )}
            {finding.isForkMatch && (
              <Badge variant="outline" className="text-[10px] px-1.5 h-5 border-[oklch(0.75_0.18_55)]/40 text-[oklch(0.85_0.15_55)]">
                <GitFork className="w-2.5 h-2.5 mr-0.5" /> FORK
              </Badge>
            )}
            {isLive && (
              <Badge variant="outline" className="text-[10px] px-1.5 h-5 border-primary/40 text-primary animate-pulse-live">
                <Radio className="w-2.5 h-2.5 mr-0.5" /> LIVE
              </Badge>
            )}
          </div>
          <h4 className="text-sm font-medium mt-1.5 truncate">{finding.secretType}</h4>
          {isFull && (
            <>
              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><FileCode2 className="w-3 h-3" />{finding.filePath}</span>
                <span className="flex items-center gap-1"><User className="w-3 h-3" />{finding.commitAuthor}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 truncate font-mono">{finding.matchedValue}</p>
            </>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1 justify-end">
            <Clock className="w-3 h-3" />{timeAgo(finding.discoveredAt)}
          </p>
          {isFull && (
            <Badge variant="outline" className={cn('text-[10px] px-1.5 h-5 mt-1.5', STATUS_STYLES[finding.status])}>
              {finding.status.replace(/_/g, ' ')}
            </Badge>
          )}
        </div>
      </div>
      {isFull && (
        <>
          <Separator className="my-2.5 bg-border/50" />
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground truncate mr-2 font-mono">{finding.repoName}</p>
            <a href={finding.fileUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary hover:underline flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
              View <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </>
      )}
    </div>
  );
}

export function FeedView() {
  const { feedFilter, setFeedFilter, liveFindings, addLiveFinding, setWsConnected, wsConnected, setSelectedFindingId, selectedFindingId } = useAppStore();

  const { data: findings, isLoading } = useQuery<Finding[]>({
    queryKey: ['findings'],
    queryFn: () => fetch('/api/findings').then(r => r.json()),
  });

  // WebSocket connection
  useEffect(() => {
    const socket = io('/?XTransformPort=3004', {
      path: '/ws',
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => { setWsConnected(true); socket.emit('subscribe:findings'); });
    socket.on('disconnect', () => setWsConnected(false));
    socket.on('finding:new', (f: LiveFinding) => addLiveFinding(f));
    socket.on('scan:progress', () => {});

    return () => { socket.disconnect(); };
  }, [addLiveFinding, setWsConnected]);

  // Finding detail query
  const { data: selectedFinding } = useQuery({
    queryKey: ['finding', selectedFindingId],
    queryFn: () => fetch(`/api/finding/${selectedFindingId}`).then(r => r.json()),
    enabled: !!selectedFindingId,
  });

  const filtered = (findings || []).filter(f => {
    if (feedFilter.severity !== 'all' && f.severity !== feedFilter.severity) return false;
    if (feedFilter.status !== 'all' && f.status !== feedFilter.status) return false;
    if (feedFilter.verified === 'verified' && !f.isVerified) return false;
    if (feedFilter.verified === 'unverified' && f.isVerified) return false;
    if (feedFilter.search) {
      const s = feedFilter.search.toLowerCase();
      return f.secretType.toLowerCase().includes(s) || f.repoName.toLowerCase().includes(s) || f.filePath.toLowerCase().includes(s) || f.commitAuthor.toLowerCase().includes(s);
    }
    return true;
  });

  const allItems: Array<{ type: 'live'; data: LiveFinding } | { type: 'db'; data: Finding }> = [
    ...liveFindings.map(f => ({ type: 'live' as const, data: f })),
    ...filtered.map(f => ({ type: 'db' as const, data: f })),
  ];

  return (
    <div className="flex gap-4 h-full">
      {/* Main Feed */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header + Filters */}
        <div className="space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                Live Feed
                {wsConnected && <span className="flex items-center gap-1.5 text-xs font-normal text-primary"><span className="w-2 h-2 bg-primary rounded-full animate-pulse-live" />Connected</span>}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">{allItems.length} findings ({liveFindings.length} live)</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search secrets, repos, authors..."
                className="pl-8 h-9 text-sm"
                value={feedFilter.search}
                onChange={e => setFeedFilter({ search: e.target.value })}
              />
            </div>
            <Select value={feedFilter.severity} onValueChange={v => setFeedFilter({ severity: v })}>
              <SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={feedFilter.status} onValueChange={v => setFeedFilter({ status: v })}>
              <SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="remediated">Remediated</SelectItem>
                <SelectItem value="false_positive">False Positive</SelectItem>
                <SelectItem value="accepted_risk">Accepted Risk</SelectItem>
              </SelectContent>
            </Select>
            <Select value={feedFilter.verified} onValueChange={v => setFeedFilter({ verified: v })}>
              <SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Feed Items */}
        <ScrollArea className="flex-1 mt-3 pr-1">
          <div className="space-y-2">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}><CardContent className="p-4"><div className="h-20 bg-muted/30 rounded animate-pulse" /></CardContent></Card>
              ))
            ) : allItems.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Eye className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No findings match your filters</p>
              </div>
            ) : (
              allItems.map(item => (
                <FindingCard
                  key={item.data.id}
                  finding={item.data}
                  isLive={item.type === 'live'}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Detail Drawer */}
      {selectedFinding && (
        <div className="w-[380px] shrink-0 border-l border-border bg-card/50 overflow-y-auto">
          <div className="p-4 space-y-4 sticky top-0 bg-card/95 backdrop-blur z-10 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Finding Detail</h3>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedFindingId(null)}>Close</Button>
            </div>
            <Badge variant="outline" className={cn('text-xs', SEVERITY_BADGE[selectedFinding.severity])}>
              {selectedFinding.severity.toUpperCase()} — {selectedFinding.secretType}
            </Badge>
          </div>

          <div className="p-4 space-y-4">
            {/* Secret Value */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Matched Value</label>
              <code className="block mt-1 p-2.5 bg-background rounded-md text-xs font-mono break-all border border-border">
                {selectedFinding.matchedValue}
              </code>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><label className="text-[10px] uppercase tracking-wider text-muted-foreground">Rule</label><p className="mt-0.5 font-medium">{selectedFinding.rule?.name || 'N/A'}</p></div>
              <div><label className="text-[10px] uppercase tracking-wider text-muted-foreground">Category</label><p className="mt-0.5 font-medium">{selectedFinding.rule?.category || 'N/A'}</p></div>
              <div><label className="text-[10px] uppercase tracking-wider text-muted-foreground">Repository</label><p className="mt-0.5 font-mono text-primary">{selectedFinding.repoName}</p></div>
              <div><label className="text-[10px] uppercase tracking-wider text-muted-foreground">File Path</label><p className="mt-0.5 font-mono">{selectedFinding.filePath}</p></div>
              <div><label className="text-[10px] uppercase tracking-wider text-muted-foreground">Author</label><p className="mt-0.5">{selectedFinding.commitAuthor}</p></div>
              <div><label className="text-[10px] uppercase tracking-wider text-muted-foreground">Line</label><p className="mt-0.5 font-mono">{selectedFinding.lineNumber || 'N/A'}</p></div>
            </div>

            {/* Detection Flags */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Detection Metadata</label>
              <div className="flex flex-wrap gap-1.5">
                {selectedFinding.isVerified && <Badge variant="outline" className="text-[10px] h-5 border-primary/40 text-primary"><Shield className="w-2.5 h-2.5 mr-0.5" />Verified Live</Badge>}
                {selectedFinding.isAstFiltered && <Badge variant="outline" className="text-[10px] h-5 border-[oklch(0.65_0.20_280)]/40 text-[oklch(0.80_0.18_280)]">AST-Filtered</Badge>}
                {selectedFinding.isForkMatch && <Badge variant="outline" className="text-[10px] h-5 border-[oklch(0.75_0.18_55)]/40 text-[oklch(0.85_0.15_55)]"><GitFork className="w-2.5 h-2.5 mr-0.5" />Fork Match</Badge>}
                {!selectedFinding.isStillPresent && <Badge variant="outline" className="text-[10px] h-5 border-primary/40 text-primary">Deleted from HEAD</Badge>}
              </div>
            </div>

            {/* Verification Note */}
            {selectedFinding.verificationNote && (
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Verification Note</label>
                <p className="mt-1 text-xs p-2 bg-primary/5 border border-primary/20 rounded-md text-primary">{selectedFinding.verificationNote}</p>
              </div>
            )}

            {/* Fork Info */}
            {selectedFinding.isForkMatch && selectedFinding.upstreamRepo && (
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Fork Source</label>
                <p className="mt-1 text-xs">Found in fork. Upstream: <span className="font-mono text-primary">{selectedFinding.upstreamRepo}</span></p>
              </div>
            )}

            {/* Pattern */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Regex Pattern</label>
              <code className="block mt-1 p-2 bg-background rounded-md text-[11px] font-mono break-all border border-border">{selectedFinding.matchedPattern}</code>
            </div>

            {/* Commit Info */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Commit</label>
              <div className="mt-1 p-2 bg-background rounded-md border border-border space-y-1">
                <p className="text-xs font-mono text-primary">{selectedFinding.commitHash}</p>
                <p className="text-xs text-muted-foreground">{selectedFinding.commitMessage}</p>
                <p className="text-[10px] text-muted-foreground">Branch: {selectedFinding.branch} &middot; {new Date(selectedFinding.commitDate).toLocaleString()}</p>
              </div>
            </div>

            {/* MTTR */}
            {selectedFinding.mttrHours !== null && (
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">MTTR</label>
                <p className="mt-0.5 text-lg font-bold font-mono text-primary">{selectedFinding.mttrHours}h</p>
              </div>
            )}

            {/* Links */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 text-xs h-8" asChild>
                <a href={selectedFinding.fileUrl} target="_blank" rel="noopener noreferrer">View File</a>
              </Button>
              <Button variant="outline" size="sm" className="flex-1 text-xs h-8" asChild>
                <a href={selectedFinding.commitUrl} target="_blank" rel="noopener noreferrer">View Commit</a>
              </Button>
            </div>

            {/* Event Timeline */}
            {selectedFinding.events && selectedFinding.events.length > 0 && (
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Event Timeline</label>
                <div className="mt-2 space-y-2">
                  {selectedFinding.events.map((ev, i) => (
                    <div key={ev.id} className="flex gap-2 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div>
                        <p className="font-medium">{ev.eventType.replace(/_/g, ' ')} <span className="text-muted-foreground font-normal">by {ev.actor}</span></p>
                        <p className="text-muted-foreground">{ev.note}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(ev.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}