import { db } from '@/lib/db';
import { NextRequest } from 'next/server';
import { successResponse, errorResponse, getOrgFromRequest } from '@/lib/api-helpers';

const VALID_INTEGRATION_TYPES = ['slack', 'pagerduty', 'webhook', 'jira'] as const;

export async function GET(_request: NextRequest) {
  try {
    const org = await getOrgFromRequest(_request);
    if (!org) return errorResponse('Organization not found', 'ORG_NOT_FOUND', 404);

    const integrations = await db.integration.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(integrations);
  } catch (e) {
    return errorResponse(String(e), 'INTEGRATIONS_ERROR', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const org = await getOrgFromRequest(request);
    if (!org) return errorResponse('Organization not found', 'ORG_NOT_FOUND', 404);

    const body = await request.json();
    const { type, name, config } = body;

    if (!type || !name || !config) {
      return errorResponse('Missing required fields: type, name, config', 'MISSING_FIELDS');
    }

    if (!VALID_INTEGRATION_TYPES.includes(type)) {
      return errorResponse(`Invalid type. Must be one of: ${VALID_INTEGRATION_TYPES.join(', ')}`, 'INVALID_TYPE');
    }

    const integration = await db.integration.create({
      data: {
        organizationId: org.id,
        type,
        name,
        config: typeof config === 'string' ? config : JSON.stringify(config),
        enabled: true,
      },
    });

    return successResponse(integration, 201);
  } catch (e) {
    return errorResponse(String(e), 'INTEGRATION_CREATE_ERROR', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const org = await getOrgFromRequest(request);
    if (!org) return errorResponse('Organization not found', 'ORG_NOT_FOUND', 404);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return errorResponse('Missing integration id', 'MISSING_ID');

    const integration = await db.integration.findUnique({ where: { id } });
    if (!integration || integration.organizationId !== org.id) {
      return errorResponse('Integration not found', 'NOT_FOUND', 404);
    }

    await db.integration.delete({ where: { id } });
    return successResponse({ ok: true, message: 'Integration deleted' });
  } catch (e) {
    return errorResponse(String(e), 'INTEGRATION_DELETE_ERROR', 500);
  }
}
