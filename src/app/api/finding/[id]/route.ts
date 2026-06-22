import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const finding = await db.finding.findUnique({
      where: { id },
      include: {
        rule: true,
        scan: { include: { provider: { select: { name: true, type: true } }, dorkTemplate: { select: { name: true } } } },
        events: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!finding) return NextResponse.json({ error: 'Finding not found' }, { status: 404 });
    return NextResponse.json(finding);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}