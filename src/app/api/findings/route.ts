import { db } from '@/lib/db';
import { NextRequest } from 'next/server';
import { successResponse, errorResponse, getOrgFromRequest } from '@/lib/api-helpers';

export async function GET(_request: NextRequest) {
  try {
    const org = await getOrgFromRequest(_request);
    if (!org) return errorResponse('Organization not found', 'ORG_NOT_FOUND', 404);

    const findings = await db.finding.findMany({
      where: { organizationId: org.id },
      include: {
        rule: { select: { name: true, category: true } },
        scan: { select: { scanType: true, scopeMode: true } },
      },
      orderBy: { discoveredAt: 'desc' },
    });

    return successResponse(findings);
  } catch (e) {
    return errorResponse(String(e), 'FINDINGS_ERROR', 500);
  }
}
