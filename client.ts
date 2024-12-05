import type * as types from "./types.d.ts";
const BASE_URL = "https://api.laftel.net/api";

export class LaftelClient {
  private headers: Record<string, string> = {};
  constructor(token?: string) {
    this.headers = {
      "User-Agent":
        "Mozilla/5.0 (compatible; Linux x86_64; Google  bot/0; +https://googlebot.com)",
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

  private async fetchData<T>(url: string): Promise<T> {
    const res = await fetch(url, { headers: this.headers });
    if (!res.ok) throw new Error(`Failed to fetch: ${url}`);
    const data = await res.json();
    return data.results;
  }

  setHeader(key: string, value: string): Boolean {
    if (key == "Authorization") return false;
    this.headers[key] = value;
    return true;
  }
  getHeader(key?: string): string | Record<string, string> {
    if (key) return this.headers[key];
    return this.headers;
  }
  setToken(token: string | null) {
    if (token) this.headers["Authorization"] = "Token " + token;
    else delete this.headers["Authorization"];
  }

  async searchAnime(
    query: string,
    size = 24,
    offset = 0,
  ): Promise<types.ItemV3[]> {
    const url = new URL(`${BASE_URL}/search/v3/keyword/`);
    url.searchParams.set("keyword", query);
    url.searchParams.set("size", size.toString());
    url.searchParams.set("offset", offset.toString());
    return await this.fetchData(url.toString());
  }

  async getAnimeInfo(id: number): Promise<types.ItemV3> {
    return await this.fetchData(`${BASE_URL}/${id}/`);
  }

  async getEpisodes(id: number): Promise<types.EpisodeV2[]> {
    return await this.fetchData(
      `${BASE_URL}/episodes/v2/list/?item_id=${id}&sort=oldest&limit=1000&show_playback_offset=false&offset=0`,
    );
  }

  async getEpisode(id: number): Promise<types.EpisodeV2> {
    return await this.fetchData(`${BASE_URL}/episodes/v2/${id}/`);
  }

  async getMPDPath(episode: number | types.EpisodeV2): Promise<string> {
    if (typeof episode === "number") episode = await this.getEpisode(episode);

    const { thumbnail_path, published_datetime, id } = episode;
    if (thumbnail_path.includes("/v15/Thumbnail.")) {
      const path = thumbnail_path.substring(
        thumbnail_path.indexOf("s/") + 2,
        thumbnail_path.indexOf("/v"),
      );
      return `https://mediacloud.laftel.net/${path}/v15/video/dash/stream.mpd`;
    } else {
      const date = new Date(published_datetime);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      return `https://mediacloud.laftel.net/${year}/${month}/${id}/v15/video/dash/stream.mpd`;
    }
  }

  async getStream(episode: number | types.EpisodeV2) {
    if (typeof episode === "number") episode = await this.getEpisode(episode);

    const { id } = episode;
    const stream: types.StreamingInfoV2 = await this.fetchData(
      `https://api.laftel.net/api/episodes/v2/${id}/video/?device=Web`,
    );
    return stream;
  }

  async downloadEpisode(id: number) {
    return "/";
  }
}

// https://api.laftel.net/api/profiles/v1/my_profile/
// https://api.laftel.net/api/profiles/v1/${위의 res의 id}/token/
