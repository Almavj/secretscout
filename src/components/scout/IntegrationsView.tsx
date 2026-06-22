'use client';

import { useQuery } from '@tanstack/react-query';
import { Webhook, Slack, Bell, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import type { Integration } from '@/lib/types';

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
  const { data: integrations, isLoading } = useQuery<Integration[]>({ queryKey: ['integrations'], queryFn: () => fetch('/api/integrations').then(r => r.json()) });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Integrations</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Webhook integrations for alerts and incident management. Critical + verified findings trigger Slack and PagerDuty notifications.
        </p>
      </div>

      {/* Critical Alert Notice */}
      <Card className="border-[oklch(0.65_0.25_25)]/30 bg-[oklch(0.65_0.25_25)]/5">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[oklch(0.65_0.25_25)] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Alert Routing Policy</p>
            <p className="text-xs text-muted-foreground mt-1">
              Only <strong className="text-[oklch(0.80_0.20_25)]">critical severity</strong> and <strong className="text-[oklch(0.80_0.20_25)]">verified, live</strong> findings trigger real-time webhook notifications. Unverified, medium, and low-severity findings are aggregated into daily digests to prevent alert fatigue.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Integration Cards */}
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
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {integ.type === 'slack' && (
                    <>
                      <div>
                        <p className="text-muted-foreground mb-1">Webhook URL</p>
                        <code className="text-[10px] font-mono text-primary/80">{config.webhookUrl?.replace(/(services\/).*(\/xxx)/, '$1***$2')}</code>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Channel</p>
                        <p className="font-mono">{config.channel}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Mention</p>
                        <p className="font-mono text-[oklch(0.80_0.20_25)]">{config.mentionChannel}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Severity Filter</p>
                        <div className="flex gap-1">
                          {(config.severityFilter || []).map((s: string) => (
                            <Badge key={s} variant="outline" className="text-[10px] h-5 border-destructive/40 text-destructive">{s}</Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  {integ.type === 'pagerduty' && (
                    <>
                      <div>
                        <p className="text-muted-foreground mb-1">Routing Key</p>
                        <code className="text-[10px] font-mono text-primary/80">{config.routingKey?.replace(/^(.{8}).*/, '$1***')}</code>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Severity Filter</p>
                        <div className="flex gap-1">
                          {(config.severityFilter || []).map((s: string) => (
                            <Badge key={s} variant="outline" className="text-[10px] h-5 border-destructive/40 text-destructive">{s}</Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  {integ.type === 'webhook' && (
                    <>
                      <div>
                        <p className="text-muted-foreground mb-1">Endpoint</p>
                        <code className="text-[10px] font-mono text-primary/80 truncate block max-w-[300px]">{config.url}</code>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Secret</p>
                        <code className="text-[10px] font-mono text-muted-foreground">{config.secret?.replace(/^(.{8}).*/, '$1***')}</code>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}