#!/usr/bin/env -S deno run --allow-net=0.0.0.0:8791,api.laftel.net,store-api.laftel.net,mediacloud.laftel.net,thumbnail.laftel.net,license.pallycon.com --allow-read=example,dist
// repo 루트에서 ./example/proxy.ts (또는 deno task web). http://localhost:8791
// same-origin 프록시: 정적(web + dist) 서빙 + /proxy/<host>/... 포워딩으로 브라우저 CORS 회피.
import { USER_AGENT } from "../src/version.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const TYPES: Record<string, string> = {
  html: "text/html",
  js: "text/javascript",
  css: "text/css",
  json: "application/json",
};

async function serveFile(path: string): Promise<Response> {
  try {
    const body = await Deno.readFile(ROOT + path);
    const ext = path.split(".").pop() ?? "";
    return new Response(body, { headers: { "content-type": TYPES[ext] ?? "application/octet-stream" } });
  } catch {
    return new Response("not found: " + path, { status: 404 });
  }
}

Deno.serve({ port: 8791 }, async (req) => {
  const url = new URL(req.url);
  const p = url.pathname;

  if (p.startsWith("/proxy/")) {
    const target = "https://" + p.slice("/proxy/".length) + url.search;
    const headers = new Headers(req.headers);
    headers.set("User-Agent", USER_AGENT);
    headers.delete("host");
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer(),
    });
    const out = new Headers(upstream.headers);
    out.set("access-control-allow-origin", "*");
    return new Response(upstream.body, { status: upstream.status, headers: out });
  }

  if (p === "/") return serveFile("/example/web/index.html");
  if (p.startsWith("/dist/") || p.startsWith("/example/")) return serveFile(p);
  return new Response("not found", { status: 404 });
});

console.log("laftel demo: http://localhost:8791  (build dist first: npx tsc)");
