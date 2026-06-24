import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const org = await db.organization.findFirst();
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const providers = await db.sourceProvider.findMany({
      where: { organizationId: org.id },
      include: { tokenPools: { orderBy: { createdAt: 'asc' } } },
    });

    const tokens = providers.flatMap(p => p.tokenPools.map(t => ({ ...t, providerName: p.name, providerType: p.type })));
    return NextResponse.json(tokens);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}