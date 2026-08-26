export function securityHeaders(): { key: string; value: string }[] {
  return [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    { key: "X-DNS-Prefetch-Control", value: "on" },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  ];
}

export function withVaryAccept(headers: Headers): void {
  const current = headers.get("Vary");
  if (!current) headers.set("Vary", "Accept");
  else if (!current.split(",").map((s) => s.trim().toLowerCase()).includes("accept")) {
    headers.set("Vary", `${current}, Accept`);
  }
}
