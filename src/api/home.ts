import type { ApiOptions, Http } from "../http.ts";
import { mapPage } from "../paginate.ts";
import type { LiteralUnion, Paginated } from "../types.ts";
import { Item } from "../models.ts";
import type { RawCarousel, RawImage, RawItemCard, RawItemLike } from "../raw.ts";

export interface RawTheme {
  id: number;
  title: string;
  content: string;
  theme_item_list: {
    id: number;
    ment: string;
    item: RawItemLike;
    first_episode_id?: number;
    latest_episode_created?: string | null;
    [key: string]: unknown;
  }[];
  [key: string]: unknown;
}

export interface Theme {
  readonly raw: RawTheme;
  id: number;
  title: string;
  content: string;
  items: {
    readonly raw: RawTheme["theme_item_list"][number];
    id: number;
    note: string;
    item: Item;
    firstEpisodeId?: number;
  }[];
}

function toTheme(raw: RawTheme): Theme {
  return {
    raw,
    id: raw.id,
    title: raw.title,
    content: raw.content,
    items: raw.theme_item_list.map((entry) => ({
      raw: entry,
      id: entry.id,
      note: entry.ment,
      item: new Item(entry.item),
      firstEpisodeId: entry.first_episode_id,
    })),
  };
}

/** 4hour=실시간, week=주간, quarter=분기, history=역대 */
export type RankingWindow = LiteralUnion<"4hour" | "week" | "quarter" | "history">;

export interface Carousel {
  readonly raw: RawCarousel;
  id?: number;
  webImage?: string;
  mobileImage?: string;
  logoImage?: string;
  content?: string;
  label?: string;
  buttonText?: string;
  adult?: boolean;
  /** 클릭 시 이동할 작품 id */
  itemId?: number | null;
  /** 클릭 시 이동할 이벤트 id */
  eventId?: number | null;
  externalUrl?: string | null;
  webVideo?: RawCarousel["web_video"];
  mobileVideo?: RawCarousel["mobile_video"];
  /** Unnormalized theme destination. */
  themeDestination?: unknown;
}

export interface Collection {
  readonly raw: RawCollection;
  name: string;
  key?: string;
  type?: string;
  sourceKey?: string | number;
  items: Item[];
}

export interface RawCollection {
  name: string;
  collection_key?: string;
  collection_type?: string;
  source_key?: string | number;
  items: RawItemCard[];
  [key: string]: unknown;
}

export interface PanoramaSlide {
  readonly raw: RawPanorama["items"][number];
  image: string;
  itemId: number;
  ageRating?: number;
  externalUrl?: string | null;
}

export interface Panorama {
  readonly raw: RawPanorama;
  id: number;
  name: string;
  items: PanoramaSlide[];
}

export interface RawPanorama {
  id: number;
  name: string;
  items: {
    image: string;
    item_id: number;
    rating?: number;
    external_destination?: string | null;
    [key: string]: unknown;
  }[];
  [key: string]: unknown;
}

export interface ThemeSummaryV1 {
  id: number;
  title: string;
  content: string;
  img_url_list: string[];
  [key: string]: unknown;
}

export interface ThemeSummaryV2 {
  id: number;
  title: string;
  content: string;
  images: RawImage[];
  [key: string]: unknown;
}

export class Home {
  constructor(private http: Http) {}

  async ranking(window: RankingWindow = "4hour", opts: ApiOptions = {}): Promise<Item[]> {
    const list = await this.http.get<RawItemCard[]>("home/v1/recommend/ranking/", {
      query: { type: window },
      anon: opts.anon ?? this.http.anon ?? true,
      signal: opts.signal,
    });
    return list.map((r) => new Item(r));
  }

  async rankingByGenre(opts: ApiOptions = {}): Promise<{ genre?: string; statisticsType?: string; items: Item[] }[]> {
    const list = await this.http.get<{ genre?: string; statistics_type?: string; item_list?: RawItemCard[] }[]>(
      "home/v1/recommend/ranking/genre/",
      { ...opts, anon: opts.anon ?? this.http.anon ?? true },
    );
    return list.map((g) => ({
      genre: g.genre,
      statisticsType: g.statistics_type,
      items: (g.item_list ?? []).map((c) => new Item(c)),
    }));
  }

  special(opts: ApiOptions = {}): Promise<unknown> {
    return this.http.get("home/v1/recommends/special/", { ...opts, anon: opts.anon ?? this.http.anon ?? true });
  }

  /** v2 raw summaries use structured images; v1 uses img_url_list instead. */
  themeSummaries(opts: ApiOptions & { limit?: number; offset?: number } = {}): Promise<Paginated<ThemeSummaryV2>> {
    return this.http.get("recommends/v2/themes_summary/", {
      query: { limit: opts.limit, offset: opts.offset },
      anon: opts.anon ?? this.http.anon ?? true,
      signal: opts.signal,
    });
  }

  /** Theme-summary v1 contract; image fields depend on the source response. */
  themeSummariesV1(opts: ApiOptions & { limit?: number; offset?: number } = {}): Promise<Paginated<ThemeSummaryV1>> {
    return this.http.get("recommends/v1/themes_summary/", {
      query: { limit: opts.limit, offset: opts.offset },
      anon: opts.anon ?? this.http.anon ?? true,
      signal: opts.signal,
    });
  }

  /** Theme-detail v2 contract; item fields depend on the source response. */
  async theme(id: number, opts: ApiOptions = {}): Promise<Theme> {
    return toTheme(
      await this.http.get<RawTheme>(`recommends/v2/themes/${id}/`, {
        ...opts,
        anon: opts.anon ?? this.http.anon ?? true,
      }),
    );
  }

  /** Theme-detail v1 contract; its item projection is independent of theme(). */
  async themeV1(id: number, opts: ApiOptions = {}): Promise<Theme> {
    return toTheme(
      await this.http.get<RawTheme>(`recommends/v1/themes/${id}/`, {
        ...opts,
        anon: opts.anon ?? this.http.anon ?? true,
      }),
    );
  }

  async carousels(opts: ApiOptions = {}): Promise<Carousel[]> {
    const list = await this.http.get<RawCarousel[]>("carousels/v2/list/", {
      ...opts,
      anon: opts.anon ?? this.http.anon ?? true,
    });
    return list.map((r) => ({
      raw: r,
      id: r.id,
      webImage: r.web_img,
      mobileImage: r.mobile_img,
      logoImage: r.logo_img,
      content: r.content,
      label: r.label,
      buttonText: r.button_text,
      adult: r.is_adult,
      itemId: r.item_destination,
      eventId: r.event_destination,
      externalUrl: r.external_destination,
      webVideo: r.web_video,
      mobileVideo: r.mobile_video,
      themeDestination: r.theme_destination,
    }));
  }

  async itemCollections(
    opts: ApiOptions & { limit?: number; seed?: number; offset?: number } = {},
  ): Promise<Paginated<Collection>> {
    const page = await this.http.get<Paginated<RawCollection>>("discovery/v1/item_collections/", {
      query: { limit: opts.limit, seed: opts.seed, offset: opts.offset },
      anon: opts.anon ?? this.http.anon ?? true,
      signal: opts.signal,
    });
    return mapPage(page, (r) => ({
      raw: r,
      name: r.name,
      key: r.collection_key,
      type: r.collection_type,
      sourceKey: r.source_key,
      items: r.items.map((c) => new Item(c)),
    }));
  }

  async panorama(opts: ApiOptions = {}): Promise<Panorama | null> {
    const r = await this.http.get<RawPanorama | null>("discovery/v1/panorama_collection/", {
      ...opts,
      anon: opts.anon ?? this.http.anon ?? true,
    });
    if (!r) return null;
    return {
      raw: r,
      id: r.id,
      name: r.name,
      items: r.items.map((s) => ({
        raw: s,
        image: s.image,
        itemId: s.item_id,
        ageRating: s.rating,
        externalUrl: s.external_destination,
      })),
    };
  }
}
