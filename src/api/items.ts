import type { Http } from "../http.ts";
import { mapPage } from "../paginate.ts";
import { Item } from "../models.ts";
import { kst } from "../normalize.ts";
import type { LiteralUnion, Paginated } from "../types.ts";
import type {
  RawItem,
  RawItemCard,
  RawItemRequest,
  RawItemStatistics,
  RawItemUserState,
  RawPlayHistoryEntry,
} from "../raw.ts";
import { type PlayHistoryEntry, toPlayHistory } from "./users.ts";

export interface PageOptions {
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
  itemId: number;
  userId: number;
  createdAt: Date | null;
  modifiedAt: Date | null;
}

const toItemRequest = (r: RawItemRequest): ItemRequest => ({
  id: r.id,
  itemId: r.item,
  userId: r.user,
  createdAt: kst(r.created),
  modifiedAt: kst(r.modified),
});

export class Items {
  constructor(private http: Http) {}

  async get(id: number): Promise<Item> {
    return new Item(await this.http.get<RawItem>(`items/v4/${id}/`, { anon: true }));
  }

  async statistics(id: number): Promise<ItemStatistics> {
    const r = await this.http.get<RawItemStatistics>(`items/v1/${id}/statistics/`, { anon: true });
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

  async series(seriesId: number, opts: PageOptions = {}): Promise<Paginated<Item>> {
    const page = await this.http.get<Paginated<RawItemCard>>(`items/v2/series/${seriesId}/`, {
      query: { ...opts },
      anon: true,
    });
    return mapPage(page, (r) => new Item(r));
  }

  async related(id: number, opts: PageOptions = {}): Promise<Paginated<Item>> {
    const page = await this.http.get<Paginated<RawItemCard>>(`items/v2/${id}/related/`, {
      query: { ...opts },
      anon: true,
    });
    return mapPage(page, (r) => new Item(r));
  }

  async hot(): Promise<Paginated<Item>> {
    const page = await this.http.get<Paginated<RawItemCard>>("items/v1/hot/", { anon: true });
    return mapPage(page, (r) => new Item(r));
  }

  /** 내 정주행 완료작 목록 */
  async finished(opts: PageOptions & { sort?: FinishedSort } = {}): Promise<Paginated<Item>> {
    const page = await this.http.get<Paginated<RawItemCard>>("items/v1/finished/", {
      query: { offset: opts.offset, limit: opts.limit, sorting: opts.sort },
    });
    return mapPage(page, (r) => new Item(r));
  }

  async purchasable(itemId: number): Promise<Purchasability> {
    const r = await this.http.get<{ purchasable?: boolean; purchase_type?: string }>("items/v1/purchasable/", {
      query: { item_id: itemId },
      anon: true,
    });
    return { purchasable: r.purchasable, purchaseType: r.purchase_type };
  }

  async userState(id: number): Promise<ItemUserState> {
    const r = await this.http.get<RawItemUserState>(`items/v3/${id}/user/`);
    return { continueEpisodeId: r.continue_episode_id, wished: r.is_wish, hated: r.is_hate };
  }

  // 각 결과는 위시 항목 래퍼(작품 카드는 .item에 중첩). 카드만 꺼내 반환.
  async wishItems(opts: { sort?: WishSort; offset?: number } = {}): Promise<Paginated<Item>> {
    const page = await this.http.get<Paginated<{ item: RawItemCard }>>("items/v1/wish_item/", {
      query: { sorting: opts.sort, offset: opts.offset },
    });
    return mapPage(page, (r) => new Item(r.item));
  }

  deleteWishItems(ids: number[]): Promise<void> {
    return this.http.post("items/v1/wish_items/delete/", { body: { ids } });
  }

  /** 플레이어 페이지의 "이어보기" 레일: 진행 중인 다른 작품들(작품+마지막 시청 화). */
  async otherContinueWatching(itemId: number): Promise<PlayHistoryEntry[]> {
    const r = await this.http.get<{ results?: RawPlayHistoryEntry[] }>(`items/v1/${itemId}/continued/`);
    return (r.results ?? []).map(toPlayHistory);
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
