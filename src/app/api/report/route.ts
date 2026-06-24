import { NextRequest } from 'next/server';
import { getOrgFromRequest } from '@/lib/api-helpers';
import { generateReport } from '@/lib/report-generator';

export async function GET(request: NextRequest) {
  try {
    const org = await getOrgFromRequest(request);
    if (!org) return new Response('Organization not found', { status: 404 });

    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'html') as 'html' | 'csv' | 'json';
    const scanId = searchParams.get('scanId') || undefined;
    const severity = searchParams.get('severity')?.split(',').filter(Boolean);
    const status = searchParams.get('status')?.split(',').filter(Boolean);

    const report = await generateReport({
      organizationId: org.id,
      format,
      scanId,
      severityFilter: severity,
      statusFilter: status,
    });

    const contentTypes: Record<string, string> = {
      html: 'text/html',
      csv: 'text/csv',
      json: 'application/json',
    };

    const filenames: Record<string, string> = {
      html: 'secretscout-report.html',
      csv: 'secretscout-report.csv',
      json: 'secretscout-report.json',
    };

    return new Response(report, {
      headers: {
        'Content-Type': contentTypes[format] || 'text/plain',
        'Content-Disposition': `attachment; filename="${filenames[format] || 'report.txt'}"`,
      },
    });
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
}
