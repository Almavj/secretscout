import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const org = await db.organization.findFirst();
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const integrations = await db.integration.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(integrations);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}