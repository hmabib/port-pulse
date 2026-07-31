import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_COOKIE_NAME,
  isValidAccessToken,
} from "@/lib/access-control";

export async function proxy(request: NextRequest) {
  const accessKey = process.env.PORT_PULSE_ACCESS_KEY;
  const pathname = request.nextUrl.pathname;

  if (!accessKey) {
    return pathname === "/access"
      ? NextResponse.next()
      : NextResponse.redirect(new URL("/access", request.url));
  }

  const isAuthenticated = await isValidAccessToken(
    request.cookies.get(ACCESS_COOKIE_NAME)?.value,
    accessKey,
  );

  if (pathname === "/access") {
    return isAuthenticated
      ? NextResponse.redirect(new URL("/", request.url))
      : NextResponse.next();
  }

  if (isAuthenticated) return NextResponse.next();

  const accessUrl = new URL("/access", request.url);
  accessUrl.searchParams.set(
    "next",
    `${pathname}${request.nextUrl.search}`,
  );
  return NextResponse.redirect(accessUrl);
}

export const config = {
  matcher: [
    "/((?!api/access|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
