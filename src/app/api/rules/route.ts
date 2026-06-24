import { db } from '@/lib/db';
import { NextRequest } from 'next/server';
import { successResponse, errorResponse, getOrgFromRequest } from '@/lib/api-helpers';

export async function GET(_request: NextRequest) {
  try {
    const org = await getOrgFromRequest(_request);
    if (!org) return errorResponse('Organization not found', 'ORG_NOT_FOUND', 404);

    const rules = await db.detectionRule.findMany({
      where: { organizationId: org.id },
      orderBy: { severity: 'asc' },
    });

    return successResponse(rules);
  } catch (e) {
    return errorResponse(String(e), 'RULES_ERROR', 500);
  }
}
