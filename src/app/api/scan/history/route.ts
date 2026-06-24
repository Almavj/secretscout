import { db } from '@/lib/db';
import { NextRequest } from 'next/server';
import { successResponse, errorResponse, getOrgFromRequest } from '@/lib/api-helpers';

export async function POST(request: NextRequest) {
  try {
    const org = await getOrgFromRequest(request);
    if (!org) return errorResponse('Organization not found', 'ORG_NOT_FOUND', 404);

    const body = await request.json();
    const { repo, since, until, maxCommits = 500 } = body;

    if (!repo) return errorResponse('Missing required field: repo', 'MISSING_FIELDS');

    const tokenPool = await db.tokenPool.findFirst({
      where: { provider: { organizationId: org.id, type: 'github', enabled: true }, enabled: true },
    });
    if (!tokenPool) return errorResponse('No GitHub tokens configured', 'NO_TOKENS', 400);

    const scanId = `scan-history-${Date.now()}`;
    await db.scan.create({
      data: {
        id: scanId, organizationId: org.id, status: 'running',
        scanType: 'history_walk', scopeMode: 'restricted', startedAt: new Date(),
      },
    });

    process.nextTick(async () => {
      try {
        const { historyScanner } = await import('@/lib/history-scanner');
        const result = await historyScanner.scanHistory({
          organizationId: org.id, scanId, repo,
          token: tokenPool.tokenValue, since, until, maxCommits,
        });

        await db.scan.update({
          where: { id: scanId },
          data: {
            status: 'completed', completedAt: new Date(),
            statsTotal: result.scanned, statsNew: result.findings, statsDuplicate: result.duplicates,
          },
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        await db.scan.update({ where: { id: scanId }, data: { status: 'failed', errorMessage: message, completedAt: new Date() } });
      }
    });

    return successResponse({ ok: true, scanId, message: 'History scan started' }, 202);
  } catch (e) {
    return errorResponse(String(e), 'HISTORY_SCAN_ERROR', 500);
  }
}
