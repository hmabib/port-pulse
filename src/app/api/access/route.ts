import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_COOKIE_NAME,
  ACCESS_SESSION_MAX_AGE_SECONDS,
  createAccessToken,
  isValidAccessToken,
  sanitizeReturnPath,
} from "@/lib/access-control";

export async function POST(request: NextRequest) {
  const accessKey = process.env.PORT_PULSE_ACCESS_KEY;
  if (!accessKey) {
    return NextResponse.json(
      { error: "PORT_PULSE_ACCESS_KEY manquant." },
      { status: 503 },
    );
  }

  const formData = await request.formData();
  const submittedKey = String(formData.get("accessKey") ?? "");
  const returnPath = sanitizeReturnPath(
    String(formData.get("next") ?? "/"),
  );

  const submittedToken = await createAccessToken(submittedKey);

  if (!(await isValidAccessToken(submittedToken, accessKey))) {
    const accessUrl = new URL("/access", request.url);
    accessUrl.searchParams.set("error", "1");
    accessUrl.searchParams.set("next", returnPath);
    return NextResponse.redirect(accessUrl, 303);
  }

  const expectedToken = await createAccessToken(accessKey);
  const response = NextResponse.redirect(
    new URL(returnPath, request.url),
    303,
  );
  response.cookies.set(ACCESS_COOKIE_NAME, expectedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: ACCESS_SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
  return response;
}
