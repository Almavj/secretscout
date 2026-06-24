import { NextRequest } from 'next/server';

export interface AuthContext {
  apiKey: string;
  orgId: string;
}

function getApiKey(): string {
  return process.env.SECRETSCOUT_API_KEY || '';
}

export function validateApiKey(request: NextRequest): AuthContext | null {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { apiKey: 'dev-mode', orgId: 'org-default' };
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);
  if (token !== apiKey) {
    return null;
  }

  return { apiKey: token, orgId: 'org-default' };
}

export function unauthorizedResponse(message = 'Unauthorized. Provide a valid API key via Authorization: Bearer <key>') {
  return Response.json(
    { error: message, code: 'UNAUTHORIZED' },
    { status: 401 }
  );
}
