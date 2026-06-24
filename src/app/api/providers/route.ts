import { db } from '@/lib/db';
import { NextRequest } from 'next/server';
import { successResponse, errorResponse, getOrgFromRequest } from '@/lib/api-helpers';

export async function GET(_request: NextRequest) {
  try {
    const org = await getOrgFromRequest(_request);
    if (!org) return errorResponse('Organization not found', 'ORG_NOT_FOUND', 404);

    const providers = await db.sourceProvider.findMany({
      where: { organizationId: org.id },
      include: {
        tokenPools: { orderBy: { createdAt: 'asc' } },
        dorkTemplates: { select: { id: true, name: true, enabled: true } },
        _count: { select: { scans: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return successResponse(providers);
  } catch (e) {
    return errorResponse(String(e), 'PROVIDERS_ERROR', 500);
  }
}
