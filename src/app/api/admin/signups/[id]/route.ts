import { NextResponse, type NextRequest } from "next/server";
import { deleteSignup, isAdmin } from "@/lib/accounts/admin";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Removes a person and their download history (e.g. on request, or spam). */
export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/admin/signups/[id]">) {
  if (!isAdmin(request)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  if (!UUID.test(id)) return NextResponse.json({ ok: false, error: "bad_id" }, { status: 400 });
  await deleteSignup(id);
  return NextResponse.json({ ok: true });
}
