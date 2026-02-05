import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
});

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
