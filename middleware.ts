import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_VALUE } from "@/lib/auth";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth",
  "/api/automate",
  "/api/automate-secret",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

const PROTECTED_PREFIXES = [
  "/cockpit",
  "/api/cockpit",
  "/api/admin",
  "/api/post-carousel",
  "/api/post-from-url",
  "/api/post-from-url-proxy",
  "/api/post-log",
  "/api/post-video",
  "/api/retry-post",
  "/api/post-from-url-proxy",
];

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // Allow static assets and explicitly public routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  // Only guard cockpit/admin surfaces; leave marketing pages public
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) {
    return NextResponse.next();
  }

  const session = req.cookies.get(SESSION_COOKIE)?.value;
  if (session === SESSION_VALUE) return NextResponse.next();

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("redirect", pathname + (searchParams.toString() ? `?${searchParams}` : ""));
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

