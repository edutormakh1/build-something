import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasRealSupabase, supabaseAnonKey, supabaseUrl } from "./env";
import { hasRecoveryConfig, recoveryHeaders } from "./recovery";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!hasRealSupabase() || !hasRecoveryConfig()) return response;
  const client = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        response.headers.set("Cache-Control", recoveryHeaders["Cache-Control"]);
        response.headers.set("Pragma", recoveryHeaders.Pragma);
        response.headers.set("Expires", recoveryHeaders.Expires);
      },
    },
  });
  await client.auth.getUser();
  return response;
}
