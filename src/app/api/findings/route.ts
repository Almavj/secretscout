import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const org = await db.organization.findFirst();
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const findings = await db.finding.findMany({
      where: { organizationId: org.id },
      include: { rule: { select: { name: true, category: true } }, scan: { select: { scanType: true, scopeMode: true } } },
      orderBy: { discoveredAt: 'desc' },
    });

    return NextResponse.json(findings);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}