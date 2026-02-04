export { default } from 'next-auth/middleware';

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
