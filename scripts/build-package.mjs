import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const mode = process.argv[2];
if (mode !== "npm" && mode !== "jsr") throw new Error("usage: build-package.mjs npm|jsr");

const packageConfig = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));
const denoConfig = JSON.parse(readFileSync(new URL("deno.json", root), "utf8"));
const sourceVersion = readFileSync(new URL("src/version.ts", root), "utf8")
  .match(/export const VERSION = "([^"]+)"/)?.[1];
const version = packageConfig.version;
if (!version || denoConfig.version !== version || sourceVersion !== version) {
  throw new Error("package.json, deno.json, and src/version.ts versions must match");
}

const suppliedCommit = process.env.LAFTEL_GIT_COMMIT?.trim();
const commit = (suppliedCommit || execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: fileURLToPath(root),
  encoding: "utf8",
}).trim()).slice(0, 7).toLowerCase();
if (!/^[0-9a-f]{7}$/.test(commit)) throw new Error("LAFTEL_GIT_COMMIT must be a Git commit hash");

function stamp(target) {
  const sentinel = "__LAFTEL_GIT_COMMIT__";
  const source = readFileSync(target, "utf8");
  if (source.split(sentinel).length !== 2) {
    throw new Error(`version sentinel missing or repeated in ${target.pathname}`);
  }
  writeFileSync(target, source.replace(sentinel, commit));
}

if (mode === "npm") {
  const target = new URL("dist/", root);
  rmSync(target, { recursive: true, force: true });
  execFileSync(process.execPath, [fileURLToPath(new URL("node_modules/typescript/bin/tsc", root))], {
    cwd: fileURLToPath(root),
    stdio: "inherit",
  });
  stamp(new URL("version.js", target));
} else {
  const target = new URL("build/jsr/", root);
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  cpSync(new URL("src/", root), new URL("src/", target), { recursive: true });
  cpSync(new URL("LICENSE", root), new URL("LICENSE", target));
  writeFileSync(new URL("deno.json", target), `${JSON.stringify(denoConfig, null, 2)}\n`);
  stamp(new URL("src/version.ts", target));
}

console.log(`laftel: built ${mode} ${version}+g${commit}`);
