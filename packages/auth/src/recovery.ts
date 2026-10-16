import { hasRealSupabase } from "./env";

export const recoveryHeaders = {
  "Cache-Control": "private, no-store",
  Pragma: "no-cache",
  Expires: "0",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
};

type AuthError = { code?: string; message?: string } | null;
type AuthUser = { id: string };
export type RecoveryClient = { auth: {
  exchangeCodeForSession(code: string): Promise<{ data: { session: unknown | null; user: AuthUser | null }; error: AuthError }>;
  getUser(): Promise<{ data: { user: AuthUser | null }; error: AuthError }>;
  updateUser(attributes: { password: string }): Promise<{ data: { user: AuthUser | null }; error: AuthError }>;
} };
type ClientFactory = () => Promise<RecoveryClient>;
export type PasswordState = { status: "idle" | "error" | "success"; message: string };
export type RecoveryPageState = "ready" | "invalid" | "unavailable";

const unavailable = "Password reset is temporarily unavailable. Please try again later.";
const invalid = "Your reset link or session has expired. Request a new reset link.";

export function hasRecoveryConfig(): boolean {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!hasRealSupabase() || /\s/.test(key) || !process.env.NEXT_PUBLIC_SUPABASE_URL) return false;
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    return (url.protocol === "https:" || (local && url.protocol === "http:")) &&
      !url.username && !url.password && !url.search && !url.hash && url.pathname === "/";
  } catch {
    return false;
  }
}

export function recoveryRequestUrl(origin: string): string {
  return new URL("/auth/recovery", origin).href;
}

export async function completeRecovery(requestUrl: string, createClient: ClientFactory): Promise<string> {
  const url = new URL(requestUrl);
  const destination = new URL("/reset-password", url.origin);
  const fail = (reason: "invalid" | "unavailable") => {
    destination.searchParams.set("error", reason);
    return destination.href;
  };
  if (!hasRecoveryConfig()) return fail("unavailable");
  const codes = url.searchParams.getAll("code");
  if (codes.length !== 1 || !codes[0].trim() ||
    ["error", "error_code", "error_description"].some(key => url.searchParams.has(key))) return fail("invalid");
  try {
    const client = await createClient();
    const exchanged = await client.auth.exchangeCodeForSession(codes[0]);
    if (exchanged.error || !exchanged.data.session || !exchanged.data.user) return fail("invalid");
    const validated = await client.auth.getUser();
    if (validated.error || !validated.data.user || validated.data.user.id !== exchanged.data.user.id) return fail("invalid");
    return destination.href;
  } catch {
    return fail("invalid");
  }
}

export async function recoveryPageState(error: string | string[] | undefined, createClient: ClientFactory): Promise<RecoveryPageState> {
  // A failed callback must not silently reuse a previously authenticated user.
  if (error !== undefined) return error === "unavailable" ? "unavailable" : "invalid";
  if (!hasRecoveryConfig()) return "unavailable";
  try {
    const { data, error: authError } = await (await createClient()).auth.getUser();
    return !authError && data.user ? "ready" : "invalid";
  } catch {
    return "unavailable";
  }
}

export function recoveryMessage(state: Exclude<RecoveryPageState, "ready">): string {
  return state === "invalid" ? invalid : unavailable;
}

export async function updateRecoveryPassword(formData: FormData, createClient: ClientFactory): Promise<PasswordState> {
  const failure = (message: string): PasswordState => ({ status: "error", message });
  if (!hasRecoveryConfig()) return failure(unavailable);
  const password = formData.get("password");
  const confirmation = formData.get("confirmation");
  if (typeof password !== "string" || password.length < 8) return failure("Use at least 8 characters for your new password.");
  if (password !== confirmation) return failure("The passwords do not match.");
  try {
    const client = await createClient();
    // Cookie/session payloads alone are not authorization. Validate with Auth again on every submission.
    const validated = await client.auth.getUser();
    if (validated.error || !validated.data.user) return failure(invalid);
    const updated = await client.auth.updateUser({ password });
    if (updated.error) {
      switch (updated.error.code) {
        case "weak_password": return failure("Choose a stronger password that meets the account's password requirements.");
        case "same_password": return failure("Choose a password different from your current password.");
        case "reauthentication_needed":
        case "session_not_found":
        case "refresh_token_not_found": return failure(invalid);
        default: return failure("We could not update your password. Please try again or request a new reset link.");
      }
    }
    if (!updated.data.user || updated.data.user.id !== validated.data.user.id) return failure(invalid);
    return { status: "success", message: "Your password has been updated." };
  } catch {
    return failure("We could not update your password. Please try again.");
  }
}
