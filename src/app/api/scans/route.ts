import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const org = await db.organization.findFirst({ where: { slug: 'acme-corp' } });
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const scans = await db.scan.findMany({
      where: { organizationId: org.id },
      include: {
        provider: { select: { name: true, type: true } },
        dorkTemplate: { select: { name: true, queryTemplate: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(scans);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}