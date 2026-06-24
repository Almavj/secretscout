import { db } from '@/lib/db';
import { NextRequest } from 'next/server';
import { successResponse, errorResponse, getOrgFromRequest } from '@/lib/api-helpers';

export async function POST(request: NextRequest) {
  try {
    const org = await getOrgFromRequest(request);
    if (!org) return errorResponse('Organization not found', 'ORG_NOT_FOUND', 404);

    const body = await request.json();
    const { scanType = 'manual', scopeMode = 'restricted', customQuery, targetRepo, dorkTemplateId } = body;

    const activeScans = await db.scan.count({ where: { organizationId: org.id, status: 'running' } });
    if (activeScans >= 2) {
      return errorResponse('Max 2 concurrent scans. Wait for running scans to finish.', 'SCAN_LIMIT', 429);
    }

    const scopeCount = await db.scopeEntry.count({ where: { organizationId: org.id, enabled: true } });
    if (scopeCount === 0) {
      return errorResponse('No scope entries configured. Add organizations or repos in Settings > Scope Allowlist.', 'NO_SCOPE', 400);
    }

    const tokenCount = await db.tokenPool.count({
      where: { provider: { organizationId: org.id, type: 'github', enabled: true }, enabled: true },
    });
    if (tokenCount === 0) {
      return errorResponse('No GitHub tokens configured. Add a PAT in Settings > Token Pool.', 'NO_TOKENS', 400);
    }

    const scanId = `scan-${Date.now()}`;
    await db.scan.create({
      data: {
        id: scanId,
        organizationId: org.id,
        providerId: null,
        dorkTemplateId: dorkTemplateId || null,
        status: 'running',
        scanType,
        scopeMode,
        startedAt: new Date(),
      },
    });

    process.nextTick(async () => {
      try {
        const { scanEngine } = await import('@/lib/scan-engine');
        scanEngine.onProgress((event: Record<string, unknown>) => {
          fetch('http://localhost:3004/hook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event),
          }).catch(() => {/* webhook fire-and-forget */});
        });
        await scanEngine.executeScan({
          organizationId: org.id,
          scanType,
          scopeMode,
          customQuery,
          targetRepo,
          dorkTemplateId: dorkTemplateId || undefined,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[ScanTrigger] Background scan error:', message);
        try {
          await db.scan.update({ where: { id: scanId }, data: { status: 'failed', errorMessage: message, completedAt: new Date() } });
        } catch {/* DB might be gone */}
      }
    });

    return successResponse({
      ok: true,
      message: 'Scan started',
      scanId,
      config: { scanType, scopeMode, target: targetRepo || `${scopeCount} scope targets`, hasCustomQuery: !!customQuery },
    }, 202);
  } catch (e) {
    return errorResponse(String(e), 'SCAN_TRIGGER_ERROR', 500);
  }
}
