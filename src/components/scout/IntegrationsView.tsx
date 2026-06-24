'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Webhook, Slack, Bell, AlertTriangle, Plus, Trash2, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { apiFetch } from '@/lib/api';
import type { Integration } from '@/lib/types';
import { toast } from 'sonner';

const TYPE_ICONS: Record<string, React.ElementType> = {
  slack: Slack,
  pagerduty: Bell,
  webhook: Webhook,
  jira: Webhook,
};

const TYPE_COLORS: Record<string, string> = {
  slack: 'text-[#E01E5A]',
  pagerduty: 'text-[#06AC38]',
  webhook: 'text-primary',
  jira: 'text-[#0052CC]',
};

export function IntegrationsView() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [intType, setIntType] = useState('webhook');
  const [intName, setIntName] = useState('');
  const [intUrl, setIntUrl] = useState('');
  const [intSecret, setIntSecret] = useState('');

  const { data: integrations } = useQuery<Integration[]>({
    queryKey: ['integrations'],
    queryFn: () => apiFetch('/api/integrations'),
  });

  const addIntegration = useMutation({
    mutationFn: () => {
      const config: Record<string, string> = {};
      if (intType === 'webhook') {
        config.url = intUrl;
        config.secret = intSecret;
      } else if (intType === 'slack') {
        config.webhookUrl = intUrl;
      }
      return apiFetch('/api/integrations', {
        method: 'POST',
        body: JSON.stringify({ type: intType, name: intName, config }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      setDialogOpen(false);
      setIntName('');
      setIntUrl('');
      setIntSecret('');
      toast.success('Integration added');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteIntegration = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/integrations?id=${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast.success('Integration deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Integrations</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Webhook integrations for alerts and incident management.
          </p>
        </div>
        <Button size="sm" variant="outline" className="text-xs" onClick={() => setDialogOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Integration
        </Button>
      </div>

      <Card className="border-[oklch(0.65_0.25_25)]/30 bg-[oklch(0.65_0.25_25)]/5">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[oklch(0.65_0.25_25)] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Alert Routing Policy</p>
            <p className="text-xs text-muted-foreground mt-1">
              Only <strong className="text-[oklch(0.80_0.20_25)]">critical severity</strong> and <strong className="text-[oklch(0.80_0.20_25)]">verified, live</strong> findings trigger real-time webhook notifications.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {(integrations || []).map(integ => {
          const Icon = TYPE_ICONS[integ.type] || Webhook;
          const config = JSON.parse(integ.config || '{}');
          const color = TYPE_COLORS[integ.type] || 'text-primary';

          return (
            <Card key={integ.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-sm">{integ.name}</CardTitle>
                      <CardDescription className="text-xs capitalize">{integ.type} Integration</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={integ.enabled ? 'outline' : 'secondary'} className={integ.enabled ? 'border-primary/40 text-primary' : ''}>
                      {integ.enabled ? 'Active' : 'Disabled'}
                    </Badge>
                    <Switch checked={integ.enabled} disabled />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => deleteIntegration.mutate(integ.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {integ.type === 'slack' && (
                    <>
                      <div>
                        <p className="text-muted-foreground mb-1">Webhook URL</p>
                        <code className="text-[10px] font-mono text-primary/80">{config.webhookUrl?.replace(/(services\/).*(\/xxx)/, '$1***$2') || 'Not configured'}</code>
                      </div>
                      {config.channel && (
                        <div>
                          <p className="text-muted-foreground mb-1">Channel</p>
                          <p className="font-mono">{config.channel}</p>
                        </div>
                      )}
                    </>
                  )}
                  {integ.type === 'webhook' && (
                    <>
                      <div>
                        <p className="text-muted-foreground mb-1">Endpoint</p>
                        <code className="text-[10px] font-mono text-primary/80 truncate block max-w-[300px]">{config.url || 'Not configured'}</code>
                      </div>
                      {config.secret && (
                        <div>
                          <p className="text-muted-foreground mb-1">Secret</p>
                          <code className="text-[10px] font-mono text-muted-foreground">{config.secret.replace(/^(.{8}).*/, '$1***')}</code>
                        </div>
                      )}
                    </>
                  )}
                  {integ.type === 'pagerduty' && (
                    <div>
                      <p className="text-muted-foreground mb-1">Routing Key</p>
                      <code className="text-[10px] font-mono text-primary/80">{config.routingKey?.replace(/^(.{8}).*/, '$1***') || 'Not configured'}</code>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {(!integrations || integrations.length === 0) && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Webhook className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No integrations configured</p>
              <p className="text-xs mt-1">Click &quot;Add Integration&quot; to set up webhooks, Slack, or PagerDuty alerts.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Integration Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Integration
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium mb-1.5 block">Type</label>
              <Select value={intType} onValueChange={setIntType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="webhook">Webhook</SelectItem>
                  <SelectItem value="slack">Slack</SelectItem>
                  <SelectItem value="pagerduty">PagerDuty</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block">Name</label>
              <Input
                placeholder="e.g. Security Alerts Webhook"
                value={intName}
                onChange={e => setIntName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block">
                {intType === 'slack' ? 'Slack Webhook URL' : intType === 'pagerduty' ? 'Routing Key' : 'Webhook URL'}
              </label>
              <Input
                placeholder={intType === 'slack' ? 'https://hooks.slack.com/services/...' : 'https://your-endpoint.com/webhook'}
                value={intUrl}
                onChange={e => setIntUrl(e.target.value)}
              />
            </div>
            {intType === 'webhook' && (
              <div>
                <label className="text-xs font-medium mb-1.5 block">Secret (optional)</label>
                <Input
                  type="password"
                  placeholder="Webhook signing secret"
                  value={intSecret}
                  onChange={e => setIntSecret(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
              <X className="w-3 h-3 mr-1" /> Cancel
            </Button>
            <Button
              size="sm"
              disabled={!intName || !intUrl || addIntegration.isPending}
              onClick={() => addIntegration.mutate()}
            >
              {addIntegration.isPending ? 'Adding...' : 'Add Integration'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
