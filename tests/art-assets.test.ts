import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { STILLS } from "../packages/ui/src/motion/tone";

const root = path.resolve(import.meta.dirname, "..");
const appRequire = createRequire(path.join(root, "apps/people/package.json"));
const nextRequire = createRequire(appRequire.resolve("next/package.json"));
const sharp = nextRequire("sharp");
const digest = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const masterHashes = {
  "brand-mark-3d.png": "e9f0cdbdeba53b88288c1e18f1ad8c840f6113982bcc29a9b918da003bb88f10",
  "people-hero-3d.png": "c65aa3a04023fd43d0756caa5ec6cc3309b984307851ab0bf535912a2d075815",
  "agents-hero-3d.png": "b1c791097307cf754b8eab22102d621154d5116cd01422dae43bd4d6c584fa74",
  "login-hall-3d.png": "61ac6e72050b1506d49585efec5a59b6f3f533c533c19ca300ebbbaae883dd2c",
};
const derivatives = [
  ["people", "brand-mark-display-v1.webp", 576, 384, 60],
  ["agents", "brand-mark-display-v1.webp", 576, 384, 60],
  ["people", "brand-mark-environment-v1.webp", 1024, 683, 180],
  ["agents", "brand-mark-environment-v1.webp", 1024, 683, 180],
  ["people", "people-hero-display-v1.webp", 1536, 1024, 320],
  ["agents", "agents-hero-display-v1.webp", 1536, 1024, 350],
] as const;

function runScript(filename: string, args: string[] = []) {
  const env = Object.fromEntries(["PATH", "HOME", "LANG", "LC_ALL", "TMPDIR"].flatMap(key =>
    process.env[key] === undefined ? [] : [[key, process.env[key]]],
  ));
  return spawnSync(process.execPath, [filename, ...args], { env, encoding: "utf8", timeout: 10_000 });
}

async function fixture(check: (directory: string, script: string) => Promise<void>) {
  const directory = await mkdtemp(path.join(tmpdir(), "bs-art-guard-"));
  try {
    const script = path.join(directory, "scripts/derive-art.mjs");
    await mkdir(path.dirname(script), { recursive: true });
    await copyFile(path.join(root, "scripts/derive-art.mjs"), script);
    for (const app of ["people", "agents"]) {
      const art = path.join(directory, "apps", app, "public/art");
      await mkdir(art, { recursive: true });
      for (const name of ["brand-mark-3d.png", `${app}-hero-3d.png`, "login-hall-3d.png"]) {
        await copyFile(path.join(root, "apps", app, "public/art", name), path.join(art, name));
      }
    }
    await check(directory, script);
  } finally { await rm(directory, { recursive: true, force: true }); }
}

async function noDerivatives(directory: string) {
  for (const app of ["people", "agents"]) {
    const names = await readdir(path.join(directory, "apps", app, "public/art"));
    expect(names.filter(name => name.endsWith(".webp"))).toEqual([]);
  }
}

describe("derived art payloads", () => {
  it.each(derivatives)("decodes %s/%s at %dx%d within %d KiB", async (app, name, width, height, kib) => {
    const bytes = await readFile(path.join(root, "apps", app, "public/art", name));
    expect(bytes.toString("ascii", 0, 4)).toBe("RIFF");
    expect(bytes.toString("ascii", 8, 12)).toBe("WEBP");
    expect(bytes.length).toBeLessThanOrEqual(kib * 1024);
    const metadata = await sharp(bytes).metadata();
    expect(metadata).toMatchObject({ format: "webp", width, height, hasAlpha: false });
    const decoded = await sharp(bytes).raw().toBuffer({ resolveWithObject: true });
    expect(decoded.info).toMatchObject({ width, height, channels: 3 });
    expect(decoded.data.length).toBe(width * height * 3);
  });

  it("ships byte-identical shared derivatives in both applications", async () => {
    for (const name of ["brand-mark-display-v1.webp", "brand-mark-environment-v1.webp"]) {
      const bytes = await Promise.all(["people", "agents"].map(app => readFile(path.join(root, "apps", app, "public/art", name))));
      expect(bytes[0].equals(bytes[1])).toBe(true);
    }
  });

  it.each(["people", "agents"] as const)("preserves %s original PNG hashes and embedded provenance", async app => {
    for (const name of ["brand-mark-3d.png", `${app}-hero-3d.png`, "login-hall-3d.png"] as const) {
      const bytes = await readFile(path.join(root, "apps", app, "public/art", name));
      expect(digest(bytes)).toBe(masterHashes[name]);
      const chunks: string[] = [];
      for (let offset = 8; offset < bytes.length;) {
        chunks.push(bytes.toString("ascii", offset + 4, offset + 8));
        offset += bytes.readUInt32BE(offset) + 12;
      }
      expect(chunks).toContain("caBX");
    }
  });

  it("resolves every currently mapped in-page art URL in its application", async () => {
    function literalArtUrls(source: string) {
      const urls = new Set<string>();
      const ast = ts.createSourceFile("consumer.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      function visit(node: ts.Node) {
        if (ts.isStringLiteral(node) && node.text.startsWith("/art/")) urls.add(node.text);
        ts.forEachChild(node, visit);
      }
      visit(ast);
      return urls;
    }
    const shared = literalArtUrls(await readFile(path.join(root, "packages/ui/src/art.tsx"), "utf8"));
    for (const app of ["people", "agents"] as const) {
      const urls = new Set<string>([...Object.values(STILLS[app]), ...shared]);
      for (const source of [`apps/${app}/components/world/atmosphere.tsx`, ...(app === "agents" ? ["apps/agents/app/page.tsx"] : [])]) {
        for (const url of literalArtUrls(await readFile(path.join(root, source), "utf8"))) urls.add(url);
      }
      expect(urls.size).toBeGreaterThan(0);
      for (const url of urls) {
        const filename = path.join(root, "apps", app, "public", url);
        expect((await readFile(filename)).length, `${app} ${url}`).toBeGreaterThan(0);
      }
    }
  });
});

describe("fixed local derivation pipeline", () => {
  it("re-encodes deterministically and links every output to its unchanged credential-bearing source", async () => {
    const before = await Promise.all(derivatives.map(([app, name]) => readFile(path.join(root, "apps", app, "public/art", name))));
    const result = runScript(path.join(root, "scripts/derive-art.mjs"));
    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
    const manifest = JSON.parse(result.stdout);
    expect(manifest.encoder).toMatchObject({ sharp: "0.35.5", vips: "8.18.7" });
    expect(manifest.parameters.webp).toMatchObject({ quality: 82, effort: 4, lossless: false });
    expect(manifest.provenance).toContain("omit embedded original credentials");
    expect(manifest.outputs).toHaveLength(derivatives.length);
    for (const [index, [app, name, width, height, kib]] of derivatives.entries()) {
      const output = `apps/${app}/public/art/${name}`;
      const record = manifest.outputs.find((entry: { output: string }) => entry.output === output);
      const actual = await readFile(path.join(root, output));
      expect(actual.equals(before[index])).toBe(true);
      expect(record).toMatchObject({ sha256: digest(actual), width, height, bytes: actual.length, budgetBytes: kib * 1024,
        embeddedCredentials: false });
      expect(record.sourceSha256).toBe(digest(await readFile(path.join(root, record.source))));
      expect(record.elapsedMs).toBeGreaterThan(0);
    }
  });

  it("refuses custom source/output arguments before writing any file", async () => {
    await fixture(async (directory, script) => {
      const result = runScript(script, ["--output", "../../unexpected.webp"]);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("accepts no arguments or custom paths");
      await noDerivatives(directory);
    });
  });

  it("refuses changed original bytes before resolving an encoder or creating derivatives", async () => {
    await fixture(async (directory, script) => {
      const filename = path.join(directory, "apps/people/public/art/brand-mark-3d.png");
      const bytes = await readFile(filename); bytes[bytes.length - 1] ^= 1;
      await writeFile(filename, bytes);
      const result = runScript(script);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Unexpected original hash");
      expect((await readFile(filename)).equals(bytes)).toBe(true);
      await noDerivatives(directory);
    });
  });

  it("refuses an output symlink and leaves its external target untouched", async () => {
    await fixture(async (directory, script) => {
      const target = path.join(directory, "outside-sentinel");
      await writeFile(target, "untouched");
      await symlink(target, path.join(directory, "apps/people/public/art/brand-mark-display-v1.webp"));
      const result = runScript(script);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Refusing symlink art path");
      expect(await readFile(target, "utf8")).toBe("untouched");
      expect((await readdir(path.join(directory, "apps/agents/public/art"))).filter(name => name.endsWith(".webp"))).toEqual([]);
    });
  });

  it.each([
    ["0.35.3", "8.18.7", "Unexpected Sharp version"],
    ["0.35.5", "8.18.6", "Unexpected libvips version"],
  ])("refuses encoder %s / libvips %s", async (sharpVersion, vipsVersion, message) => {
    await fixture(async (directory, script) => {
      const next = path.join(directory, "apps/people/node_modules/next");
      const encoder = path.join(next, "node_modules/sharp");
      await mkdir(encoder, { recursive: true });
      await writeFile(path.join(next, "package.json"), JSON.stringify({ name: "next" }));
      await writeFile(path.join(encoder, "index.js"), `module.exports = {versions: ${JSON.stringify({ sharp: sharpVersion, vips: vipsVersion })}};`);
      const result = runScript(script);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(message);
      await noDerivatives(directory);
    });
  });
});
