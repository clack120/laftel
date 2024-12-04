import { LaftelClient } from "./client.ts";
// deno run --allow-net=api.laftel.net index.ts
const env = {
  get: globalThis.Deno
    ? (key) => globalThis.Deno.env.get(key)
    : (key) => globalThis.process.env["key"],
};

let client = new LaftelClient();

let query = prompt("검색할 애니메이션:") || "null";
let data = await client.searchAnime(query, 10);
data.forEach((anime) => {
  console.log(anime.id, anime.name);
});
