import { NextResponse, type NextRequest } from "next/server";
import { isAdmin, listSignups, toCsv } from "@/lib/accounts/admin";

export const dynamic = "force-dynamic";

/** All sign-ups as a CSV file, for Excel or a CRM. */
export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const csv = toCsv(await listSignups(100_000));
  return new NextResponse(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="signups-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
