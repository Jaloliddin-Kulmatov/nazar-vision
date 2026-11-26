"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseConfigured, supabaseKey, supabaseUrl } from "./config";

/** Browser client, or null while the project isn't configured yet. */
export function browserClient() {
  return supabaseConfigured ? createBrowserClient(supabaseUrl, supabaseKey) : null;
}
