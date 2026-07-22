import { type NextRequest, NextResponse, userAgent } from 'next/server';

export function middleware(request: NextRequest) {
  const { device, isBot } = userAgent(request);
  const mobileClientHint = request.headers.get('sec-ch-ua-mobile') === '?1';
  const mobileDevice = device.type === 'mobile' || device.type === 'tablet';

  if (isBot || (!mobileClientHint && !mobileDevice)) {
    return NextResponse.next();
  }

  const dashboardUrl = request.nextUrl.clone();
  dashboardUrl.pathname = '/dashboard';
  dashboardUrl.search = '';
  dashboardUrl.searchParams.set('market', 'japan');

  return NextResponse.redirect(dashboardUrl);
}

export const config = {
  matcher: ['/'],
};
