import generated from "./.open-next/worker.js";
import { previewFetch } from "../../packages/seo/src/preview.ts";
import { normalizeWorkerRequest } from "../../packages/seo/src/negotiate.ts";

export * from "./.open-next/worker.js";

const worker = {
  ...generated,
  fetch(request, env, ctx) {
    return previewFetch(() => generated.fetch(normalizeWorkerRequest(request), env, ctx), env.BS_PREVIEW);
  },
};

export default worker;
