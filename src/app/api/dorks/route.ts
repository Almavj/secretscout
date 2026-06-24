import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const org = await db.organization.findFirst();
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const dorks = await db.dorkTemplate.findMany({
      where: { providerId: { in: (await db.sourceProvider.findMany({ where: { organizationId: org.id }, select: { id: true } })).map(p => p.id) } },
      include: { provider: { select: { name: true, type: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(dorks);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}