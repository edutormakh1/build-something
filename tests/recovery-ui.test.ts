import { createRequire } from "node:module";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const ui = vi.hoisted(() => ({
  client: vi.fn(), user: vi.fn(),
  state: { status: "idle", message: "" }, pending: false,
  middlewareClient: vi.fn(),
}));
vi.mock("@bs/auth/server", () => ({ createServerSupabase: ui.client }));
vi.mock("@bs/auth/browser", () => ({ createBrowserSupabase: vi.fn() }));
vi.mock("@bs/auth/recovery", async () => import("../packages/auth/src/recovery"));
vi.mock("../apps/people/node_modules/react", async importOriginal => ({
  ...await importOriginal<typeof import("../apps/people/node_modules/react")>(),
  useActionState: () => [ui.state, () => {}, ui.pending],
}));
vi.mock("../packages/auth/node_modules/@supabase/ssr", () => ({ createServerClient: ui.middlewareClient }));

const require = createRequire(new URL("../apps/people/package.json", import.meta.url));
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { NextRequest } = require("next/server");

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://recovery.invalid");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "local-mocked-public-key-not-a-secret");
  // The repo preserves JSX for Next; Vitest's direct TSX transform uses the React global.
  vi.stubGlobal("React", React);
  ui.state = { status: "idle", message: "" }; ui.pending = false;
  ui.user.mockReset().mockResolvedValue({ data: { user: { id: "member" } }, error: null });
  ui.client.mockReset().mockResolvedValue({ auth: { getUser: ui.user } });
  ui.middlewareClient.mockReset();
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe.each(["people", "agents"])("%s reset UI", app => {
  async function page(error?: string) {
    const pageModule = app === "people" ? await import("../apps/people/app/reset-password/page") : await import("../apps/agents/app/reset-password/page");
    const element = await pageModule.default({ searchParams: Promise.resolve(error === undefined ? {} : { error }) });
    return { html: renderToStaticMarkup(element), pageModule };
  }
  it("renders the authenticated form with labels and new-password semantics", async () => {
    const { html, pageModule } = await page();
    expect(pageModule.dynamic).toBe("force-dynamic");
    expect(pageModule.metadata.robots).toEqual({ index: false, follow: false });
    expect(html).toContain('name="password"');
    expect(html).toContain('name="confirmation"');
    expect(html.match(/autoComplete="new-password"/g)).toHaveLength(2);
    expect(html.match(/minLength="8"/g)).toHaveLength(2);
    expect(html).toContain('for="new-password"');
    expect(html).toContain('for="confirm-password"');
    expect(html).not.toContain("member");
  });
  it("shows explicit callback restart despite an old valid session", async () => {
    const { html } = await page("invalid");
    expect(html).toContain('role="alert"');
    expect(html).toContain("expired");
    expect(html).toContain('href="/forgot-password"');
    expect(html).not.toContain('name="password"');
    expect(ui.client).not.toHaveBeenCalled();
  });
  it("blocks the form when the server rejects a session", async () => {
    ui.user.mockResolvedValue({ data: { user: null }, error: { message: "expired" } });
    expect((await page()).html).not.toContain('name="password"');
  });
  it("shows customer-facing unavailable copy and makes no auth call without config", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    const { html } = await page();
    expect(html).toContain("temporarily unavailable");
    expect(html).not.toMatch(/Supabase|keys|name="password"/);
    expect(ui.client).not.toHaveBeenCalled();
  });
  it("renders pending, provider error and accepted success with the correct continuation", async () => {
    ui.pending = true;
    expect((await page()).html).toContain("Updating…");
    expect((await page()).html).toContain('disabled=""');
    ui.pending = false; ui.state = { status: "error", message: "Choose a stronger password." };
    expect((await page()).html).toContain('role="alert">Choose a stronger password.');
    ui.state = { status: "success", message: "Your password has been updated." };
    const { html } = await page();
    expect(html).toContain('role="status">Your password has been updated.');
    expect(html).toContain(`href="${app === "people" ? "/account" : "/"}">Continue`);
    expect(html).not.toContain('name="password"');
  });
});

describe("shared session middleware", () => {
  it("does not construct an Auth client when config is missing or malformed", async () => {
    const { updateSession } = await import("../packages/auth/src/middleware");
    for (const url of ["", "malformed"]) {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
      await updateSession(new NextRequest("https://people.invalid/products"));
    }
    expect(ui.middlewareClient).not.toHaveBeenCalled();
  });
  it("retains refresh cookies and applies no-store to the final response", async () => {
    ui.middlewareClient.mockImplementation((_url, _key, options) => ({ auth: {
      getUser: async () => {
        options.cookies.setAll([
          { name: "sb-mock.0", value: "one", options: { path: "/" } },
          { name: "sb-mock.1", value: "two", options: { path: "/" } },
        ]);
      },
    } }));
    const { updateSession } = await import("../packages/auth/src/middleware");
    const request = new NextRequest("https://people.invalid/products");
    const response = await updateSession(request);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("pragma")).toBe("no-cache");
    expect(response.headers.get("expires")).toBe("0");
    expect(response.cookies.get("sb-mock.0")?.value).toBe("one");
    expect(response.cookies.get("sb-mock.1")?.value).toBe("two");
    expect(request.cookies.get("sb-mock.1")?.value).toBe("two");
  });
});
