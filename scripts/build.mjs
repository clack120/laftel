import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);

const packageConfig = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));
const denoConfig = JSON.parse(readFileSync(new URL("deno.json", root), "utf8"));
const sourceVersion = readFileSync(new URL("src/version.ts", root), "utf8")
  .match(/export const VERSION = "([^"]+)"/)?.[1];
const version = packageConfig.version;
if (!version || denoConfig.version !== version || sourceVersion !== version) {
  throw new Error("package.json, deno.json, and src/version.ts versions must match");
}

function git(...args) {
  try {
    return execFileSync("git", args, {
      cwd: fileURLToPath(root),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

const commit = (process.env.LAFTEL_GIT_COMMIT?.trim() || git("rev-parse", "HEAD")).toLowerCase();
if (commit && !/^[0-9a-f]{7,40}$/.test(commit)) throw new Error("LAFTEL_GIT_COMMIT must be a Git commit hash");
const dirty = !!commit && !!git("status", "--porcelain", "--untracked-files=normal");
const revision = commit ? `${commit.slice(0, 7)}${dirty ? ".dirty" : ""}` : "";

function stamp(target) {
  const sentinel = "__LAFTEL_GIT_REVISION__";
  const source = readFileSync(target, "utf8");
  if (source.split(sentinel).length !== 2) {
    throw new Error(`version sentinel missing or repeated in ${target.pathname}`);
  }
  writeFileSync(target, source.replace(sentinel, revision));
}

const dist = new URL("dist/", root);
const jsr = new URL("build/jsr/", root);
rmSync(dist, { recursive: true, force: true });
rmSync(jsr, { recursive: true, force: true });
execFileSync(process.execPath, [fileURLToPath(new URL("node_modules/typescript/bin/tsc", root))], {
  cwd: fileURLToPath(root),
  stdio: "inherit",
});
stamp(new URL("version.js", dist));

mkdirSync(jsr, { recursive: true });
cpSync(new URL("src/", root), new URL("src/", jsr), { recursive: true });
cpSync(new URL("LICENSE", root), new URL("LICENSE", jsr));
cpSync(new URL("README.md", root), new URL("README.md", jsr));
const { name, license, exports, publish } = denoConfig;
writeFileSync(new URL("deno.json", jsr), `${JSON.stringify({ name, version, license, exports, publish }, null, 2)}\n`);
stamp(new URL("src/version.ts", jsr));

console.log(`laftel: built ${version}${revision ? `+${revision}` : ""} (npm + jsr)`);
