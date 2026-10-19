export const PREVIEW_ERROR_DIAGNOSTIC = "BS_PREVIEW_HANDLER_FAILED";

// Keep production's response/promise identity and synchronous error behavior.
export function previewFetch<T extends Response | Promise<Response>>(fetchResponse: () => T, flag: unknown): T | Promise<Response> {
  if (flag !== "1") return fetchResponse();
  return tagPreviewResponse(fetchResponse);
}

async function tagPreviewResponse(fetchResponse: () => Response | Promise<Response>): Promise<Response> {
  try {
    const original = await fetchResponse();
    // Retain the original stream and Headers, including independent Set-Cookie fields.
    // Redirect/fetch headers can be immutable; do not mutate the original response.
    const response = new Response(original.body, original);
    response.headers.set("x-robots-tag", "noindex, nofollow");
    return response;
  } catch {
    console.error(PREVIEW_ERROR_DIAGNOSTIC);
    return new Response("Preview temporarily unavailable.", {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" },
    });
  }
}
