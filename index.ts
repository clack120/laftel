import { LaftelClient } from "./client.ts";
// deno run --allow-net=api.laftel.net --allow-env=LAFTEL_TOKEN index.ts
const env = {
  get: globalThis.Deno
    ? (key: string) => globalThis.Deno.env.get(key)
    : (key: string) => globalThis.process.env[key],
};

const client = new LaftelClient(env.get("LAFTEL_TOKEN"));
client.setToken(null);

/* 나조차 보기 너무 드러운 코드
let query = prompt("검색할 애니메이션:") || "null"; // bun 쓰면 작동 안함(유니코드; 근데 리눅스에서는 됨)

let data = await client.searchAnime(
  query,
  Math.min(globalThis.process?.stdout?.rows - 1, 24),
);

data.forEach((anime, index) => {
  console.log(index + 1, anime.name);
});

let index: number | string = 'NaN';
while (!(parseInt(index) && index >= 1 && index <= data.length))
  index = prompt("애니메이션 고르셈:");
let anime = data[index - 1];
console.log(anime.id, anime.name, "에피소드 가져오는 중...");
let episodes = (await client.getEpisodes(anime.id)).sort(
  (a, b) => a.episode_order - b.episode_order,
);
episodes.forEach((episode, index) => {
  console.log(index + 1, `${episode.episode_num}화`, episode.subject);
});
index = null;
while (!(parseInt(index) && index >= 1 && index <= episodes.length))
  index = prompt("에피소드 고르셈:");

let episode = episodes[index - 1];
let mpd = await client.getMPDPath(episode);
console.log(
  episode,
  "아직 구현되지 않았습니다: yt-dlp --allow-unplayable-formats",
  mpd,
);
*/
