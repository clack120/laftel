import type { Http } from "../http.ts";
import { mapPage } from "../paginate.ts";
import { Item, Review } from "../models.ts";
import type { LiteralUnion, Paginated } from "../types.ts";
import type { RawItemCard, RawReview } from "../raw.ts";

export type ReviewSort = LiteralUnion<"like" | "created">;
/** add=별점 준 순, my_rating=별점 높은 순 */
export type RatingSort = LiteralUnion<"add" | "my_rating">;

/** 내가 준 별점(리뷰와는 다른 개념임). score=별점 값. */
export interface MyRating {
  id: number;
  score: number;
  item: Item;
}

export class Reviews {
  constructor(private http: Http) {}

  async list(itemId: number, opts: { sort?: ReviewSort; cursor?: string } = {}): Promise<Paginated<Review>> {
    const page = await this.http.get<Paginated<RawReview>>("reviews/v2/list/", {
      query: { item_id: itemId, sorting: opts.sort ?? "like", cursor: opts.cursor },
    });
    return mapPage(page, (r) => new Review(r));
  }

  async count(itemId: number): Promise<number> {
    const res = await this.http.get<{ count: number }>("reviews/v1/count/", { query: { item_id: itemId } });
    return res.count;
  }

  /** 특정 작품에 내가 쓴 리뷰 */
  async myReviewFor(itemId: number): Promise<Review> {
    return new Review(await this.http.get<RawReview>("reviews/v1/my_review/", { query: { item_id: itemId } }));
  }

  async myRatings(opts: { sort?: RatingSort; offset?: number } = {}): Promise<Paginated<MyRating>> {
    const page = await this.http.get<Paginated<{ id: number; value: number; item: RawItemCard }>>(
      "reviews/v1/my_ratings/",
      { query: { sorting: opts.sort, offset: opts.offset } },
    );
    return mapPage(page, (r) => ({ id: r.id, score: r.value, item: new Item(r.item) }));
  }

  async myReviews(opts: { sort?: ReviewSort; offset?: number } = {}): Promise<Paginated<Review>> {
    const page = await this.http.get<Paginated<RawReview>>("reviews/v1/my_reviews/", {
      query: { sorting: opts.sort, offset: opts.offset },
    });
    return mapPage(page, (r) => new Review(r));
  }

  create(input: { item: number; score: number; content?: string; spoiler?: boolean }): Promise<void> {
    return this.http.post("reviews/v1/list/", {
      body: { item: input.item, score: input.score, content: input.content ?? "", is_spoiler: input.spoiler ?? false },
    });
  }

  update(id: number, input: { score: number; content?: string; spoiler?: boolean }): Promise<void> {
    return this.http.patch(`reviews/v1/${id}/`, {
      body: { score: input.score, content: input.content ?? "", is_spoiler: input.spoiler ?? false },
    });
  }

  like(id: number): Promise<void> {
    return this.http.patch(`reviews/v1/${id}/like/`, { body: { is_active: true } });
  }

  unlike(id: number): Promise<void> {
    return this.http.patch(`reviews/v1/${id}/like/`, { body: { is_active: false } });
  }

  reportSpoiler(id: number): Promise<void> {
    return this.http.post(`reviews/v1/${id}/report/`, { body: { is_spoiler: true } });
  }

  reportAbuse(id: number): Promise<void> {
    return this.http.post(`reviews/v1/${id}/report/`, { body: { is_spoiler: false } });
  }

  deleteRatings(ids: number[]): Promise<void> {
    return this.http.post("reviews/v1/my_ratings/delete/", { body: { ids } });
  }

  deleteReviews(ids: number[]): Promise<void> {
    return this.http.post("reviews/v1/my_reviews/delete/", { body: { ids } });
  }
}
