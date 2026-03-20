import { LaftelClient, getPssh } from "../src/mod.ts";
const client = new LaftelClient();
// client.setUserAgent();
console.log(await client.getAutocomplete("귀멸의")); // String[]
console.log(await client.search("귀멸의")); // Anime[]

const anime = await client.getAnime(44232);
console.log(anime); // "어차피, 사랑하고 만다. 2기"

const { items, total } = await client.getEpisodes(44232);
console.log(`Found ${total} episodes`);

console.log(await client.getEpisode(items[0].id));

await client.login("hello@example.net", "password"); // client.setToken("abcdef123");

let comment = await client.addComment(items[0].id, "재밌음");
//await client.editComment(comment?.id, "사실 아직 안봄");

let review = await client.addReview(anime.id, 4, "아직 안 봤는데 흥미롭네요.");
//await client.deleteReview(review.id);

const stream = await client.getStream(items[0].id);
const decryptResponse = await (
  await fetch("https://cdm-project.com/api/decrypt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pssh: getPssh(await (await fetch(stream.assets?.dash)).text()),
      licurl: "https://license.pallycon.com/ri/licenseManager.do",
      headers: {
        "pallycon-customdata-v2": stream.drm?.token,
        "User-Agent": "Mozilla/5.0",
        Origin: "https://laftel.net",
        Referer: "https://laftel.net/",
      },
    }),
  })
).json();
if (decryptResponse.status == "success") {
  let key = decryptResponse.message;
  key = key[key.length - 1];
  console.log(
    `mpv "ytdl://${stream.assets.dash}" --ytdl-raw-options=allow-unplayable-formats= --demuxer-lavf-o=decryption_key=${key.key}`,
  );
} else {
  console.log("fucked up", decryptResponse);
}