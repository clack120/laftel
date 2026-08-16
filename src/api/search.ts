import type { Http } from "../http.ts";
import { mapPage } from "../paginate.ts";
import { Item } from "../models.ts";
import type { LiteralUnion, Paginated } from "../types.ts";
import type { RawItemCard } from "../raw.ts";
import type { AnimeYear, Genre, Medium, Tag } from "../constants.ts";

// rank=인기, recent=신작, update=업데이트, cnt_eval=리뷰많은순, avg_rating=별점높은순
export type DiscoverSort = LiteralUnion<
  "rank" | "recent" | "update" | "cnt_eval" | "avg_rating"
>;

export interface Filter<T> {
  include?: T[];
  exclude?: T[];
}

export interface DiscoverOptions {
  sort?: DiscoverSort;
  genres?: Filter<Genre>;
  tags?: Filter<Tag>;
  years?: AnimeYear[];
  format?: Medium;
  completed?: boolean;
  svod?: boolean;
  viewable?: boolean;
  offset?: number;
  limit?: number;
}

export class Search {
  constructor(private http: Http) {}

  async discover(opts: DiscoverOptions = {}): Promise<Paginated<Item>> {
    const page = await this.http.get<Paginated<RawItemCard>>("search/v1/discover/", {
      query: {
        sort: opts.sort ?? "rank",
        genres: opts.genres?.include,
        exclude_genres: opts.genres?.exclude,
        tags: opts.tags?.include,
        exclude_tags: opts.tags?.exclude,
        years: opts.years,
        medium: opts.format,
        ending: opts.completed,
        svod: opts.svod,
        viewable: opts.viewable,
        offset: opts.offset,
        size: opts.limit,
      },
      anon: true,
    });
    return mapPage(page, (r) => new Item(r));
  }

  autocomplete(keyword: string): Promise<string[]> {
    return this.http.get<string[]>("search/v1/auto_complete/", { query: { keyword }, anon: true });
  }

  async keyword(
    keyword: string,
    opts: { viewable?: boolean; offset?: number } = {},
  ): Promise<Paginated<Item>> {
    const page = await this.http.get<Paginated<RawItemCard>>("search/v3/keyword/", {
      query: { keyword, viewing_only: opts.viewable, offset: opts.offset },
      anon: true,
    });
    return mapPage(page, (r) => new Item(r));
  }

  async dailyNewReleases(): Promise<Item[]> {
    const list = await this.http.get<RawItemCard[]>("search/v2/daily/", { anon: true });
    return list.map((r) => new Item(r));
  }
}
