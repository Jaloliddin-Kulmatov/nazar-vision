import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { logDownload } from "@/lib/accounts/db";
import { readSession } from "@/lib/accounts/cookies";

export const dynamic = "force-dynamic";

const KIT = "nazar-vision-demos";

/** The source-code download: free, for signed-up visitors only. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const locale = ["en", "uz", "ru"].includes(url.searchParams.get("locale") ?? "") ? url.searchParams.get("locale")! : "en";
  const session = readSession(request);
  if (!session) return NextResponse.redirect(new URL(`/${locale}/code?signin=required`, url.origin));

  // Who downloaded what, for the owner's lead list. A failed log must not block the download.
  await logDownload(session.id, KIT).catch((e) => console.error("[code] could not log download", e));

  const zip = await readFile(path.join(process.cwd(), ".code-kit", `${KIT}.zip`));
  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${KIT}.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
}
