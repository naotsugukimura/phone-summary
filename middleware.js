import { NextResponse } from "next/server";

export function middleware(request) {
  const response = NextResponse.next();

  // CSP設定（evalを許可）
  response.headers.set(
    "Content-Security-Policy",
    "default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src * 'unsafe-inline'; img-src * data: blob: 'unsafe-inline'; frame-src *; style-src * 'unsafe-inline';"
  );

  return response;
}

export const config = {
  matcher: "/:path*",
};
