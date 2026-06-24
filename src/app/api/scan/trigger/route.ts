import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const org = await db.organization.findFirst();
    if (!org) return NextResponse.json({ error: 'No organization configured.' }, { status: 404 });

    const body = await request.json();
    const { scanType = 'manual', scopeMode = 'restricted', customQuery, targetRepo, dorkTemplateId } = body;

    const activeScans = await db.scan.count({ where: { organizationId: org.id, status: 'running' } });
    if (activeScans >= 2) {
      return NextResponse.json({ error: 'Max 2 concurrent scans. Wait for running scans to finish.' }, { status: 429 });
    }

    // Pre-flight checks BEFORE async scan
    const scopeCount = await db.scopeEntry.count({ where: { organizationId: org.id, enabled: true } });
    if (scopeCount === 0) {
      return NextResponse.json({ error: 'No scope entries configured. Add organizations or repos in Settings > Scope Allowlist.' }, { status: 400 });
    }

    const tokenCount = await db.tokenPool.count({
      where: { provider: { organizationId: org.id, type: 'github', enabled: true }, enabled: true },
    });
    if (tokenCount === 0) {
      return NextResponse.json({ error: 'No GitHub tokens configured. Add a PAT in Settings > Token Pool.' }, { status: 400 });
    }

    if (scopeMode === 'public_discovery' && scopeCount === 0) {
      return NextResponse.json({ error: 'Public discovery requires at least one scope entry.' }, { status: 400 });
    }

    // Create scan record
    const scanId = `scan-${Date.now()}`;
    await db.scan.create({
      data: { id: scanId, organizationId: org.id, providerId: null, dorkTemplateId: dorkTemplateId || null, status: 'running', scanType, scopeMode, startedAt: new Date() },
    });

    // Fire-and-forget: run scan in background without awaiting
    // Use process.nextTick to ensure response is sent first
    process.nextTick(async () => {
      try {
        const { scanEngine } = await import('@/lib/scan-engine');
        scanEngine.onProgress((event: any) => {
          fetch('http://localhost:3004/hook', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(event),
          }).catch(() => {});
        });
        await scanEngine.executeScan({ organizationId: org.id, scanType, scopeMode, customQuery, targetRepo, dorkTemplateId: dorkTemplateId || undefined });
      } catch (err: any) {
        console.error('[ScanTrigger] Background scan error:', err.message);
        try {
          await db.scan.update({ where: { id: scanId }, data: { status: 'failed', errorMessage: err.message, completedAt: new Date() } });
        } catch { /* DB might be gone */ }
      }
    });

    return NextResponse.json({ ok: true, message: 'Scan started', scanId, config: { scanType, scopeMode, target: targetRepo || `${scopeCount} scope targets`, hasCustomQuery: !!customQuery } }, { status: 202 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}