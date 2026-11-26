import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseConfigured, supabaseKey, supabaseUrl } from "./config";

/** Server client bound to this request's cookies (route handlers can refresh the session). */
export async function serverClient() {
  if (!supabaseConfigured) return null;
  const store = await cookies();
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a server component: cookies are read-only there, and that's fine.
        }
      },
    },
  });
}

/** Only allow redirects back into this site. */
export function safeNext(next: string | null, fallback: string) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
