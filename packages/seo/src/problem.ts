import { PROBLEM_JSON } from "./negotiate";

export type ProblemBody = {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  code: string;
  resolution: string;
};

export type ProblemOpts = {
  instance?: string;
  type?: string;
  code?: string;
  resolution?: string;
};

const PROBLEM_TYPE_BASE = "https://httpstatuses.com";

export function defaultProblemCode(status: number): string {
  switch (status) {
    case 400:
      return "bad_request";
    case 404:
      return "not_found";
    case 405:
      return "method_not_allowed";
    case 406:
      return "not_acceptable";
    default:
      return `http_${status}`;
  }
}

export function defaultProblemResolution(status: number): string {
  switch (status) {
    case 400:
      return "Pass a valid product slug. List entities at GET /api/v1/products or read /openapi.json.";
    case 404:
      return "List products at GET /api/v1/products or read /openapi.json.";
    case 405:
      return "Use GET. Discover routes at /openapi.json.";
    default:
      return "See /openapi.json and /llms.txt for the public API contract.";
  }
}

function normalizeOpts(instanceOrOpts?: string | ProblemOpts, type?: string): ProblemOpts {
  if (typeof instanceOrOpts === "string") return { instance: instanceOrOpts, type };
  return instanceOrOpts || {};
}

export function problemResponse(
  status: number,
  title: string,
  detail: string,
  instanceOrOpts?: string | ProblemOpts,
  type?: string,
) {
  const opts = normalizeOpts(instanceOrOpts, type);
  const body: ProblemBody = {
    type: opts.type || `${PROBLEM_TYPE_BASE}/${status}`,
    title,
    status,
    detail,
    instance: opts.instance,
    code: opts.code || defaultProblemCode(status),
    resolution: opts.resolution || defaultProblemResolution(status),
  };
  const headers: Record<string, string> = {
    "content-type": `${PROBLEM_JSON}; charset=utf-8`,
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, HEAD, OPTIONS",
    "access-control-allow-headers": "Accept, Content-Type",
  };
  if (status === 405) headers.allow = "GET, HEAD, OPTIONS";
  return {
    body,
    init: {
      status,
      headers,
    },
  };
}

export function problemJson(
  status: number,
  title: string,
  detail: string,
  instanceOrOpts?: string | ProblemOpts,
  type?: string,
): Response {
  const p = problemResponse(status, title, detail, instanceOrOpts, type);
  return new Response(JSON.stringify(p.body), p.init);
}

export function apiCorsHeaders(): Record<string, string> {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, HEAD, OPTIONS",
    "access-control-allow-headers": "Accept, Content-Type",
  };
}

export function apiOptionsResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      allow: "GET, HEAD, OPTIONS",
      "cache-control": "no-store",
      ...apiCorsHeaders(),
    },
  });
}

export function apiMethodNotAllowed(instance: string): Response {
  return problemJson(405, "Method not allowed", "This endpoint is read-only and accepts GET requests only.", {
    instance,
    code: "method_not_allowed",
    resolution: "Use GET. Discover routes at /openapi.json.",
  });
}

export function apiRouteNotFound(instance: string): Response {
  return problemJson(404, "API route not found", "The requested API route does not exist.", {
    instance,
    code: "api_route_not_found",
    resolution: "Discover the public API through /openapi.json or GET /api/v1/products.",
  });
}

export function apiNotFound(instance: string, detail: string): Response {
  return problemJson(404, "Not Found", detail, {
    instance,
    code: "not_found",
    resolution: "List products at GET /api/v1/products or read /openapi.json.",
  });
}

export function apiBadRequest(instance: string, detail: string): Response {
  return problemJson(400, "Bad Request", detail, {
    instance,
    code: "bad_request",
    resolution: "Pass a valid product slug. See GET /api/v1/products and /openapi.json.",
  });
}

export function jsonOk(data: unknown): Response {
  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...apiCorsHeaders(),
    },
  });
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 1 && slug.length <= 80;
}

const API_V1_KNOWN = [/^\/api\/v1\/?$/, /^\/api\/v1\/products\/?$/, /^\/api\/v1\/products\/[^/]+\/?$/, /^\/api\/v1\/reviews\/?$/];

export function isKnownApiV1Path(pathname: string): boolean {
  return API_V1_KNOWN.some((re) => re.test(pathname));
}

/** Edge-safe gate for /api/v1: OPTIONS 204, other non-GET 405 problem+json. */
export function apiV1MethodGate(method: string, pathname: string): Response | null {
  if (!pathname.startsWith("/api/v1")) return null;
  const m = method.toUpperCase();
  if (m === "OPTIONS") return apiOptionsResponse();
  if (m !== "GET" && m !== "HEAD") return apiMethodNotAllowed(pathname);
  return null;
}
