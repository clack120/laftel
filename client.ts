import type * as types from "./types";

export class LaftelClient {
  private headers: Record<string, string>;
  constructor(token?: string) {
    this.headers = {
      "User-Agent":
        "Mozilla/5.0 (compatible; Linux x86_64; Googlebot/0; +https://googlebot.com)",
      Accept: "application/json, */*",
      "Accept-Encoding": "gzip, deflate, br",
      Origin: "https://laftel.net",
      Referer: "https://laftel.net",
      "Referrer-Policy": "no-referrer",
      "Sec-GPG": "1",
      DNT: "1",
      //"Sec-Fetch-Dest": "empty",
      //"Sec-Fetch-Mode": "cors",
      //"Sec-Fetch-Site": "same-site",
      //TE: "trailers",
    };
    if (token)
      this.headers["Authorization"] = "Token " + token; // actually required to watch or download anime
    else console.warn("LaftelClient created without a Token.");
    // TODO: check if the token valid. (let's add it to option/parameter)
  }
  async searchAnime(
    query: string,
    size: number = 24,
    offset: number = 0,
  ): Promise<types.ItemV3[]> {
    const url = new URL(`https://api.laftel.net/api/search/v3/keyword/`);
    url.searchParams.set("keyword", query);
    url.searchParams.set("size", size.toString());
    url.searchParams.set("offset", offset.toString());
    //url.searchParams.set("viewing_only", "true");
    const res = await fetch(url, { headers: this.headers });
    const data = await res.json();
    return data["results"];
  }
  async getAnimeInfo(id: number): Promise<types.ItemV3> {
    const res = await fetch(`https://api.laftel.net/api/${id}/`, {
      headers: this.headers,
    });
    const data = await res.json();
    return data["results"];
  }
  async getEpisodes(id: number): Promise<types.EpisodeV2[]> {
    const res = await fetch(
      `https://api.laftel.net/api/episodes/v2/list/?item_id=${id}&sort=oldest&limit=1000&show_playback_offset=false&offset=0`,
      { headers: this.headers },
    );
    const data = await res.json();
    return data["results"];
  }
  async getEpisode(id: number): Promise<types.EpisodeV2> {
    const res = await fetch(`https://api.laftel.net/api/episodes/v2/${id}/`, {
      headers: this.headers,
    });
    return await res.json();
  }
}
// https://api.laftel.net/api/profiles/v1/my_profile/
// https://api.laftel.net/api/profiles/v1/${위에서의 ID}/token/
//
