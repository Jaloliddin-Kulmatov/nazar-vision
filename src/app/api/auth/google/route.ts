import { NextResponse, type NextRequest } from "next/server";
import { googleAuthUrl, googleEnabled, newOAuthRequest, OAUTH_COOKIE, packOAuthCookie, redirectUri } from "@/lib/accounts/google";
import { safeNext } from "@/lib/accounts/cookies";

export const dynamic = "force-dynamic";

/** Sends the visitor to Google's account picker. */
export function GET(request: NextRequest) {
  const url = new URL(request.url);
  const locale = ["en", "ru", "uz"].includes(url.searchParams.get("locale") ?? "") ? url.searchParams.get("locale")! : "en";
  const next = safeNext(url.searchParams.get("next"), `/${locale}/code`);
  if (!googleEnabled()) return NextResponse.redirect(new URL(`${next}?signin=failed`, url.origin));
  const { state, verifier, challenge } = newOAuthRequest();
  const res = NextResponse.redirect(googleAuthUrl({ clientId: process.env.GOOGLE_CLIENT_ID!, redirectUri: redirectUri(url.origin), state, challenge, locale }));
  res.cookies.set(OAUTH_COOKIE, packOAuthCookie({ state, verifier, next }), {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: 600,
  });
  return res;
}
