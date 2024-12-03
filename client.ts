import type * as types from "./types";

export class LaftelClient {
  private headers: Record<string, string>;
  constructor(token?: string) {
    this.headers = {
      "User-Agent":
        "Mozilla/5.0 (compatible; Googlebot/0; +https://googlebot.com)",
      "Referrer-Policy": "no-referrer",
      DNT: "1",
    };
    if (token)
      this.headers["Authorization"] = "Token " + token; // actually required
    else console.warn("LaftelClient created without a Token.");
    // TODO: check if the token valid. (let's add it to option/parameter)
  }
  async searchAnime(
    query: string,
    size: number = 24,
    offset: number = 0,
  ): Promise<ItemV3[]> {
    const url = new URL(`https://api.laftel.net/api/search/v3/keyword/`);
    url.searchParams.set("keyword", query);
    url.searchParams.set("size", size.toString());
    url.searchParams.set("offset", offset.toString());
    //url.searchParams.set("viewing_only", "true");
    const res = await fetch(url, { headers: this.headers });
    const data = await res.json();
    return data["results"];
  }
  async getAnimeInfo(id: number): Promise<any[]> {
    const res = await fetch(`https://api.laftel.net/api/${id}/`, {
      headers: this.headers,
    });
    const data = await res.json();
    return data["results"];
  }
  /** 에피소드 목록 쿼리
   * @param id 애니메이션 ID
   * @returns 애니메이션 ID에 대한 에피소드 목록
   */
  async getEpisodes(id: number): Promise<object[]> {
    const res = await fetch(
      `https://api.laftel.net/api/episodes/v2/list/?item_id=${id}&sort=oldest&limit=1000&show_playback_offset=false&offset=0`,
      { headers: this.headers },
    );
    const data = await res.json();
    return data["results"];
  }
}
