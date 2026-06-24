import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const org = await db.organization.findFirst();
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const rules = await db.detectionRule.findMany({
      where: { organizationId: org.id },
      orderBy: { severity: 'asc' },
    });

    return NextResponse.json(rules);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}