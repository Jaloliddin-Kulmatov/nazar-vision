import { NextResponse, type NextRequest } from "next/server";
import { deleteInquiry, isAdmin, setInquiryHandled } from "@/lib/accounts/admin";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Mark a contact-form message as handled (or not). */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/admin/inquiries/[id]">) {
  if (!isAdmin(request)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  if (!UUID.test(id)) return NextResponse.json({ ok: false, error: "bad_id" }, { status: 400 });
  const body = (await request.json().catch(() => null)) as { handled?: unknown } | null;
  await setInquiryHandled(id, body?.handled === true);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/admin/inquiries/[id]">) {
  if (!isAdmin(request)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  if (!UUID.test(id)) return NextResponse.json({ ok: false, error: "bad_id" }, { status: 400 });
  await deleteInquiry(id);
  return NextResponse.json({ ok: true });
}
