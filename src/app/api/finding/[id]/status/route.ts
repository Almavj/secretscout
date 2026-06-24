import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, remediationNote } = body;

    if (!status || !['open', 'acknowledged', 'remediated', 'false_positive', 'accepted_risk'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const finding = await db.finding.findUnique({ where: { id } });
    if (!finding) return NextResponse.json({ error: 'Finding not found' }, { status: 404 });

    const updateData: any = { status };
    if (status === 'remediated') {
      updateData.remediatedAt = new Date();
      const hours = (Date.now() - new Date(finding.discoveredAt).getTime()) / 3600000;
      updateData.mttrHours = Math.round(hours * 10) / 10;
    }
    if (remediationNote) updateData.remediationNote = remediationNote;

    const updated = await db.finding.update({ where: { id }, data: updateData });

    await db.findingEvent.create({
      data: { findingId: id, eventType: `status_${status}`, actor: 'user', note: remediationNote || `Status changed to ${status}` },
    });

    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}