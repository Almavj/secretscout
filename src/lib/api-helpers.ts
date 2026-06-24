import { NextRequest, NextResponse } from 'next/server';
import { db } from './db';

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  code?: string;
}

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(error: string, code: string, status = 400) {
  return NextResponse.json({ error, code }, { status });
}

export async function getOrgFromRequest(_request: NextRequest) {
  const org = await db.organization.findFirst();
  if (!org) {
    return null;
  }
  return org;
}

export function validateRequired(obj: Record<string, unknown>, fields: string[]): string | null {
  for (const field of fields) {
    if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}
