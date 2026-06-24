// SecretScout Pro — Report Generator
// Generates HTML and CSV reports from findings data.

import { db } from './db';

interface ReportConfig {
  organizationId: string;
  format: 'html' | 'csv' | 'json';
  scanId?: string;
  severityFilter?: string[];
  statusFilter?: string[];
  includeVerified?: boolean;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getSeverityBadge(severity: string): string {
  const colors: Record<string, string> = {
    critical: '#dc2626',
    high: '#ea580c',
    medium: '#7c3aed',
    low: '#6b7280',
  };
  return `<span style="color:${colors[severity] || '#6b7280'};font-weight:600;text-transform:uppercase">${severity}</span>`;
}

export async function generateReport(config: ReportConfig): Promise<string> {
  const { organizationId, format, scanId, severityFilter, statusFilter, includeVerified } = config;

  const where: Record<string, unknown> = { organizationId };
  if (scanId) where.scanId = scanId;
  if (severityFilter?.length) where.severity = { in: severityFilter };
  if (statusFilter?.length) where.status = { in: statusFilter };
  if (includeVerified === false) where.isVerified = false;

  const findings = await db.finding.findMany({
    where,
    include: { rule: { select: { name: true, category: true } } },
    orderBy: [{ severity: 'asc' }, { discoveredAt: 'desc' }],
  });

  const org = await db.organization.findFirst();

  if (format === 'csv') return generateCSV(findings);
  if (format === 'json') return JSON.stringify(findings, null, 2);
  return generateHTML(findings, org?.name || 'Unknown', scanId);
}

function generateCSV(findings: Array<Record<string, unknown>>): string {
  const headers = ['ID', 'Severity', 'Type', 'Repository', 'File', 'Line', 'Verified', 'Status', 'Discovered', 'Rule'];
  const rows = findings.map(f => [
    f.id,
    f.severity,
    f.secretType,
    f.repoName,
    f.filePath,
    f.lineNumber || '',
    f.isVerified ? 'Yes' : 'No',
    f.status,
    f.discoveredAt instanceof Date ? f.discoveredAt.toISOString() : String(f.discoveredAt),
    (f.rule as Record<string, string>)?.name || '',
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

  return [headers.join(','), ...rows].join('\n');
}

function generateHTML(findings: Array<Record<string, unknown>>, orgName: string, scanId?: string): string {
  const total = findings.length;
  const critical = findings.filter(f => f.severity === 'critical').length;
  const high = findings.filter(f => f.severity === 'high').length;
  const medium = findings.filter(f => f.severity === 'medium').length;
  const low = findings.filter(f => f.severity === 'low').length;
  const verified = findings.filter(f => f.isVerified).length;
  const open = findings.filter(f => f.status === 'open').length;
  const now = new Date().toISOString().split('T')[0];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SecretScout Pro — Credential Exposure Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; line-height: 1.6; padding: 40px; max-width: 1200px; margin: 0 auto; }
  h1 { font-size: 24px; margin-bottom: 8px; }
  .subtitle { color: #6b7280; margin-bottom: 32px; }
  .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 16px; margin-bottom: 32px; }
  .card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; text-align: center; }
  .card .value { font-size: 28px; font-weight: 700; }
  .card .label { font-size: 12px; color: #6b7280; margin-top: 4px; }
  .critical .value { color: #dc2626; }
  .high .value { color: #ea580c; }
  .medium .value { color: #7c3aed; }
  .verified .value { color: #059669; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
  th { background: #f3f4f6; text-align: left; padding: 10px 12px; border-bottom: 2px solid #e5e7eb; font-weight: 600; }
  td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  tr:hover { background: #f9fafb; }
  .severity { font-weight: 600; text-transform: uppercase; }
  .mono { font-family: monospace; font-size: 11px; word-break: break-all; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 11px; text-align: center; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<h1>SecretScout Pro — Credential Exposure Report</h1>
<p class="subtitle">Organization: ${escapeHtml(orgName)} &middot; Generated: ${now}${scanId ? ` &middot; Scan: ${escapeHtml(scanId)}` : ''}</p>

<div class="summary">
  <div class="card"><div class="value">${total}</div><div class="label">Total Findings</div></div>
  <div class="card critical"><div class="value">${critical}</div><div class="label">Critical</div></div>
  <div class="card high"><div class="value">${high}</div><div class="label">High</div></div>
  <div class="card medium"><div class="value">${medium}</div><div class="label">Medium</div></div>
  <div class="card"><div class="value">${low}</div><div class="label">Low</div></div>
  <div class="card verified"><div class="value">${verified}</div><div class="label">Verified Live</div></div>
  <div class="card"><div class="value">${open}</div><div class="label">Open</div></div>
</div>

<table>
<thead>
<tr><th>#</th><th>Severity</th><th>Type</th><th>Repository</th><th>File</th><th>Line</th><th>Verified</th><th>Status</th><th>Discovered</th></tr>
</thead>
<tbody>
${findings.map((f, i) => `<tr>
<td>${i + 1}</td>
<td class="severity">${getSeverityBadge(String(f.severity))}</td>
<td>${escapeHtml(String(f.secretType))}</td>
<td class="mono">${escapeHtml(String(f.repoName))}</td>
<td class="mono">${escapeHtml(String(f.filePath))}</td>
<td>${f.lineNumber || '—'}</td>
<td>${f.isVerified ? '✅' : '—'}</td>
<td>${escapeHtml(String(f.status).replace(/_/g, ' '))}</td>
<td>${f.discoveredAt instanceof Date ? f.discoveredAt.toLocaleDateString() : '—'}</td>
</tr>`).join('\n')}
</tbody>
</table>

<div class="footer">
  SecretScout Pro v1.0.0 — Credential Exposure Detection Report &middot; ${total} findings &middot; ${escapeHtml(orgName)}
</div>
</body>
</html>`;
}
