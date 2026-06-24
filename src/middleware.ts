import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: '/api/:path*',
};

function isAuthEnabled(): boolean {
  const key = process.env.SECRETSCOUT_API_KEY;
  return !!key && key.length > 0 && key !== 'your-secret-api-key-here';
}

export function middleware(request: NextRequest) {
  if (!isAuthEnabled()) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Unauthorized. Provide a valid API key via Authorization: Bearer <key>', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7);
  if (token !== process.env.SECRETSCOUT_API_KEY) {
    return NextResponse.json(
      { error: 'Invalid API key', code: 'INVALID_API_KEY' },
      { status: 401 }
    );
  }

  return NextResponse.next();
}
