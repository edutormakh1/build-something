import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@bs/auth/server";
import { completeRecovery, recoveryHeaders } from "@bs/auth/recovery";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const destination = await completeRecovery(request.url, createServerSupabase);
  return NextResponse.redirect(destination, { status: 303, headers: recoveryHeaders });
}
