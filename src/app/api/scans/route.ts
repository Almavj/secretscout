import { db } from '@/lib/db';
import { NextRequest } from 'next/server';
import { successResponse, errorResponse, getOrgFromRequest } from '@/lib/api-helpers';

export async function GET(_request: NextRequest) {
  try {
    const org = await getOrgFromRequest(_request);
    if (!org) return errorResponse('Organization not found', 'ORG_NOT_FOUND', 404);

    const scans = await db.scan.findMany({
      where: { organizationId: org.id },
      include: {
        provider: { select: { name: true, type: true } },
        dorkTemplate: { select: { name: true, queryTemplate: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(scans);
  } catch (e) {
    return errorResponse(String(e), 'SCANS_ERROR', 500);
  }
}
