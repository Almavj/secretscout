import { db } from '@/lib/db';
import { NextRequest } from 'next/server';
import { successResponse, errorResponse, getOrgFromRequest } from '@/lib/api-helpers';

const VALID_TARGET_TYPES = ['github_org', 'github_user', 'repo_allowlist', 'gitlab_group', 'bitbucket_workspace'] as const;

export async function GET(_request: NextRequest) {
  try {
    const org = await getOrgFromRequest(_request);
    if (!org) return errorResponse('Organization not found', 'ORG_NOT_FOUND', 404);

    const scopeEntries = await db.scopeEntry.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(scopeEntries);
  } catch (e) {
    return errorResponse(String(e), 'SCOPE_ERROR', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const org = await getOrgFromRequest(request);
    if (!org) return errorResponse('Organization not found', 'ORG_NOT_FOUND', 404);

    const body = await request.json();
    const { targetType, targetValue, accessLevel = 'write' } = body;

    if (!targetType || !targetValue) {
      return errorResponse('Missing required fields: targetType, targetValue', 'MISSING_FIELDS');
    }

    if (!VALID_TARGET_TYPES.includes(targetType)) {
      return errorResponse(`Invalid targetType. Must be one of: ${VALID_TARGET_TYPES.join(', ')}`, 'INVALID_TARGET_TYPE');
    }

    const cleanValue = targetValue.trim().replace(/^@/, '');
    if (!cleanValue) {
      return errorResponse('targetValue cannot be empty', 'INVALID_TARGET_VALUE');
    }

    const existing = await db.scopeEntry.findFirst({
      where: { organizationId: org.id, targetType, targetValue: cleanValue },
    });
    if (existing) {
      return errorResponse('This scope entry already exists', 'DUPLICATE_SCOPE');
    }

    const entry = await db.scopeEntry.create({
      data: {
        organizationId: org.id,
        targetType,
        targetValue: cleanValue,
        accessLevel,
        enabled: true,
      },
    });

    return successResponse(entry, 201);
  } catch (e) {
    return errorResponse(String(e), 'SCOPE_CREATE_ERROR', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const org = await getOrgFromRequest(request);
    if (!org) return errorResponse('Organization not found', 'ORG_NOT_FOUND', 404);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return errorResponse('Missing scope entry id', 'MISSING_ID');

    const entry = await db.scopeEntry.findUnique({ where: { id } });
    if (!entry || entry.organizationId !== org.id) {
      return errorResponse('Scope entry not found', 'NOT_FOUND', 404);
    }

    await db.scopeEntry.delete({ where: { id } });
    return successResponse({ ok: true, message: 'Scope entry deleted' });
  } catch (e) {
    return errorResponse(String(e), 'SCOPE_DELETE_ERROR', 500);
  }
}
