import { LaftelClient } from "./client.ts";
import type * as types from "./types.d.ts";
const env = {
  get: globalThis.Deno
    ? (key: string) => globalThis.Deno.env.get(key) // 예외처리하기
    : (key: string) => globalThis.process.env[key],
};

const client = new LaftelClient(env.get("LAFTEL_TOKEN"));

let res: types.EpisodeV2[] | types.ItemV3[] = await client.searchAnime(
  prompt("search anime:") || "",
  globalThis.process?.stdout?.rows || 9,
);
res.forEach((anime, index) => {
  console.log(index + 1, anime.name);
});
let idx = parseInt(prompt("select anime:") || "0") - 1; // TODO: 예외처리
res = await client.getEpisodes(res[idx].id);

res.forEach((episode, index) => {
  console.log(index + 1, episode.subject);
});
idx = parseInt(prompt("select anime:") || "0") - 1; // TODO: 예외처리

const episode = res[idx];
const downloadURL = await client.getMPDPath(episode);
console.log(downloadURL);
// https://mediacloud.laftel.net/2023/05/68373/v15/video/dash/stream.mpd
const process = Deno.run({
  cmd: [
    "bin/yt-dlp",
    "--allow-unplayable-formats",
    "-o",
    `${episode.id}.%(ext)s`,
    downloadURL,
  ],
  stdout: "piped",
  stderr: "piped",
});
const status = await process.status();
process.close();
