'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppStore } from '@/lib/store';
import { Sidebar } from '@/components/scout/Sidebar';
import { DashboardView } from '@/components/scout/DashboardView';
import { FeedView } from '@/components/scout/FeedView';
import { DiscoveryView } from '@/components/scout/DiscoveryView';
import { DetectionView } from '@/components/scout/DetectionView';
import { IntegrationsView } from '@/components/scout/IntegrationsView';
import { SettingsView } from '@/components/scout/SettingsView';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15000, retry: 1 } },
});

function AppShell() {
  const { currentView } = useAppStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const views: Record<string, React.ReactNode> = {
    dashboard: <DashboardView />,
    feed: <FeedView />,
    discovery: <DiscoveryView />,
    detection: <DetectionView />,
    integrations: <IntegrationsView />,
    settings: <SettingsView />,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar — desktop: inline, mobile: fixed overlay */}
      <div className={`hidden md:block shrink-0`}>
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      </div>
      <div className={`fixed inset-y-0 left-0 z-50 md:hidden transition-transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="md:hidden flex items-center h-14 px-4 border-b border-border shrink-0">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <span className="ml-3 text-sm font-bold">SecretScout Pro</span>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {views[currentView] || <DashboardView />}
        </div>

        {/* Footer */}
        <footer className="shrink-0 border-t border-border px-4 py-2.5 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>SecretScout Pro v1.0.0 — Production-grade credential exposure detection</span>
          <span className="hidden sm:inline">Scope mode: RESTRICTED (allowlist only) &middot; Acme Corp</span>
        </footer>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}