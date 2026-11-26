import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { serverClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const KIT = "nazar-vision-demos";

/** The source-code download: free, for signed-in users only. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const locale = ["en", "uz", "ru"].includes(url.searchParams.get("locale") ?? "") ? url.searchParams.get("locale")! : "en";
  const supabase = await serverClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) return NextResponse.redirect(new URL(`/${locale}/code?signin=required`, url.origin));

  // Who downloaded what, for the owner's lead list. A failed log must not block the download.
  await supabase.from("code_downloads").insert({ user_id: user.id, kit: KIT }).then(
    () => undefined,
    () => undefined,
  );

  const zip = await readFile(path.join(process.cwd(), ".code-kit", `${KIT}.zip`));
  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${KIT}.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
}
