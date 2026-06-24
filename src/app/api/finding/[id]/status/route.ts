import { db } from '@/lib/db';
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-helpers';

const VALID_STATUSES = ['open', 'acknowledged', 'remediated', 'false_positive', 'accepted_risk'] as const;

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, remediationNote } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return errorResponse(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`, 'INVALID_STATUS');
    }

    const finding = await db.finding.findUnique({ where: { id } });
    if (!finding) return errorResponse('Finding not found', 'NOT_FOUND', 404);

    const updateData: Record<string, unknown> = { status };
    if (status === 'remediated') {
      updateData.remediatedAt = new Date();
      const hours = (Date.now() - new Date(finding.discoveredAt).getTime()) / 3600000;
      updateData.mttrHours = Math.round(hours * 10) / 10;
    }
    if (remediationNote) updateData.remediationNote = remediationNote;

    const updated = await db.finding.update({ where: { id }, data: updateData });

    await db.findingEvent.create({
      data: {
        findingId: id,
        eventType: `status_${status}`,
        actor: 'user',
        note: remediationNote || `Status changed to ${status}`,
      },
    });

    return successResponse(updated);
  } catch (e) {
    return errorResponse(String(e), 'STATUS_UPDATE_ERROR', 500);
  }
}
