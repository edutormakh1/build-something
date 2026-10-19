/* Opt-in test fixture: preload with Node --require, or inject before browser scripts.
 * Never imported by application code. All accounts, tokens and responses are fake.
 */
(() => {
  const originalFetch = globalThis.fetch;
  const consumed = new Set();
  const state = { requests: [], sentRedirects: [], updates: 0 };
  globalThis.__recoveryMock = state;
  const now = () => Math.floor(Date.now() / 1000);
  const encode = value => btoa(JSON.stringify(value)).replaceAll("=", "").replaceAll("+", "-").replaceAll("/", "_");
  const user = {
    id: "11111111-1111-4111-8111-111111111111", aud: "authenticated", role: "authenticated",
    email: "mock-member@example.invalid", app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {}, created_at: "2026-01-01T00:00:00.000Z",
  };
  const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: {
    "content-type": "application/json", "x-supabase-api-version": "2024-01-01",
  } });
  const rejected = () => response({ code: "flow_state_expired", message: "Mock recovery expired or already used" }, 400);
  globalThis.fetch = async (input, init = {}) => {
    const raw = typeof input === "string" || input instanceof URL ? String(input) : input.url;
    const url = new URL(raw, globalThis.location?.href);
    if (url.hostname.endsWith(".supabase.co") || url.hostname.endsWith(".supabase.in")) {
      throw new Error("Recovery fixture blocks real Supabase requests");
    }
    if (url.hostname !== "recovery.invalid") return originalFetch(input, init);
    const method = (init.method || input.method || "GET").toUpperCase();
    const entry = { method, path: url.pathname };
    state.requests.push(entry);
    let body = {};
    if (init.body) body = JSON.parse(String(init.body));
    if (url.pathname === "/auth/v1/recover" && method === "POST") {
      state.sentRedirects.push(url.searchParams.get("redirect_to"));
      return response({});
    }
    if (url.pathname === "/auth/v1/token" && method === "POST" && url.searchParams.get("grant_type") === "pkce") {
      if (!body.code_verifier || !String(body.auth_code).startsWith("valid-") || consumed.has(body.auth_code)) return rejected();
      consumed.add(body.auth_code);
      const access_token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id, aud: "authenticated", role: "authenticated", exp: now() + 3600, iat: now(), session_id: "mock-session" })}.mock-not-signed`;
      return response({ access_token, refresh_token: "fake-refresh-token", token_type: "bearer", expires_in: 3600, user });
    }
    if (url.pathname === "/auth/v1/user" && ["GET", "PUT"].includes(method)) {
      const headers = new Headers(init.headers || input.headers);
      const token = (headers.get("authorization") || "").replace(/^Bearer /, "");
      if (!token.endsWith(".mock-not-signed")) return response({ code: "session_not_found", message: "Mock session missing" }, 401);
      if (method === "PUT") {
        state.updates += 1;
        await new Promise(resolve => setTimeout(resolve, 350));
        if (body.password === "reject-password") return response({ code: "weak_password", message: "Mock password policy rejection" }, 422);
      }
      return response(user);
    }
    throw new Error(`Unmocked recovery Auth request: ${method} ${url.pathname}`);
  };
})();
