import { db } from '@/lib/db';
import { NextRequest } from 'next/server';
import { successResponse, getOrgFromRequest } from '@/lib/api-helpers';

export async function GET(_request: NextRequest) {
  try {
    const org = await getOrgFromRequest(_request);
    if (!org) {
      return successResponse({ ready: false, step: 'org', message: 'No organization found. Run seed script.' });
    }

    const scopeCount = await db.scopeEntry.count({ where: { organizationId: org.id, enabled: true } });
    const tokenCount = await db.tokenPool.count({
      where: { provider: { organizationId: org.id, type: 'github', enabled: true }, enabled: true },
    });

    if (scopeCount === 0) {
      return successResponse({ ready: false, step: 'scope', message: 'Add scope entries (organizations/repos) in Settings', orgName: org.name });
    }

    if (tokenCount === 0) {
      return successResponse({ ready: false, step: 'tokens', message: 'Add at least one GitHub token in Settings', orgName: org.name, scopeCount });
    }

    return successResponse({
      ready: true,
      step: 'ready',
      message: 'Ready to scan',
      orgName: org.name,
      scopeCount,
      tokenCount,
    });
  } catch (e) {
    return successResponse({ ready: false, step: 'error', message: String(e) });
  }
}
