'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield, AlertTriangle, Github, Gitlab, GitBranch, Key,
  Lock, Eye, Plus, Trash2, X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { apiFetch } from '@/lib/api';
import type { ScopeEntry, TokenPool } from '@/lib/types';
import { toast } from 'sonner';

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
  const queryClient = useQueryClient();
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
  const [tokenLabel, setTokenLabel] = useState('');
  const [tokenValue, setTokenValue] = useState('');
  const [scopeType, setScopeType] = useState('github_org');
  const [scopeValue, setScopeValue] = useState('');

  const { data: scopeEntries } = useQuery<ScopeEntry[]>({
    queryKey: ['scope'],
    queryFn: () => apiFetch('/api/scope'),
  });

  const { data: tokens } = useQuery<TokenPool[]>({
    queryKey: ['tokens'],
    queryFn: () => apiFetch('/api/tokens'),
  });

  const addToken = useMutation({
    mutationFn: () => apiFetch('/api/tokens', {
      method: 'POST',
      body: JSON.stringify({ label: tokenLabel, token: tokenValue, tokenType: 'pat' }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tokens'] });
      setTokenDialogOpen(false);
      setTokenLabel('');
      setTokenValue('');
      toast.success('Token added successfully');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteToken = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/tokens?id=${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tokens'] });
      toast.success('Token deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addScope = useMutation({
    mutationFn: () => apiFetch('/api/scope', {
      method: 'POST',
      body: JSON.stringify({ targetType: scopeType, targetValue: scopeValue }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scope'] });
      setScopeDialogOpen(false);
      setScopeValue('');
      toast.success('Scope entry added');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteScope = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/scope?id=${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scope'] });
      toast.success('Scope entry deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Scope restrictions and token pool management.</p>
      </div>

      {/* Scope Restriction Warning */}
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
              <p className="font-medium text-[oklch(0.80_0.20_25)]">This control is baked into the design.</p>
              <p className="text-muted-foreground">
                The discovery layer <strong className="text-foreground">defaults to scope-restricted mode</strong>: scanning only repos under orgs/users in the allowlist below.
              </p>
            </div>
          </div>
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
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" /> Scope Allowlist
            <Badge variant="outline" className="text-[10px]">{scopeEntries?.length || 0} entries</Badge>
          </h3>
          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setScopeDialogOpen(true)}>
            <Plus className="w-3 h-3 mr-1" /> Add Scope
          </Button>
        </div>
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
                    <th className="p-3 font-medium w-[60px]"></th>
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
                        <td className="p-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => deleteScope.mutate(entry.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {(!scopeEntries || scopeEntries.length === 0) && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-muted-foreground">
                        No scope entries configured. Click &quot;Add Scope&quot; to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Token Pool Management */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Key className="w-4 h-4 text-primary" /> Token Pool (Rotating Auth)
            <Badge variant="outline" className="text-[10px]">Rotates to avoid 30 req/min rate limit</Badge>
          </h3>
          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setTokenDialogOpen(true)}>
            <Plus className="w-3 h-3 mr-1" /> Add Token
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          A pool of GitHub PATs rotate to distribute API load and avoid the secondary rate limit.
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
                    <th className="p-3 font-medium w-[60px]"></th>
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
                        <td className="p-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => deleteToken.mutate(token.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {(!tokens || tokens.length === 0) && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted-foreground">
                        No tokens configured. Click &quot;Add Token&quot; to add a GitHub PAT.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Add Token Dialog */}
      <Dialog open={tokenDialogOpen} onOpenChange={setTokenDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-4 h-4" /> Add GitHub Token
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium mb-1.5 block">Label</label>
              <Input
                placeholder="e.g. Bot Account 1"
                value={tokenLabel}
                onChange={e => setTokenLabel(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block">Personal Access Token</label>
              <Input
                placeholder="ghp_xxxxxxxxxxxx"
                type="password"
                value={tokenValue}
                onChange={e => setTokenValue(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Requires repo scope. Token is validated against GitHub API before saving.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setTokenDialogOpen(false)}>
              <X className="w-3 h-3 mr-1" /> Cancel
            </Button>
            <Button
              size="sm"
              disabled={!tokenLabel || !tokenValue || addToken.isPending}
              onClick={() => addToken.mutate()}
            >
              {addToken.isPending ? 'Validating...' : 'Add Token'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Scope Dialog */}
      <Dialog open={scopeDialogOpen} onOpenChange={setScopeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-4 h-4" /> Add Scope Entry
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium mb-1.5 block">Type</label>
              <Select value={scopeType} onValueChange={setScopeType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="github_org">GitHub Organization</SelectItem>
                  <SelectItem value="github_user">GitHub User</SelectItem>
                  <SelectItem value="repo_allowlist">Repository (Allowlist)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block">Target Value</label>
              <Input
                placeholder={scopeType === 'repo_allowlist' ? 'org/repo-name' : 'org-or-username'}
                value={scopeValue}
                onChange={e => setScopeValue(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                {scopeType === 'repo_allowlist'
                  ? 'Format: owner/repo (e.g. myorg/myrepo)'
                  : 'Enter the GitHub organization or user name'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setScopeDialogOpen(false)}>
              <X className="w-3 h-3 mr-1" /> Cancel
            </Button>
            <Button
              size="sm"
              disabled={!scopeValue || addScope.isPending}
              onClick={() => addScope.mutate()}
            >
              {addScope.isPending ? 'Adding...' : 'Add Scope'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
