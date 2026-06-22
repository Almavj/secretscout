// SecretScout Pro — Type Definitions

export type ViewId = 'dashboard' | 'feed' | 'discovery' | 'detection' | 'integrations' | 'settings';

export interface Finding {
  id: string;
  organizationId: string;
  scanId: string;
  ruleId: string | null;
  dedupHash: string;
  secretType: string;
  matchedPattern: string;
  matchedValue: string;
  fileUrl: string;
  filePath: string;
  repoName: string;
  repoUrl: string;
  commitHash: string;
  commitUrl: string;
  commitMessage: string;
  commitAuthor: string;
  commitDate: string;
  branch: string;
  lineNumber: number | null;
  severity: 'critical' | 'high' | 'medium' | 'low';
  isVerified: boolean;
  verificationNote: string;
  verifiedAt: string | null;
  isAstFiltered: boolean;
  isStillPresent: boolean;
  isForkMatch: boolean;
  upstreamRepo: string | null;
  status: 'open' | 'acknowledged' | 'remediated' | 'false_positive' | 'accepted_risk';
  assignedTo: string | null;
  remediatedAt: string | null;
  mttrHours: number | null;
  remediationNote: string;
  artifactPath: string | null;
  discoveredAt: string;
  updatedAt: string;
  rule?: { name: string; category: string; pattern?: string; description?: string };
  scan?: { scanType: string; scopeMode: string; provider?: { name: string; type: string }; dorkTemplate?: { name: string } };
  events?: FindingEvent[];
}

export interface FindingEvent {
  id: string;
  findingId: string;
  eventType: string;
  actor: string;
  note: string;
  createdAt: string;
}

export interface Scan {
  id: string;
  organizationId: string;
  providerId: string | null;
  dorkTemplateId: string | null;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  scanType: string;
  scopeMode: string;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  statsTotal: number;
  statsNew: number;
  statsDuplicate: number;
  createdAt: string;
  provider?: { name: string; type: string };
  dorkTemplate?: { name: string; queryTemplate: string };
}

export interface DetectionRule {
  id: string;
  name: string;
  description: string;
  pattern: string;
  secretGroup: number;
  category: string;
  severity: string;
  isBuiltin: boolean;
  isAstAware: boolean;
  isDiffAware: boolean;
  enabled: boolean;
  tomlConfig: string;
}

export interface DorkTemplate {
  id: string;
  providerId: string;
  name: string;
  description: string;
  queryTemplate: string;
  category: string;
  severity: string;
  enabled: boolean;
  isBuiltin: boolean;
  scheduleCron: string;
  lastRunAt: string | null;
  provider?: { name: string; type: string };
}

export interface SourceProvider {
  id: string;
  organizationId: string;
  type: string;
  name: string;
  enabled: boolean;
  config: string;
  tokenPools: TokenPool[];
  dorkTemplates: { id: string; name: string; enabled: boolean }[];
  _count?: { scans: number };
}

export interface TokenPool {
  id: string;
  providerId: string;
  label: string;
  tokenType: string;
  tokenValue: string;
  rateLimitRemaining: number;
  rateLimitResetAt: string | null;
  lastUsedAt: string | null;
  enabled: boolean;
  providerName?: string;
  providerType?: string;
}

export interface Integration {
  id: string;
  type: string;
  name: string;
  enabled: boolean;
  config: string;
}

export interface ScopeEntry {
  id: string;
  targetType: string;
  targetValue: string;
  accessLevel: string;
  enabled: boolean;
}

export interface DashboardStats {
  summary: {
    totalFindings: number;
    openFindings: number;
    criticalOpen: number;
    highOpen: number;
    remediatedFindings: number;
    falsePositives: number;
    acceptedRisks: number;
    verifiedFindings: number;
    forkMatches: number;
    astFiltered: number;
    avgMttr: number;
    activeScans: number;
  };
  severityBreakdown: { severity: string; count: number }[];
  categoryBreakdown: { category: string; count: number }[];
  repoBreakdown: { repo: string; count: number }[];
  findingsByDay: { date: string; critical: number; high: number; medium: number; low: number }[];
  recentScans: Scan[];
}

export interface LiveFinding {
  id: string;
  secretType: string;
  severity: string;
  repoName: string;
  filePath: string;
  commitHash: string;
  commitAuthor: string;
  isVerified: boolean;
  isForkMatch: boolean;
  discoveredAt: string;
  status: string;
}