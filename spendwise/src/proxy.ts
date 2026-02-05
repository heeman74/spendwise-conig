import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function proxy(request: NextRequest) {
  // Allow demo mode (cookie set by login page)
  const isDemo = request.cookies.get('spendwise-demo')?.value === 'true';
  if (isDemo) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request });

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/accounts/:path*',
    '/transactions/:path*',
    '/analytics/:path*',
    '/import/:path*',
    '/planning/:path*',
    '/settings/:path*',
    '/net-worth/:path*',
    '/investments/:path*',
    '/recurring/:path*',
  ],
};
