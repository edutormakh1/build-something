// Local codec derivatives only. Keep the original PNGs and their credentials.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, readFile, realpath, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const brandHash = "e9f0cdbdeba53b88288c1e18f1ad8c840f6113982bcc29a9b918da003bb88f10";
const hallHash = "61ac6e72050b1506d49585efec5a59b6f3f533c533c19ca300ebbbaae883dd2c";
const masters = {
  "apps/people/public/art/brand-mark-3d.png": brandHash,
  "apps/agents/public/art/brand-mark-3d.png": brandHash,
  "apps/people/public/art/people-hero-3d.png": "c65aa3a04023fd43d0756caa5ec6cc3309b984307851ab0bf535912a2d075815",
  "apps/agents/public/art/agents-hero-3d.png": "b1c791097307cf754b8eab22102d621154d5116cd01422dae43bd4d6c584fa74",
  "apps/people/public/art/login-hall-3d.png": hallHash,
  "apps/agents/public/art/login-hall-3d.png": hallHash,
};
const shared = name => ["people", "agents"].map(app => ({
  source: `apps/${app}/public/art/brand-mark-3d.png`, output: `apps/${app}/public/art/${name}`,
}));
const derivatives = [
  { width: 576, height: 384, budgetBytes: 60 * 1024, files: shared("brand-mark-display-v1.webp") },
  { width: 1024, height: 683, budgetBytes: 180 * 1024, files: shared("brand-mark-environment-v1.webp") },
  { width: 1536, height: 1024, budgetBytes: 320 * 1024, files: [{
    source: "apps/people/public/art/people-hero-3d.png", output: "apps/people/public/art/people-hero-display-v1.webp",
  }] },
  { width: 1536, height: 1024, budgetBytes: 350 * 1024, files: [{
    source: "apps/agents/public/art/agents-hero-3d.png", output: "apps/agents/public/art/agents-hero-display-v1.webp",
  }] },
];
const parameters = {
  resize: { fit: "fill", kernel: "lanczos3", withoutEnlargement: true },
  colourspace: "srgb",
  webp: { quality: 82, effort: 4, lossless: false, nearLossless: false, smartSubsample: false },
  metadata: "Sharp default removal; no keepMetadata/withMetadata",
};

// Reject symlinks at every input/output ancestor, not just the final filename.
async function checkedPath(relative, missingOutput = false) {
  const parts = relative.split("/");
  assert.ok(!path.isAbsolute(relative) && parts.every(part => part && part !== "." && part !== ".."), "Invalid fixed art path");
  let filename = await realpath(root);
  for (let i = 0; i < parts.length; i++) {
    filename = path.join(filename, parts[i]);
    let stat;
    try { stat = await lstat(filename); }
    catch (error) {
      if (error.code === "ENOENT" && missingOutput && i === parts.length - 1) return filename;
      throw error;
    }
    assert.ok(!stat.isSymbolicLink(), `Refusing symlink art path: ${relative}`);
    if (i === parts.length - 1) {
      assert.ok(stat.isFile() && stat.nlink === 1, `Refusing non-regular or hard-linked art file: ${relative}`);
    } else assert.ok(stat.isDirectory(), `Invalid art directory: ${relative}`);
  }
  return filename;
}

function chunks(bytes, kind) {
  const result = [];
  for (let offset = kind === "png" ? 8 : 12; offset < bytes.length;) {
    const size = kind === "png" ? bytes.readUInt32BE(offset) : bytes.readUInt32LE(offset + 4);
    result.push(bytes.toString("ascii", offset + (kind === "png" ? 4 : 0), offset + (kind === "png" ? 8 : 4)));
    offset += kind === "png" ? size + 12 : size + 8 + size % 2;
    assert.ok(offset <= bytes.length, "Invalid art chunk length");
  }
  return result;
}

function resolveEncoder(app) {
  const appRequire = createRequire(path.join(root, "apps", app, "package.json"));
  const nextRequire = createRequire(appRequire.resolve("next/package.json"));
  const sharp = nextRequire("sharp");
  assert.equal(sharp.versions.sharp, "0.35.5", "Unexpected Sharp version; do not install implicitly");
  assert.equal(sharp.versions.vips, "8.18.7", "Unexpected libvips version");
  assert.equal(sharp.format.webp.output.buffer, true, "WebP buffer encoder unavailable");
  return sharp;
}

export async function deriveArt() {
  const started = performance.now();
  const inputs = new Map();
  for (const [relative, expected] of Object.entries(masters)) {
    const bytes = await readFile(await checkedPath(relative));
    assert.equal(hash(bytes), expected, `Unexpected original hash: ${relative}`);
    assert.ok(chunks(bytes, "png").includes("caBX"), `Missing original credentials chunk: ${relative}`);
    inputs.set(relative, bytes);
  }
  for (const spec of derivatives) for (const file of spec.files) await checkedPath(file.output, true);
  const sharp = resolveEncoder("people");
  assert.deepEqual(resolveEncoder("agents").versions, sharp.versions, "Applications resolve different encoders");
  sharp.concurrency(1);
  sharp.cache(false);
  const sourceRecords = [];
  for (const [source, bytes] of inputs) {
    const metadata = await sharp(bytes).metadata();
    assert.ok(metadata.format === "png" && metadata.width === 1536 && metadata.height === 1024 &&
      metadata.space === "srgb" && metadata.channels === 3 && !metadata.hasAlpha && !metadata.orientation,
    `Unexpected original image: ${source}`);
    sourceRecords.push({ source, sha256: hash(bytes), bytes: bytes.length, width: metadata.width, height: metadata.height,
      colourspace: metadata.space, embeddedCredentials: "PNG caBX/JUMBF retained in original; not cryptographically verified" });
  }
  const pending = [];
  const records = [];
  for (const spec of derivatives) {
    const encodeStarted = performance.now();
    const bytes = await sharp(inputs.get(spec.files[0].source))
      .resize({ ...parameters.resize, width: spec.width, height: spec.height })
      .toColourspace(parameters.colourspace).webp(parameters.webp).toBuffer();
    const elapsedMs = Number((performance.now() - encodeStarted).toFixed(3));
    const metadata = await sharp(bytes).metadata();
    assert.ok(metadata.format === "webp" && metadata.width === spec.width && metadata.height === spec.height && !metadata.hasAlpha,
      "Unexpected derivative format or dimensions");
    assert.ok(bytes.length <= spec.budgetBytes, `${spec.files[0].output} exceeds budget (${bytes.length}/${spec.budgetBytes}); no candidate written`);
    const outputChunks = chunks(bytes, "webp");
    assert.ok(!outputChunks.some(chunk => ["caBX", "JUMB", "EXIF", "XMP "].includes(chunk)), "Unexpected embedded derivative credentials/metadata");
    for (const file of spec.files) {
      const filename = await checkedPath(file.output, true);
      try { assert.ok((await readFile(filename)).equals(bytes), `Existing derivative differs; refusing overwrite: ${file.output}`); }
      catch (error) { if (error.code !== "ENOENT") throw error; }
      pending.push({ filename, bytes });
      records.push({ source: file.source, sourceSha256: masters[file.source], output: file.output, sha256: hash(bytes),
        bytes: bytes.length, width: metadata.width, height: metadata.height, budgetBytes: spec.budgetBytes, elapsedMs,
        sharedEncode: spec.files.length > 1, chunks: outputChunks, embeddedCredentials: false });
    }
  }
  // All hashes, paths, metadata and budgets pass before any approved output exists.
  for (const { filename, bytes } of pending) {
    try { await writeFile(filename, bytes, { flag: "wx", mode: 0o644 }); }
    catch (error) { if (error.code !== "EEXIST") throw error; assert.ok((await readFile(filename)).equals(bytes), "Derivative changed before write"); }
  }
  for (const [source, expected] of Object.entries(masters)) assert.equal(hash(await readFile(await checkedPath(source))), expected);
  return {
    version: 1, method: "local deterministic resize/WebP codec derivation; no new artwork or network",
    encoder: sharp.versions, parameters, sources: sourceRecords, outputs: records,
    provenance: "Lossy derivatives omit embedded original credentials. Source/output hashes link the retained masters; this is not a C2PA signature or authenticity claim.",
    elapsedMs: Number((performance.now() - started).toFixed(3)),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    assert.equal(process.argv.length, 2, "derive-art accepts no arguments or custom paths; manifest is JSON stdout");
    console.log(JSON.stringify(await deriveArt(), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
