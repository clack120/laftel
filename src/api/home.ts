import type { Http } from "../http.ts";
import { mapPage } from "../paginate.ts";
import type { LiteralUnion, Paginated } from "../types.ts";
import { Item } from "../models.ts";
import type { RawCarousel, RawItemCard } from "../raw.ts";

/** 4hour=실시간, week=주간, quarter=분기, history=역대 */
export type RankingWindow = LiteralUnion<"4hour" | "week" | "quarter" | "history">;

export interface Carousel {
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
}

export interface Collection {
  name: string;
  key?: string;
  type?: string;
  sourceKey?: string;
  items: Item[];
}

interface RawCollection {
  name: string;
  collection_key?: string;
  collection_type?: string;
  source_key?: string;
  items: RawItemCard[];
}

export interface PanoramaSlide {
  image: string;
  itemId: number;
  ageRating?: number;
  externalUrl?: string | null;
}

export interface Panorama {
  id: number;
  name: string;
  items: PanoramaSlide[];
}

export class Home {
  constructor(private http: Http) {}

  async ranking(window: RankingWindow = "4hour"): Promise<Item[]> {
    const list = await this.http.get<RawItemCard[]>("home/v1/recommend/ranking/", {
      query: { type: window },
      anon: true,
    });
    return list.map((r) => new Item(r));
  }

  async rankingByGenre(): Promise<{ genre?: string; statisticsType?: string; items: Item[] }[]> {
    const list = await this.http.get<{ genre?: string; statistics_type?: string; item_list?: RawItemCard[] }[]>(
      "home/v1/recommend/ranking/genre/",
      { anon: true },
    );
    return list.map((g) => ({
      genre: g.genre,
      statisticsType: g.statistics_type,
      items: (g.item_list ?? []).map((c) => new Item(c)),
    }));
  }

  special(): Promise<unknown> {
    return this.http.get("home/v1/recommends/special/", { anon: true });
  }

  async carousels(): Promise<Carousel[]> {
    const list = await this.http.get<RawCarousel[]>("carousels/v2/list/", { anon: true });
    return list.map((r) => ({
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
    }));
  }

  async itemCollections(opts: { limit?: number; seed?: number; offset?: number } = {}): Promise<Paginated<Collection>> {
    const page = await this.http.get<Paginated<RawCollection>>("discovery/v1/item_collections/", {
      query: { ...opts },
      anon: true,
    });
    return mapPage(page, (r) => ({
      name: r.name,
      key: r.collection_key,
      type: r.collection_type,
      sourceKey: r.source_key,
      items: (r.items ?? []).map((c) => new Item(c)),
    }));
  }

  async panorama(): Promise<Panorama> {
    const r = await this.http.get<
      {
        id: number;
        name: string;
        items: { image: string; item_id: number; rating?: number; external_destination?: string | null }[];
      }
    >("discovery/v1/panorama_collection/", { anon: true });
    return {
      id: r.id,
      name: r.name,
      items: (r.items ?? []).map((s) => ({
        image: s.image,
        itemId: s.item_id,
        ageRating: s.rating,
        externalUrl: s.external_destination,
      })),
    };
  }
}
