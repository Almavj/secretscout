import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const org = await db.organization.findFirst();
    if (!org) {
      return NextResponse.json({ ready: false, step: 'org', message: 'No organization found. Run seed script.' });
    }

    const scopeCount = await db.scopeEntry.count({ where: { organizationId: org.id, enabled: true } });
    const tokenCount = await db.tokenPool.count({
      where: { provider: { organizationId: org.id, type: 'github', enabled: true }, enabled: true },
    });

    if (scopeCount === 0) {
      return NextResponse.json({ ready: false, step: 'scope', message: 'Add scope entries (organizations/repos) in Settings', orgName: org.name });
    }

    if (tokenCount === 0) {
      return NextResponse.json({ ready: false, step: 'tokens', message: 'Add at least one GitHub token in Settings', orgName: org.name, scopeCount });
    }

    return NextResponse.json({
      ready: true,
      step: 'ready',
      message: 'Ready to scan',
      orgName: org.name,
      scopeCount,
      tokenCount,
    });
  } catch (e) {
    return NextResponse.json({ ready: false, step: 'error', message: String(e) });
  }
}