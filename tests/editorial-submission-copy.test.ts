import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ui = vi.hoisted(() => ({
  configured: true, state: [] as unknown[], cursor: 0,
  browser: vi.fn(), server: vi.fn(), getUser: vi.fn(), from: vi.fn(),
  insert: vi.fn(), upsert: vi.fn(), profile: vi.fn(),
}));
vi.mock("@bs/auth", () => ({ hasRealSupabase: () => ui.configured, peopleSiteUrl: () => "https://www.buildsomethingpeoplewant.com" }));
vi.mock("@bs/auth/browser", () => ({ createBrowserSupabase: ui.browser }));
vi.mock("@bs/auth/server", () => ({ createServerSupabase: ui.server, hasRealSupabase: () => ui.configured }));
vi.mock("@bs/auth/recovery", async () => import("../packages/auth/src/recovery"));
vi.mock("../apps/people/node_modules/react", async importOriginal => ({
  ...await importOriginal<typeof import("../apps/people/node_modules/react")>(),
  useState: (initial: unknown) => {
    const index = ui.cursor++;
    if (!(index in ui.state)) ui.state[index] = initial;
    return [ui.state[index], (next: unknown) => { ui.state[index] = next; }];
  },
}));

const requireApp = createRequire(new URL("../apps/people/package.json", import.meta.url));
const React = requireApp("react");
const { renderToStaticMarkup } = requireApp("react-dom/server");
const NativeFormData = globalThis.FormData;
class MockFormData extends NativeFormData {
  constructor(values?: Map<string, string>) {
    super();
    for (const [name, value] of values || []) this.set(name, value);
  }
}
beforeEach(() => {
  ui.configured = true; ui.state = []; ui.cursor = 0;
  vi.stubGlobal("React", React);
  vi.stubGlobal("FormData", MockFormData);
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(Error("Network forbidden in submission-copy tests")));
  ui.getUser.mockReset().mockResolvedValue({ data: { user: { id: "mock-member" } }, error: null });
  ui.insert.mockReset().mockResolvedValue({ error: null });
  ui.upsert.mockReset().mockResolvedValue({ error: null });
  ui.profile.mockReset().mockResolvedValue({ data: { company_name: "Example", what_they_ship: "x".repeat(400), can_review: false } });
  ui.from.mockReset().mockImplementation(() => ({
    insert: ui.insert, upsert: ui.upsert,
    select: () => ({ eq: () => ({ maybeSingle: ui.profile }) }),
  }));
  const client = { auth: { getUser: ui.getUser }, from: ui.from };
  ui.browser.mockReset().mockReturnValue(client);
  ui.server.mockReset().mockResolvedValue(client);
});
afterEach(() => vi.unstubAllGlobals());

type FormTree = { props: { onSubmit: (event: { preventDefault: () => void; currentTarget: Map<string, string> }) => Promise<void> } };
function form(render: () => unknown): FormTree { ui.cursor = 0; return render() as FormTree; }
function text(render: () => unknown): string { ui.cursor = 0; return renderToStaticMarkup(render()).replace(/<[^>]+>/g, " ").replace(/\s+/g, " "); }
async function submit(render: () => unknown, values: Record<string, string>) {
  await form(render).props.onSubmit({ preventDefault: vi.fn(), currentTarget: new Map(Object.entries(values)) });
}
const reviewValues = { product: "chatgpt", title: "Reader note", body: "A pending reader submission." };
const profileValues = {
  full_name: "Example Reader", company_name: "Example", company_website: "https://example.invalid",
  role_title: "Builder", company_size: "solo", what_they_ship: "x".repeat(400),
  why_belong: "y".repeat(280), intended_product: "chatgpt",
};

describe("submission wording with unchanged request behavior", () => {
  it("renders pending-service and public-catalog separation on the actual reviews page", async () => {
    ui.configured = false;
    const pageModule = await import("../apps/people/app/reviews/page");
    const html = renderToStaticMarkup(await pageModule.default());
    expect(html).toContain("Public reviews are read from the committed catalog");
    expect(html).toContain("approving a database row does not publish it here");
    expect(html).toContain("No automated submission-to-publication workflow is enabled");
    expect(html).toContain('href="/signup"');
    expect(pageModule.metadata.robots).toEqual({ index: false, follow: false });
    expect(ui.server).not.toHaveBeenCalled();
  });
  it("retains the can_review=false form branch but discloses that database permission may reject it", async () => {
    const pageModule = await import("../apps/people/app/reviews/page");
    const html = renderToStaticMarkup(await pageModule.default());
    expect(html).toContain("This account is not marked can_review");
    expect(html).toContain("database permission check may reject submission");
    expect(html).toContain('name="product"');
    expect(html).toContain("This audit has not verified its permissions or a publication workflow");
    expect(ui.from).toHaveBeenCalledWith("profiles");
  });
  it("shows accepted review copy only after the unchanged pending user payload is accepted", async () => {
    const { ReviewDraftForm } = await import("../apps/people/components/auth-forms");
    await submit(ReviewDraftForm, reviewValues);
    expect(ui.getUser).toHaveBeenCalledOnce();
    expect(ui.from).toHaveBeenCalledWith("reviews");
    expect(ui.insert).toHaveBeenCalledWith({ ...reviewValues, kind: "user", status: "pending", author: "mock-member" });
    const visible = text(ReviewDraftForm);
    expect(visible).toContain("Review submitted as pending");
    expect(visible).toContain("Submission does not publish a public review");
    expect(visible).not.toMatch(/An editor publishes|until an editor approves/);
    expect(ui.state[1]).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("keeps a rejected review as an error rather than a publication success", async () => {
    const { ReviewDraftForm } = await import("../apps/people/components/auth-forms");
    ui.insert.mockResolvedValueOnce({ error: { message: "Mock permission denied" } });
    await submit(ReviewDraftForm, reviewValues);
    expect(text(ReviewDraftForm)).toContain("Mock permission denied");
    expect(text(ReviewDraftForm)).not.toContain("Review submitted as pending");
  });
  it("still requires an authenticated user before a review insert", async () => {
    const { ReviewDraftForm } = await import("../apps/people/components/auth-forms");
    ui.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    await submit(ReviewDraftForm, reviewValues);
    expect(ui.insert).not.toHaveBeenCalled();
    expect(text(ReviewDraftForm)).toContain("Sign in first");
  });
  it("retains the exact pending profile payload and describes membership/publication separately", async () => {
    const { BusinessProfileForm } = await import("../apps/people/components/auth-forms");
    const render = () => BusinessProfileForm({ purpose: "review" });
    await submit(render, profileValues);
    expect(ui.from).toHaveBeenCalledWith("profiles");
    expect(ui.upsert).toHaveBeenCalledWith({ ...profileValues, id: "mock-member", status: "pending" });
    expect(text(render)).toContain("Business profile submitted as pending");
    expect(text(render)).toContain("submitting this card does not publish a listing or review");
    expect(text(render)).not.toContain("You cannot set is_admin");
    expect(ui.state[1]).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("keeps existing profile validation and does not make a request for a short pitch", async () => {
    const { BusinessProfileForm } = await import("../apps/people/components/auth-forms");
    const render = () => BusinessProfileForm({ purpose: "review" });
    await submit(render, { ...profileValues, what_they_ship: "x".repeat(399) });
    expect(ui.browser).not.toHaveBeenCalled();
    expect(ui.upsert).not.toHaveBeenCalled();
    expect(text(render)).toContain("at least 400 characters");
  });
  it.each(["review", "profile"])("states that no %s was submitted/saved when configuration is absent", async kind => {
    ui.configured = false;
    const { BusinessProfileForm, ReviewDraftForm } = await import("../apps/people/components/auth-forms");
    const render = kind === "review" ? ReviewDraftForm : () => BusinessProfileForm({ purpose: "review" });
    await submit(render, kind === "review" ? reviewValues : profileValues);
    expect(text(render)).toContain(kind === "review" ? "no review was submitted" : "no business profile was saved");
    expect(ui.browser).not.toHaveBeenCalled();
    expect(ui.insert).not.toHaveBeenCalled();
    expect(ui.upsert).not.toHaveBeenCalled();
  });
});

const AUTH_PROSE_SPANS: [string, string][] = [
  [
    "Membership card submitted. Status stays pending until an editor approves listing or reviews. You cannot set is_admin.",
    "Business profile submitted as pending. Membership permissions and publication are separate; submitting this card does not publish a listing or review."
  ],
  [
    "Review filed as pending. An editor publishes named user reviews; we never fake UGC.",
    "Review submitted as pending. Submission does not publish a public review; the publication workflow is not enabled in this version."
  ],
  [
    "Approved members with can_review may insert pending reviews. Kind is user. Status starts pending.",
    "This form requests a pending user submission. The configured database service decides whether to accept this request. This audit has not verified its permissions or a publication workflow."
  ],
  [
    "Profile saved in spirit only until keys exist. Expected status: pending.",
    "The submission service is unavailable; no business profile was saved."
  ],
  [
    "Reviews stay pending until keys and an editor exist.",
    "The submission service is unavailable; no review was submitted."
  ]
];
const BASELINE_AUTH_SHA256 = "c922484da2e41565643e6a485c55d2344be7e2438b517c0f0ea67ab7daa873fd";
it("inverts exactly the allowed prose spans to the pinned pre-edit auth file, preserving every other byte", () => {
  let source = readFileSync(new URL("../apps/people/components/auth-forms.tsx", import.meta.url), "utf8");
  for (const [before, after] of [...AUTH_PROSE_SPANS].reverse()) {
    expect(source.split(after)).toHaveLength(2);
    source = source.replace(after, before);
  }
  expect(createHash("sha256").update(source).digest("hex")).toBe(BASELINE_AUTH_SHA256);
});
