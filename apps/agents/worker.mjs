import generated from "./.open-next/worker.js";
import { normalizeWorkerRequest } from "../../packages/seo/src/negotiate.ts";

export * from "./.open-next/worker.js";

const worker = {
  ...generated,
  fetch(request, env, ctx) {
    return generated.fetch(normalizeWorkerRequest(request), env, ctx);
  },
};

export default worker;
