import { db } from '@/lib/db';
import { NextRequest } from 'next/server';
import { successResponse, errorResponse, getOrgFromRequest } from '@/lib/api-helpers';

export async function GET(_request: NextRequest) {
  try {
    const org = await getOrgFromRequest(_request);
    if (!org) return errorResponse('Organization not found', 'ORG_NOT_FOUND', 404);

    const providerIds = (await db.sourceProvider.findMany({
      where: { organizationId: org.id },
      select: { id: true },
    })).map(p => p.id);

    const dorks = await db.dorkTemplate.findMany({
      where: { providerId: { in: providerIds } },
      include: { provider: { select: { name: true, type: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(dorks);
  } catch (e) {
    return errorResponse(String(e), 'DORKS_ERROR', 500);
  }
}
