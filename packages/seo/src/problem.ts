import { PROBLEM_JSON } from "./negotiate";

export function problemResponse(status: number, title: string, detail: string, instance?: string, type?: string) {
  const body = {
    type: type || `https://httpstatuses.com/${status}`,
    title,
    status,
    detail,
    instance,
  };
  return {
    body,
    init: {
      status,
      headers: {
        "content-type": PROBLEM_JSON,
        "cache-control": "no-store",
      },
    },
  };
}
