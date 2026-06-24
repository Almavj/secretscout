import { db } from '@/lib/db';
import { NextRequest } from 'next/server';
import { successResponse, errorResponse, getOrgFromRequest } from '@/lib/api-helpers';

export async function GET(_request: NextRequest) {
  try {
    const org = await getOrgFromRequest(_request);
    if (!org) return errorResponse('Organization not found', 'ORG_NOT_FOUND', 404);

    const providers = await db.sourceProvider.findMany({
      where: { organizationId: org.id },
      include: { tokenPools: { orderBy: { createdAt: 'asc' } } },
    });

    const tokens = providers.flatMap(p => p.tokenPools.map(t => ({ ...t, providerName: p.name, providerType: p.type })));
    return successResponse(tokens);
  } catch (e) {
    return errorResponse(String(e), 'TOKENS_ERROR', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const org = await getOrgFromRequest(request);
    if (!org) return errorResponse('Organization not found. Run seed script first.', 'ORG_NOT_FOUND', 404);

    const body = await request.json();
    const { label, token, tokenType = 'pat' } = body;

    if (!label || !token) {
      return errorResponse('Missing required fields: label, token', 'MISSING_FIELDS');
    }

    if (typeof token !== 'string' || token.length < 10) {
      return errorResponse('Invalid token format', 'INVALID_TOKEN');
    }

    const providers = await db.sourceProvider.findMany({
      where: { organizationId: org.id, type: 'github' },
    });
    let provider = providers[0];
    if (!provider) {
      provider = await db.sourceProvider.create({
        data: {
          organizationId: org.id,
          type: 'github',
          name: 'GitHub',
          enabled: true,
          config: JSON.stringify({ apiEndpoint: 'https://api.github.com', scanForks: false, maxConcurrentRequests: 5 }),
        },
      });
    }

    const existingToken = await db.tokenPool.findFirst({
      where: { providerId: provider.id, tokenValue: token },
    });
    if (existingToken) {
      return errorResponse('This token already exists', 'DUPLICATE_TOKEN');
    }

    const newToken = await db.tokenPool.create({
      data: {
        providerId: provider.id,
        label,
        tokenType,
        tokenValue: token,
        rateLimitRemaining: 30,
        enabled: true,
      },
    });

    return successResponse({ id: newToken.id, label: newToken.label, tokenType: newToken.tokenType }, 201);
  } catch (e) {
    return errorResponse(String(e), 'TOKEN_CREATE_ERROR', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const org = await getOrgFromRequest(request);
    if (!org) return errorResponse('Organization not found', 'ORG_NOT_FOUND', 404);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return errorResponse('Missing token id', 'MISSING_ID');

    const token = await db.tokenPool.findUnique({
      where: { id },
      include: { provider: true },
    });

    if (!token || token.provider.organizationId !== org.id) {
      return errorResponse('Token not found', 'NOT_FOUND', 404);
    }

    await db.tokenPool.delete({ where: { id } });
    return successResponse({ ok: true, message: 'Token deleted' });
  } catch (e) {
    return errorResponse(String(e), 'TOKEN_DELETE_ERROR', 500);
  }
}
