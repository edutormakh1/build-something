import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@bs/auth/server";
import { completeRecovery, recoveryHeaders } from "@bs/auth/recovery";
import { peopleSiteUrl } from "@bs/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const destination = new URL(await completeRecovery(request.url, createServerSupabase));
  // The request origin can be the loopback transport behind an HTTPS tunnel.
  const publicDestination = new URL(destination.pathname + destination.search, peopleSiteUrl());
  return NextResponse.redirect(publicDestination, { status: 303, headers: recoveryHeaders });
}
