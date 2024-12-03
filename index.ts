import { LaftelClient } from "./client.ts";
const env = {
  get: globalThis.Deno
    ? (key) => globalThis.Deno.env.get(key)
    : (key) => globalThis.process.env["key"],
};

let client = new LaftelClient();

let query = prompt("검색할 애니메이션:") || "null";
console.log(query);
let data = await client.searchAnime(query);
data.forEach((anime) => {
  console.log(anime.id, anime.name);
});
