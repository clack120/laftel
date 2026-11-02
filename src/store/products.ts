import type { ApiOptions, Http } from "../http.ts";
import { mapPage } from "../paginate.ts";
import type { LiteralUnion, Paginated } from "../types.ts";
import type { RawStoreProduct } from "../raw.ts";

export type StoreSort = LiteralUnion<"LATEST" | "POPULAR">;

export interface StoreProductListOptions extends ApiOptions {
  /** Item.uid from the main API, not the numeric item ID. */
  ottItemUid?: string;
  classificationId?: number;
  sort?: StoreSort;
  offset?: number;
  limit?: number;
}

export type StoreProductRequestOptions = ApiOptions;

function positiveId(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) throw new TypeError("ID must be a positive safe integer");
  return value;
}

export interface StoreClassificationRef {
  id: number;
  code: string;
  name: string;
}

export interface StoreProductBadge {
  code: string;
  text: string;
  backgroundColor?: string;
  color?: string;
  icon?: string | null;
}

export interface StoreItemBanner {
  productNo: number;
  ottItemId: number;
}

export class StoreProduct {
  constructor(readonly raw: RawStoreProduct) {}

  /** 위시리스트/구매가능 조회 등에 쓰는 상품 id */
  get productNo(): number {
    return this.raw.product_no;
  }
  get productId(): number {
    return this.raw.product_id;
  }
  /** 주문서(order sheet) 생성에 쓰는 상품 코드 */
  get code(): string | undefined {
    return this.raw.product_code;
  }
  get name(): string | undefined {
    return this.raw.product_name;
  }
  get thumbnail(): string | undefined {
    return this.raw.thumbnail_url;
  }
  get smallImage(): string | undefined {
    return this.raw.small_image_url;
  }
  get mediumImage(): string | undefined {
    return this.raw.medium_image_url;
  }
  /** 판매가 */
  get price(): number | undefined {
    return this.raw.price;
  }
  get supplyPrice(): number | undefined {
    return this.raw.supply_price;
  }
  get discountRate(): number | undefined {
    return this.raw.discount_rate;
  }
  get displayed(): boolean | undefined {
    return this.raw.is_displayed;
  }
  get selling(): boolean | undefined {
    return this.raw.is_selling;
  }
  get soldOut(): boolean | undefined {
    return this.raw.is_sold_out;
  }
  get isNew(): boolean | undefined {
    return this.raw.is_new_product;
  }
  get type(): string | undefined {
    return this.raw.product_type;
  }
  get classification(): StoreClassificationRef | undefined {
    return this.raw.classification;
  }
  get badges(): StoreProductBadge[] {
    return (this.raw.badges_with_meta ?? []).map((b) => ({
      code: b.code,
      text: b.text,
      backgroundColor: b.background_color,
      color: b.color,
      icon: b.icon,
    }));
  }
}

const toHistory = (v: { productNo: number; viewedAt?: Date }) => ({
  product_no: v.productNo,
  viewed_datetime: (v.viewedAt ?? new Date()).toISOString(),
});

export class StoreProducts {
  constructor(private http: Http) {}

  async list(
    opts: StoreProductListOptions = {},
  ): Promise<Paginated<StoreProduct>> {
    const page = await this.http.get<Paginated<RawStoreProduct>>("v2.0/products/", {
      query: {
        sort: opts.sort ?? "LATEST",
        ott_item_uid: opts.ottItemUid,
        classification_id: opts.classificationId,
        offset: opts.offset,
        limit: opts.limit,
      },
      anon: opts.anon ?? this.http.anon ?? true,
      signal: opts.signal,
    });
    return mapPage(page, (r) => new StoreProduct(r));
  }

  /** Goods linked by Item.uid. */
  forItem(
    ottItemUid: string,
    opts: Omit<StoreProductListOptions, "ottItemUid"> = {},
  ): Promise<Paginated<StoreProduct>> {
    if (typeof ottItemUid !== "string" || !ottItemUid.trim()) throw new TypeError("item UID must not be empty");
    return this.list({ ...opts, ottItemUid });
  }

  /** Legacy item-linked products. */
  itemRelated(itemId: number, opts: StoreProductRequestOptions = {}): Promise<unknown> {
    return this.http.get("v1.0/products/item_related/", {
      query: { item_id: positiveId(itemId) },
      anon: opts.anon ?? this.http.anon ?? true,
      signal: opts.signal,
    });
  }

  /** Products selected by product number. */
  byNumbers(productNos: readonly number[], opts: StoreProductRequestOptions = {}): Promise<unknown> {
    if (!Array.isArray(productNos) || productNos.length === 0) throw new TypeError("product numbers must not be empty");
    return this.http.get("v1.0/products/", {
      query: { product_nos: productNos.map(positiveId).join(",") },
      anon: opts.anon ?? this.http.anon ?? true,
      signal: opts.signal,
    });
  }

  async search(
    keyword: string,
    opts: ApiOptions & { sort?: StoreSort; offset?: number; limit?: number } = {},
  ): Promise<Paginated<StoreProduct>> {
    const page = await this.http.get<Paginated<RawStoreProduct>>("v2.0/products/search/", {
      query: { keyword, sort_by: opts.sort, offset: opts.offset, limit: opts.limit },
      anon: opts.anon ?? this.http.anon ?? true,
      signal: opts.signal,
    });
    return mapPage(page, (r) => new StoreProduct(r));
  }

  // period는 필수(없으면 400). 실측상 daily/weekly만 유효.
  async popular(
    opts: ApiOptions & { period?: "daily" | "weekly"; classificationId?: number; limit?: number; top?: number } = {},
  ): Promise<Paginated<StoreProduct>> {
    const page = await this.http.get<Paginated<RawStoreProduct>>("v1.0/products/popular/", {
      query: {
        period: opts.period ?? "weekly",
        classification_id: opts.classificationId,
        limit: opts.limit,
        top: opts.top,
      },
      anon: opts.anon ?? this.http.anon ?? true,
      signal: opts.signal,
    });
    return mapPage(page, (r) => new StoreProduct(r));
  }

  async new(opts: ApiOptions & { limit?: number } = {}): Promise<Paginated<StoreProduct>> {
    const page = await this.http.get<Paginated<RawStoreProduct>>("v1.0/products/new/", {
      query: { limit: opts.limit },
      anon: opts.anon ?? this.http.anon ?? true,
      signal: opts.signal,
    });
    return mapPage(page, (r) => new StoreProduct(r));
  }

  autocomplete(keyword: string, opts: ApiOptions & { limit?: number } = {}): Promise<{ suggestions: string[] }> {
    return this.http.get("v1.0/products/autocomplete/", {
      query: { keyword, limit: opts.limit },
      anon: opts.anon ?? this.http.anon ?? true,
      signal: opts.signal,
    });
  }

  purchaseAvailability(productNo: number): Promise<{ purchasable: boolean }> {
    return this.http.get(`v1.0/products/${productNo}/purchase_availability/`);
  }

  async itemBanners(opts: ApiOptions = {}): Promise<StoreItemBanner[]> {
    const response = await this.http.get<{ results?: { product_no: number; ott_item_id: number }[] }>(
      "v1.0/products/item_banners/",
      { ...opts, anon: opts.anon ?? this.http.anon ?? true },
    );
    return (response.results ?? []).map((banner) => ({
      productNo: banner.product_no,
      ottItemId: banner.ott_item_id,
    }));
  }

  async enterEvent(productNo: number): Promise<{ productNo: number }> {
    const response = await this.http.post<{ product_no: number }>("v1.0/event_entries/", {
      body: { product_no: productNo },
    });
    return { productNo: response.product_no };
  }

  /** 로컬 조회이력을 서버에 보내 상품 카드로 하이드레이트. 빈 목록이면 아무것도 안 돌아옴. */
  async recentViews(
    views: { productNo: number; viewedAt?: Date }[] = [],
    opts: { limit?: number } = {},
  ): Promise<Paginated<StoreProduct>> {
    const page = await this.http.post<Paginated<RawStoreProduct>>("v1.0/product_view_histories/recent_views/", {
      body: { histories: views.map(toHistory), limit: opts.limit },
    });
    return mapPage(page, (r) => new StoreProduct(r));
  }

  addViewHistory(productNo: number, viewedAt: Date = new Date()): Promise<unknown> {
    return this.http.post("v1.0/product_view_histories/", {
      body: { histories: [toHistory({ productNo, viewedAt })] },
    });
  }
}
