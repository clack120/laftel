import type { ApiOptions, Http } from "../http.ts";
import { mapPage } from "../paginate.ts";
import { CatalogItem, Item } from "../models.ts";
import { kst } from "../normalize.ts";
import type { LiteralUnion, Paginated } from "../types.ts";
import type {
  RawItem,
  RawItemCard,
  RawItemRequest,
  RawItemStatistics,
  RawItemUserState,
  RawItemV1,
  RawItemV2,
  RawItemV3,
  RawPlayHistoryEntry,
} from "../raw.ts";
import { type PlayHistoryEntry, toPlayHistory } from "./users.ts";

export interface PageOptions extends ApiOptions {
  offset?: number;
  limit?: number;
}

export interface ItemMark {
  wish: boolean;
  hate: boolean;
}

export type PurchaseType = LiteralUnion<"buy" | "rent">;

/** rank=인기순, view=조회순 */
export type FinishedSort = LiteralUnion<"rank" | "view">;
/** add=담은순, rank=인기순, recent=최신순 */
export type WishSort = LiteralUnion<"add" | "rank" | "recent">;

export interface WishedItem extends Item {
  readonly wishId: number;
}

export interface Purchasability {
  purchasable?: boolean;
  purchaseType?: PurchaseType;
}

export interface ItemStatistics {
  averageScore: number;
  ratingCount: number;
  /**
   * 별점 0.5 ~ 5.0점 구간별 개수
   * @example scoreHistogram[0] // 0.5점 준 사람 수
   * @example scoreHistogram[9] // 5.0점 준 사람 수
   */
  scoreHistogram: number[];
}

export interface ItemUserState {
  continueEpisodeId: number | null;
  wished: boolean;
  hated: boolean;
}

export interface ItemRequest {
  id: number;
  active: boolean;
  itemId: number;
  userId: number;
  createdAt: Date | null;
  modifiedAt: Date | null;
}

const toItemRequest = (r: RawItemRequest): ItemRequest => ({
  id: r.id,
  active: r.status,
  itemId: r.item,
  userId: r.user,
  createdAt: kst(r.created),
  modifiedAt: kst(r.modified),
});

export class Items {
  constructor(private http: Http) {}

  /** Catalog-detail v1 contract with nested animation, metadata and publishing documents. */
  async getV1(id: number, opts: ApiOptions = {}): Promise<CatalogItem> {
    return new CatalogItem(
      await this.http.get<RawItemV1>(`items/v1/${id}/`, {
        anon: opts.anon ?? this.http.anon ?? true,
        signal: opts.signal,
      }),
    );
  }

  /** Item-detail v4 contract; fields can change independently of other detail contracts. */
  async get(id: number, opts: ApiOptions = {}): Promise<Item<RawItem>> {
    return new Item(
      await this.http.get<RawItem>(`items/v4/${id}/`, {
        anon: opts.anon ?? this.http.anon ?? true,
        signal: opts.signal,
      }),
    );
  }

  /** Item-detail v2 contract; inspect raw when choosing a source for a field. */
  async getV2(id: number, opts: ApiOptions = {}): Promise<Item<RawItemV2>> {
    return new Item(
      await this.http.get<RawItemV2>(`items/v2/${id}/`, {
        anon: opts.anon ?? this.http.anon ?? true,
        signal: opts.signal,
      }),
    );
  }

  /** Item-detail v3 contract; it does not substitute for another detail contract. */
  async getV3(id: number, opts: ApiOptions = {}): Promise<Item<RawItemV3>> {
    return new Item(
      await this.http.get<RawItemV3>(`items/v3/${id}/`, {
        anon: opts.anon ?? this.http.anon ?? true,
        signal: opts.signal,
      }),
    );
  }

  async statistics(id: number, opts: ApiOptions = {}): Promise<ItemStatistics> {
    const r = await this.http.get<RawItemStatistics>(`items/v1/${id}/statistics/`, {
      anon: opts.anon ?? this.http.anon ?? true,
      signal: opts.signal,
    });
    return {
      averageScore: Number(r.average_score),
      ratingCount: r.count_score,
      scoreHistogram: [
        r.count_score_05,
        r.count_score_10,
        r.count_score_15,
        r.count_score_20,
        r.count_score_25,
        r.count_score_30,
        r.count_score_35,
        r.count_score_40,
        r.count_score_45,
        r.count_score_50,
      ],
    };
  }

  /** An item's seriesId can refer here even when upstream omits it from these results. */
  async series(seriesId: number, opts: PageOptions = {}): Promise<Paginated<Item>> {
    const page = await this.http.get<Paginated<RawItemCard>>(`items/v2/series/${seriesId}/`, {
      query: { offset: opts.offset, limit: opts.limit },
      anon: opts.anon ?? this.http.anon ?? true,
      signal: opts.signal,
    });
    return mapPage(page, (r) => new Item(r));
  }

  async related(id: number, opts: PageOptions = {}): Promise<Paginated<Item>> {
    const page = await this.http.get<Paginated<RawItemCard>>(`items/v2/${id}/related/`, {
      query: { offset: opts.offset, limit: opts.limit },
      anon: opts.anon ?? this.http.anon ?? true,
      signal: opts.signal,
    });
    return mapPage(page, (r) => new Item(r));
  }

  allRelated(id: number, opts: ApiOptions = {}): Promise<unknown> {
    if (!Number.isSafeInteger(id) || id <= 0) throw new TypeError("item ID must be a positive safe integer");
    return this.http.get(`items/v1/${id}/all_related/`, {
      anon: opts.anon ?? this.http.anon ?? true,
      signal: opts.signal,
    });
  }

  async hot(opts: ApiOptions = {}): Promise<Paginated<Item>> {
    const page = await this.http.get<Paginated<RawItemCard>>("items/v1/hot/", {
      ...opts,
      anon: opts.anon ?? this.http.anon ?? true,
    });
    return mapPage(page, (r) => new Item(r));
  }

  /** 내 정주행 완료작 목록 */
  async finished(opts: PageOptions & { sort?: FinishedSort } = {}): Promise<Paginated<Item>> {
    const page = await this.http.get<Paginated<RawItemCard>>("items/v1/finished/", {
      query: { offset: opts.offset, limit: opts.limit, sorting: opts.sort },
      anon: opts.anon,
      signal: opts.signal,
    });
    return mapPage(page, (r) => new Item(r));
  }

  async purchasable(itemId: number, opts: ApiOptions = {}): Promise<Purchasability> {
    const r = await this.http.get<{ purchasable?: boolean; purchase_type?: string }>("items/v1/purchasable/", {
      query: { item_id: itemId },
      signal: opts.signal,
      anon: opts.anon ?? this.http.anon ?? true,
    });
    return { purchasable: r.purchasable, purchaseType: r.purchase_type };
  }

  async userState(id: number): Promise<ItemUserState> {
    const r = await this.http.get<RawItemUserState>(`items/v3/${id}/user/`);
    return { continueEpisodeId: r.continue_episode_id, wished: r.is_wish, hated: r.is_hate };
  }

  async wishItems(
    opts: ApiOptions & { sort?: WishSort; offset?: number; limit?: number } = {},
  ): Promise<Paginated<WishedItem>> {
    const page = await this.http.get<Paginated<{ id: number; item: RawItemCard }>>("items/v1/wish_item/", {
      query: { sorting: opts.sort, offset: opts.offset, limit: opts.limit },
      anon: opts.anon,
      signal: opts.signal,
    });
    return mapPage(page, (r) => Object.assign(new Item(r.item), { wishId: r.id }));
  }

  deleteWishItems(wishIds: number[]): Promise<void> {
    return this.http.post("items/v1/wish_items/delete/", { body: { ids: wishIds } });
  }

  /** 플레이어 페이지의 "이어보기" 레일: 진행 중인 다른 작품들(작품+마지막 시청 화). */
  async otherContinueWatching(itemId: number): Promise<PlayHistoryEntry[]> {
    const r = await this.http.get<{ results?: RawPlayHistoryEntry[] }>(`items/v1/${itemId}/continued/`);
    return (r.results ?? []).map(toPlayHistory);
  }

  clearRecentVideo(itemId: number): Promise<void> {
    return this.http.del(`items/v1/${itemId}/recent-video/`);
  }

  // rate 응답은 갱신된 상태를 돌려줌. (un)wish/hate는 그걸 정규화해 반환(성공 여부는 throw로 판별).
  private async rate(id: number, body: { is_wish?: boolean; is_hate?: boolean }): Promise<ItemMark> {
    const r = await this.http.post<{ is_wish?: boolean | null; is_hate?: boolean | null }>(`v1.0/items/${id}/rate/`, {
      body,
    });
    return { wish: r.is_wish ?? false, hate: r.is_hate ?? false };
  }

  wish(id: number): Promise<ItemMark> {
    return this.rate(id, { is_wish: true });
  }

  unwish(id: number): Promise<ItemMark> {
    return this.rate(id, { is_wish: false });
  }

  hate(id: number): Promise<ItemMark> {
    return this.rate(id, { is_hate: true });
  }

  unhate(id: number): Promise<ItemMark> {
    return this.rate(id, { is_hate: false });
  }

  async requestItem(id: number): Promise<ItemRequest> {
    return toItemRequest(await this.http.post<RawItemRequest>(`v1.0/items/${id}/request/`, { body: {} }));
  }

  // 요청 이력 없으면 204 -> null.
  async requestStatus(id: number): Promise<ItemRequest | null> {
    const r = await this.http.get<RawItemRequest | null>(`v1.0/items/${id}/request/`);
    return r ? toItemRequest(r) : null;
  }

  cancelRequest(id: number): Promise<void> {
    return this.http.del(`v1.0/items/${id}/request/`);
  }
}
