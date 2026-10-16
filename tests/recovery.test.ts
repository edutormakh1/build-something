import { createRequire } from "node:module";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  completeRecovery, hasRecoveryConfig, recoveryPageState, recoveryRequestUrl,
  updateRecoveryPassword,
} from "../packages/auth/src/recovery";

const mocks = vi.hoisted(() => ({ client: vi.fn(), session: vi.fn() }));
vi.mock("@bs/auth/server", () => ({ createServerSupabase: mocks.client }));
vi.mock("@bs/auth/recovery", async () => import("../packages/auth/src/recovery"));
vi.mock("@bs/auth/middleware", () => ({ updateSession: mocks.session }));

const require = createRequire(new URL("../apps/people/package.json", import.meta.url));
require("next/dist/server/node-environment.js");
const { NextRequest, NextResponse } = require("next/server");
const { AppRouteRouteModule } = require("next/dist/server/route-modules/app-route/module.js");
const { cookies } = require("next/headers");

function client() {
  return { auth: {
    exchangeCodeForSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "fake" }, user: { id: "member" } }, error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: "member" } }, error: null }),
    updateUser: vi.fn().mockResolvedValue({ data: { user: { id: "member" } }, error: null }),
  } };
}
let supabase: ReturnType<typeof client>;
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://recovery.invalid");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "local-mocked-public-key-not-a-secret");
  supabase = client();
  mocks.client.mockReset().mockResolvedValue(supabase);
  mocks.session.mockReset().mockImplementation(() => NextResponse.next());
});
afterEach(() => vi.unstubAllEnvs());

describe("recovery behavior", () => {
  it.each(["https://www.buildsomethingpeoplewant.com", "https://www.buildsomethingagentswant.com", "http://127.0.0.1:4310", "http://127.0.0.1:4311"])("keeps request and callback on %s", async origin => {
    expect(recoveryRequestUrl(origin)).toBe(`${origin}/auth/recovery`);
    expect(await completeRecovery(`${origin}/auth/recovery?code=valid&next=https://evil.invalid&redirect=//evil.invalid`, mocks.client)).toBe(`${origin}/reset-password`);
    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledOnce();
    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith("valid");
    expect(supabase.auth.getUser).toHaveBeenCalledOnce();
  });
  it.each(["", "?code=", "?code=one&code=two", "?error=access_denied&code=valid", "?error_code=otp_expired", "?error_description=expired&code=valid"])("rejects malformed/provider callback %s without consulting an older session", async query => {
    expect(await completeRecovery(`https://people.invalid/auth/recovery${query}`, mocks.client)).toBe("https://people.invalid/reset-password?error=invalid");
    expect(mocks.client).not.toHaveBeenCalled();
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });
  it.each(["expired", "replayed", "missing-verifier"])("does not rescue %s exchange with an old session", async code => {
    supabase.auth.exchangeCodeForSession.mockResolvedValue({ data: { session: null, user: null }, error: { message: code } });
    expect(await completeRecovery(`https://people.invalid/auth/recovery?code=${code}`, mocks.client)).toContain("?error=invalid");
    expect(supabase.auth.getUser).not.toHaveBeenCalled();
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });
  it("fails a replay even after a successful exchange", async () => {
    await completeRecovery("https://people.invalid/auth/recovery?code=one", mocks.client);
    supabase.auth.exchangeCodeForSession.mockResolvedValueOnce({ data: { session: null, user: null }, error: { message: "consumed" } });
    expect(await completeRecovery("https://people.invalid/auth/recovery?code=one", mocks.client)).toContain("?error=invalid");
    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledTimes(2);
  });
  it("requires the server-validated user to match the exchanged user", async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: "other" } }, error: null });
    expect(await completeRecovery("https://people.invalid/auth/recovery?code=one", mocks.client)).toContain("?error=invalid");
  });
  it("handles transport exceptions without exposing provider payloads", async () => {
    supabase.auth.exchangeCodeForSession.mockRejectedValueOnce(Error("private provider detail"));
    expect(await completeRecovery("https://people.invalid/auth/recovery?code=one", mocks.client)).toContain("?error=invalid");
    supabase.auth.getUser.mockRejectedValueOnce(Error("private provider detail"));
    expect(await recoveryPageState(undefined, mocks.client)).toBe("unavailable");
  });
  it.each(["", "not a URL", "ftp://recovery.invalid", "https://user:pass@recovery.invalid", "https://recovery.invalid?token=x"])("refuses unusable config %s with zero auth calls", async url => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
    expect(hasRecoveryConfig()).toBe(false);
    expect(await completeRecovery("https://people.invalid/auth/recovery?code=one", mocks.client)).toContain("?error=unavailable");
    expect(await recoveryPageState(undefined, mocks.client)).toBe("unavailable");
    expect((await updateRecoveryPassword(passwords(), mocks.client)).status).toBe("error");
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it("refuses placeholder keys without reaching auth", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-anon-placeholder");
    expect(hasRecoveryConfig()).toBe(false);
    expect(await recoveryPageState(undefined, mocks.client)).toBe("unavailable");
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it("prioritizes callback error over an existing valid session", async () => {
    expect(await recoveryPageState("invalid", mocks.client)).toBe("invalid");
    expect(await recoveryPageState("", mocks.client)).toBe("invalid");
    expect(mocks.client).not.toHaveBeenCalled();
    expect(await recoveryPageState(undefined, mocks.client)).toBe("ready");
    expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });
  it("rejects an unvalidated client session and a session expiring before submit", async () => {
    expect(await recoveryPageState(undefined, mocks.client)).toBe("ready");
    supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: "expired" } });
    expect(await recoveryPageState(undefined, mocks.client)).toBe("invalid");
    expect((await updateRecoveryPassword(passwords(), mocks.client)).status).toBe("error");
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });
  it.each([["short", "short"], ["long-password", "different-password"]])("validates passwords on the server", async (password, confirmation) => {
    expect((await updateRecoveryPassword(passwords(password, confirmation), mocks.client)).status).toBe("error");
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it("updates only the validated current user and returns success after acceptance", async () => {
    const fd = passwords();
    fd.set("user_id", "attacker-chosen");
    expect(await updateRecoveryPassword(fd, mocks.client)).toEqual({ status: "success", message: "Your password has been updated." });
    expect(supabase.auth.getUser).toHaveBeenCalledOnce();
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: "new-password" });
    expect(supabase.auth.getUser.mock.invocationCallOrder[0]).toBeLessThan(supabase.auth.updateUser.mock.invocationCallOrder[0]);
  });
  it.each(["weak_password", "same_password", "reauthentication_needed"])("shows a useful %s update failure", async code => {
    supabase.auth.updateUser.mockResolvedValue({ data: { user: null }, error: { code, message: "private" } });
    const result = await updateRecoveryPassword(passwords(), mocks.client);
    expect(result.status).toBe("error");
    expect(result.message).not.toContain("private");
  });
  it("turns a thrown update into a visible retry error", async () => {
    supabase.auth.updateUser.mockRejectedValue(Error("private"));
    expect((await updateRecoveryPassword(passwords(), mocks.client)).message).toMatch(/try again/i);
  });
});

function passwords(password = "new-password", confirmation = password) {
  const fd = new FormData(); fd.set("password", password); fd.set("confirmation", confirmation); return fd;
}

describe.each(["people", "agents"])("%s route/action integration", app => {
  async function invoke(url: string) {
    const userland = app === "people" ? await import("../apps/people/app/auth/recovery/route") : await import("../apps/agents/app/auth/recovery/route");
    const route = new AppRouteRouteModule({ definition: { kind: "APP_ROUTE", page: "/auth/recovery/route", pathname: "/auth/recovery", filename: "route", bundlePath: "" }, userland, resolvedPagePath: "/auth/recovery/route", distDir: ".next", relativeProjectDir: ".", nextConfigOutput: undefined });
    return route.handle(new NextRequest(url), { renderOpts: { supportsDynamicResponse: true, experimental: {} }, sharedContext: { buildId: "mock-recovery" }, prerenderManifest: { preview: {} } });
  }
  it("retains all session cookies on the actual Next 303 response", async () => {
    supabase.auth.exchangeCodeForSession.mockImplementationOnce(async () => {
      const store = await cookies();
      store.set("sb-mocked-auth-token.0", "chunk-one", { path: "/", sameSite: "lax" });
      store.set("sb-mocked-auth-token.1", "chunk-two", { path: "/", sameSite: "lax" });
      return { data: { session: { access_token: "fake" }, user: { id: "member" } }, error: null };
    });
    const response = await invoke("http://localhost:4310/auth/recovery?code=valid&next=https://evil.invalid");
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:4310/reset-password");
    expect(response.headers.get("set-cookie")).toContain("sb-mocked-auth-token.0=chunk-one");
    expect(response.headers.get("set-cookie")).toContain("sb-mocked-auth-token.1=chunk-two");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });
  it("returns no-store failure even with an older valid user", async () => {
    const response = await invoke("http://localhost:4311/auth/recovery?error_code=otp_expired");
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:4311/reset-password?error=invalid");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(supabase.auth.getUser).not.toHaveBeenCalled();
  });
  it("runs the actual server action and revalidates before update", async () => {
    const { updatePassword } = app === "people" ? await import("../apps/people/app/reset-password/actions") : await import("../apps/agents/app/reset-password/actions");
    expect((await updatePassword({ status: "idle", message: "" }, passwords())).status).toBe("success");
    expect(supabase.auth.getUser).toHaveBeenCalledOnce();
    expect(supabase.auth.updateUser).toHaveBeenCalledOnce();
  });
  it.each(["/auth/recovery", "/reset-password"])("bypasses Markdown/session refresh for %s, including action requests", async path => {
    const { middleware } = app === "people" ? await import("../apps/people/middleware") : await import("../apps/agents/middleware");
    for (const method of ["GET", "POST"]) {
      const response = await middleware(new NextRequest(`http://localhost:4310${path}`, { method, headers: { accept: "text/markdown", rsc: "1", "next-action": "mock-action" } }));
      expect(response.headers.get("x-middleware-rewrite")).toBeNull();
      expect(response.headers.get("cache-control")).toContain("no-store");
      expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    }
    expect(mocks.session).not.toHaveBeenCalled();
  });
});
