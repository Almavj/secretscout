import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const org = await db.organization.findFirst({ where: { slug: 'acme-corp' } });
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const [totalFindings, openFindings, criticalOpen, highOpen, remediatedFindings, falsePositives, acceptedRisks, verifiedFindings, forkMatches, astFiltered] = await Promise.all([
      db.finding.count({ where: { organizationId: org.id } }),
      db.finding.count({ where: { organizationId: org.id, status: 'open' } }),
      db.finding.count({ where: { organizationId: org.id, severity: 'critical', status: 'open' } }),
      db.finding.count({ where: { organizationId: org.id, severity: 'high', status: 'open' } }),
      db.finding.count({ where: { organizationId: org.id, status: 'remediated' } }),
      db.finding.count({ where: { organizationId: org.id, status: 'false_positive' } }),
      db.finding.count({ where: { organizationId: org.id, status: 'accepted_risk' } }),
      db.finding.count({ where: { organizationId: org.id, isVerified: true } }),
      db.finding.count({ where: { organizationId: org.id, isForkMatch: true } }),
      db.finding.count({ where: { organizationId: org.id, isAstFiltered: true } }),
    ]);

    // MTTR calculation
    const remediatedWithMttr = await db.finding.findMany({
      where: { organizationId: org.id, status: 'remediated', mttrHours: { not: null } },
      select: { mttrHours: true },
    });
    const avgMttr = remediatedWithMttr.length > 0
      ? remediatedWithMttr.reduce((sum, f) => sum + (f.mttrHours || 0), 0) / remediatedWithMttr.length
      : 0;

    // Findings by severity
    const severityBreakdown = await db.finding.groupBy({
      by: ['severity'],
      where: { organizationId: org.id },
      _count: true,
    });

    // Findings by category (from rules)
    const categoryBreakdown = await db.finding.findMany({
      where: { organizationId: org.id, ruleId: { not: null } },
      include: { rule: { select: { category: true } } },
    });
    const categoryCounts: Record<string, number> = {};
    for (const f of categoryBreakdown) {
      const cat = f.rule?.category || 'unknown';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }

    // Findings by repo
    const repoBreakdown = await db.finding.groupBy({
      by: ['repoName'],
      where: { organizationId: org.id },
      _count: true,
      orderBy: { _count: { id: 'desc' } },
    });

    // Recent scan stats
    const recentScans = await db.scan.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, status: true, scanType: true, scopeMode: true, statsTotal: true, statsNew: true, statsDuplicate: true, startedAt: true, completedAt: true, createdAt: true },
    });

    // Findings over time (last 7 days, grouped by day)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const allFindings = await db.finding.findMany({
      where: { organizationId: org.id, discoveredAt: { gte: sevenDaysAgo } },
      select: { discoveredAt: true, severity: true, status: true },
    });
    const findingsByDay: Record<string, { critical: number; high: number; medium: number; low: number }> = {};
    for (const f of allFindings) {
      const day = f.discoveredAt.toISOString().split('T')[0];
      if (!findingsByDay[day]) findingsByDay[day] = { critical: 0, high: 0, medium: 0, low: 0 };
      findingsByDay[day][f.severity as keyof typeof findingsByDay[typeof day]] = (findingsByDay[day][f.severity as keyof typeof findingsByDay[typeof day]] || 0) + 1;
    }

    // Active scans count
    const activeScans = await db.scan.count({ where: { organizationId: org.id, status: 'running' } });

    return NextResponse.json({
      summary: { totalFindings, openFindings, criticalOpen, highOpen, remediatedFindings, falsePositives, acceptedRisks, verifiedFindings, forkMatches, astFiltered, avgMttr: Math.round(avgMttr * 10) / 10, activeScans },
      severityBreakdown: severityBreakdown.map(s => ({ severity: s.severity, count: s._count })),
      categoryBreakdown: Object.entries(categoryCounts).map(([category, count]) => ({ category, count })),
      repoBreakdown: repoBreakdown.map(r => ({ repo: r.repoName, count: r._count })),
      findingsByDay: Object.entries(findingsByDay).map(([date, counts]) => ({ date, ...counts })).sort((a, b) => a.date.localeCompare(b.date)),
      recentScans,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}