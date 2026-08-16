import { Laftel } from "../src/mod.ts";
import { fromStream, getLicenseInfo } from "../src/drm.ts";

const client = new Laftel();

// 설정 예:
// const client = new Laftel({
//   token: "your-token",          // 로그인 대신 토큰 직접
//   userAgent: "custom UA",       // 기본 = Googlebot UA (해외IP 우회)
//   headers: { "X-Foo": "bar" },  // 모든 요청에 머지
//   debug: true,                  // 요청/응답/헤더/바디 전부 stderr로 (토큰도 안 가림)
// });

// Deno:
//  const c = Deno.createHttpClient({ proxy: { url: "http://ip:port", basicAuth: { username, password } } });
//  const client = new Laftel({ fetch: (u, o) => fetch(u, { ...o, client: c }) });

// Bun:
//  const client = new Laftel({ fetch: (u, o) => fetch(u, { ...o, proxy: "http://user:pass@ip:port" }) });

const st = await client.status();
console.log("status", st.status, st.countryCode);

const disc = await client.search.discover({ sort: "rank", limit: 2 });
console.log(
  "discover",
  disc.count,
  disc.results.map((i) =>
    `${i.id}:${i.name} genres=${i.genres.join(",")} score=${i.score} thumb=${i.thumbnail?.slice(0, 40)}`
  ),
);

const item = await client.items.get(46208);
console.log(
  "item",
  item.id,
  item.name,
  "format",
  item.format,
  "series",
  item.seriesId,
  "age",
  item.ageRating,
  "adult",
  item.adult,
);

const eps = await client.episodes.list(46208, { limit: 2 });
console.log(
  "episodes",
  eps.count,
  eps.results.map((e) => `${e.episodeLabel}:${e.title} ${e.durationSeconds}s pub=${e.publishedAt?.toISOString()}`),
);

const ac = await client.search.autocomplete("귀멸");
console.log("autocomplete", ac.slice(0, 3));

const car = await client.home.carousels();
console.log("carousels", Array.isArray(car) ? car.length : car);

const prods = await client.store.products.list({ ottItemUid: item.uid, limit: 2 });
console.log("store products", prods.count, prods.results.map((p) => `${p.productNo}:${p.name} ₩${p.price}`));

const first = eps.results[0];
if (first) {
  const cc = await client.comments.count(first.id);
  console.log("comment count ep", first.id, "=", cc);
  const cl = await client.comments.list({ episodeId: first.id, limit: 2 });
  console.log("comments", cl.results.map((c) => `${c.author.name}: ${c.content?.slice(0, 20)} (likes ${c.likes})`));
}

const rv = await client.reviews.list(46208, { sort: "like" });
console.log("reviews", rv.results.slice(0, 2).map((r) => `${r.author?.name} ${r.score}: ${r.content?.slice(0, 20)}`));

try {
  const stream = await client.episodes.recentVideo(46208);
  if (!stream) {
    console.log("no recent video (로그인/시청이력 필요)");
  } else {
    console.log("stream drm?", stream.drm?.system, "dash?", !!stream.dash, "asset", stream.drm?.assetId);
    if (stream.drm) {
      const lic = await fromStream(client, stream);
      console.log("license", lic.system, "pssh?", lic.pssh?.slice(0, 24), "hdr", Object.keys(lic.licenseHeaders));
    }
  }
} catch (e) {
  console.log("drm skip:", (e as Error).message);
}
