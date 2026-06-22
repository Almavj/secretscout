import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const org = await db.organization.findFirst({ where: { slug: 'acme-corp' } });
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const providers = await db.sourceProvider.findMany({
      where: { organizationId: org.id },
      include: {
        tokenPools: { orderBy: { createdAt: 'asc' } },
        dorkTemplates: { select: { id: true, name: true, enabled: true } },
        _count: { select: { scans: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(providers);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}