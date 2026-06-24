import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-helpers';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const finding = await db.finding.findUnique({
      where: { id },
      include: {
        rule: true,
        scan: {
          include: {
            provider: { select: { name: true, type: true } },
            dorkTemplate: { select: { name: true } },
          },
        },
        events: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!finding) return errorResponse('Finding not found', 'NOT_FOUND', 404);
    return successResponse(finding);
  } catch (e) {
    return errorResponse(String(e), 'FINDING_ERROR', 500);
  }
}
