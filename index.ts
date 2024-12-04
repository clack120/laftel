import { LaftelClient } from "./client.ts";
const env = {
  get: globalThis.Deno
    ? (key: string) => globalThis.Deno.env.get(key) // 예외처리하기
    : (key: string) => globalThis.process.env[key],
};

const client = new LaftelClient(env.get("LAFTEL_TOKEN"));
