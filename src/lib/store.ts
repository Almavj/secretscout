import { create } from 'zustand';
import type { ViewId, LiveFinding, Scan } from '@/lib/types';

interface AppState {
  currentView: ViewId;
  setCurrentView: (v: ViewId) => void;
  liveFindings: LiveFinding[];
  addLiveFinding: (f: LiveFinding) => void;
  liveScans: Scan[];
  updateLiveScan: (s: Scan) => void;
  selectedFindingId: string | null;
  setSelectedFindingId: (id: string | null) => void;
  wsConnected: boolean;
  setWsConnected: (c: boolean) => void;
  feedFilter: FeedFilter;
  setFeedFilter: (f: Partial<FeedFilter>) => void;
}

export interface FeedFilter {
  severity: string;
  status: string;
  verified: string;
  search: string;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'dashboard',
  setCurrentView: (v) => set({ currentView: v }),
  liveFindings: [],
  addLiveFinding: (f) => set((s) => ({ liveFindings: [f, ...s.liveFindings].slice(0, 100) })),
  liveScans: [],
  updateLiveScan: (s) => set((state) => {
    const exists = state.liveScans.find(ls => ls.id === s.id);
    if (exists) return { liveScans: state.liveScans.map(ls => ls.id === s.id ? s : ls) };
    return { liveScans: [s, ...state.liveScans] };
  }),
  selectedFindingId: null,
  setSelectedFindingId: (id) => set({ selectedFindingId: id }),
  wsConnected: false,
  setWsConnected: (c) => set({ wsConnected: c }),
  feedFilter: { severity: 'all', status: 'all', verified: 'all', search: '' },
  setFeedFilter: (f) => set((s) => ({ feedFilter: { ...s.feedFilter, ...f } })),
}));