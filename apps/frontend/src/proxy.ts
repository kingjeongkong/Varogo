import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/signup', '/privacy'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasAccess = request.cookies.has('access_token');
  const hasRefresh = request.cookies.has('refresh_token');

  if (pathname === '/') {
    if (hasAccess) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  if (!hasAccess && !hasRefresh) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
