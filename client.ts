export class LaftelClient {
  private headers: Record<string, string>;
  constructor(token?: string) {
    this.headers = {
      "User-Agent":
        "Mozilla/5.0 (compatible; Googlebot/0; +https://googlebot.com)",
      "Referrer-Policy": "no-referrer",
      DNT: "1",
    };
    if (token) this.headers["Authorization"] = "Token " + token;
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
    url.searchParams.set("viewing_only", "true");
    const res = await fetch(url, { headers: this.headers });
    const data = await res.json();
    return data["results"];
  }
  async getEpisodes(id: number): Promise<any[]> {
    const res = await fetch(`https://api.laftel.net/api/${id}/`, {
      headers: this.headers,
    });
    const data = await res.json();
    return data["results"];
  }
}
