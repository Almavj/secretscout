import { db } from '@/lib/db';
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-helpers';
import { verifySecret } from '@/lib/verifier';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { findingId } = body;

    if (!findingId) return errorResponse('Missing findingId', 'MISSING_FIELDS');

    const finding = await db.finding.findUnique({
      where: { id: findingId },
      include: { rule: true },
    });

    if (!finding) return errorResponse('Finding not found', 'NOT_FOUND', 404);

    const ruleId = finding.ruleId || finding.rule?.id || '';
    const result = await verifySecret(ruleId, finding.matchedValue);

    await db.finding.update({
      where: { id: findingId },
      data: { isVerified: result.verified, verificationNote: result.note, verifiedAt: new Date() },
    });

    await db.findingEvent.create({
      data: {
        findingId,
        eventType: 'verified',
        actor: 'verifier',
        note: `[${result.provider}] ${result.checkType}: ${result.note} (${result.responseTimeMs}ms)`,
      },
    });

    return successResponse(result);
  } catch (e) {
    return errorResponse(String(e), 'VERIFY_ERROR', 500);
  }
}
