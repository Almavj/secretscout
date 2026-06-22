'use client';

import { Shield, LayoutDashboard, Radio, Search, Crosshair, Webhook, Settings, Zap } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { ViewId } from '@/lib/types';
import { cn } from '@/lib/utils';

const NAV_ITEMS: { id: ViewId; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Risk overview & MTTR' },
  { id: 'feed', label: 'Live Feed', icon: Radio, description: 'Real-time findings' },
  { id: 'discovery', label: 'Discovery', icon: Search, description: 'Sources, dorks & scans' },
  { id: 'detection', label: 'Detection', icon: Crosshair, description: 'Rules & verification' },
  { id: 'integrations', label: 'Integrations', icon: Webhook, description: 'Webhooks & alerts' },
  { id: 'settings', label: 'Settings', icon: Settings, description: 'Scope & tokens' },
];

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { currentView, setCurrentView, wsConnected, liveFindings } = useAppStore();

  return (
    <aside className={cn(
      'h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-200 shrink-0',
      collapsed ? 'w-[60px]' : 'w-[240px]'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-sidebar-border shrink-0">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Shield className="w-5 h-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-sidebar-foreground truncate">SecretScout Pro</h1>
            <p className="text-[10px] text-muted-foreground truncate">Credential Detection</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;
          const badge = item.id === 'feed' && liveFindings.length > 0 ? liveFindings.length : undefined;

          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
              )}
            >
              <div className="relative shrink-0">
                <Icon className={cn('w-4.5 h-4.5', isActive && 'text-primary')} />
                {item.id === 'feed' && wsConnected && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full animate-pulse-live" />
                )}
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{item.label}</span>
                    {badge && (
                      <span className="ml-2 text-[10px] font-mono bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                        +{badge}
                      </span>
                    )}
                  </div>
                  {!isActive && (
                    <p className="text-[10px] text-muted-foreground truncate">{item.description}</p>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom: Connection status & collapse toggle */}
      <div className="border-t border-sidebar-border p-3 space-y-2 shrink-0">
        <div className="flex items-center gap-2 px-1">
          <Zap className={cn('w-3.5 h-3.5', wsConnected ? 'text-primary' : 'text-muted-foreground')} />
          {!collapsed && (
            <span className={cn('text-[11px]', wsConnected ? 'text-primary' : 'text-muted-foreground')}>
              {wsConnected ? 'Live Feed Active' : 'Feed Disconnected'}
            </span>
          )}
        </div>
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center h-8 rounded-md hover:bg-sidebar-accent/50 text-muted-foreground hover:text-sidebar-foreground transition-colors"
        >
          <svg className={cn('w-4 h-4 transition-transform', collapsed && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>
    </aside>
  );
}