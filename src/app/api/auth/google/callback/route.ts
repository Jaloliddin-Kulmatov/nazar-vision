import { NextResponse, type NextRequest } from "next/server";
import { accountsEnabled, findSignupByEmail, getSetting } from "@/lib/accounts/db";
import { googleEnabled, OAUTH_COOKIE, profileFromIdToken, redirectUri, unpackOAuthCookie } from "@/lib/accounts/google";
import { finishSignup, signIn } from "@/lib/accounts/signin";

export const dynamic = "force-dynamic";

/** Google sends the visitor back here with a one-time code; we swap it for their verified email. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const saved = unpackOAuthCookie(request.cookies.get(OAUTH_COOKIE)?.value);
  const next = saved?.next ?? "/en/code";
  const back = (result: string) => {
    const res = NextResponse.redirect(new URL(`${next}?signin=${result}`, url.origin));
    res.cookies.set(OAUTH_COOKIE, "", { path: "/api/auth/google", maxAge: 0 });
    return res;
  };

  const code = url.searchParams.get("code");
  if (!googleEnabled() || !accountsEnabled() || !saved || !code || url.searchParams.get("state") !== saved.state) return back("failed");

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri(url.origin),
        grant_type: "authorization_code",
        code_verifier: saved.verifier,
      }),
    });
    const tokens = (await tokenRes.json()) as { id_token?: string };
    const profile = tokens.id_token ? profileFromIdToken(tokens.id_token, process.env.GOOGLE_CLIENT_ID!) : null;
    if (!profile) return back("failed");

    const existing = await findSignupByEmail(profile.email, true);
    const res = back("google");
    if (existing) {
      signIn(request, res, existing.id, existing.email);
      return res;
    }
    if ((await getSetting("signups_open", "yes")) !== "yes") return back("closed");
    return finishSignup(request, { name: profile.name, email: profile.email, company: "", provider: "google", verified: true }, res);
  } catch (e) {
    console.error("[auth/google/callback]", e);
    return back("failed");
  }
}
