import type { Http } from "../http.ts";
import { kst, text } from "../normalize.ts";
import type { RawNotice } from "../raw.ts";

export interface Notice {
  id: number;
  title?: string;
  /** 헬프센터 문서 링크(상대경로 "/hc/...") */
  articleUrl?: string;
  publishedAt: Date | null;
}

export interface Order {
  id: number;
  account: number;
  items: { productId: number; listPrice: number; price: number; promotionId: number | null }[];
}

export class Misc {
  constructor(private http: Http) {}

  async currentNotice(): Promise<Notice> {
    const r = await this.http.get<RawNotice>("notices/v1/current/", { anon: true });
    return { id: r.id, title: text(r.title), articleUrl: r.zendesk_url, publishedAt: kst(r.published_datetime) };
  }

  scheduleNotice(): Promise<unknown> {
    return this.http.get("v1.0/lists/schedule_notice/", { anon: true });
  }

  npsSurveys(): Promise<unknown> {
    return this.http.get("user_requests/v1/nps_surveys/active/");
  }

  npsRespond(surveyId: number, score: number): Promise<void> {
    return this.http.post(`user_requests/v1/nps_surveys/${surveyId}/responses/`, { body: { score } });
  }

  npsDismiss(surveyId: number): Promise<void> {
    return this.http.post(`user_requests/v1/nps_surveys/${surveyId}/dismissals/`, { body: {} });
  }

  avodAd(id: number): Promise<unknown> {
    return this.http.get("avods/v1/advertisement/", { query: { id } });
  }

  async storeAccess(): Promise<{ hasMainProfile: boolean; hasPermission: boolean }> {
    const r = await this.http.get<{ has_main_profile?: boolean; has_permission?: boolean }>("store/v1/check_access/");
    return { hasMainProfile: !!r.has_main_profile, hasPermission: !!r.has_permission };
  }

  infoDiscover(): Promise<
    { genres?: string[]; tags?: string[]; brands?: string[]; productions?: string[]; years?: { animation?: string[] } }
  > {
    return this.http.get("v1.0/info/discover/", { anon: true });
  }

  /** 댓글 필터용 금지어 사전(전역). 자동으로 필터되지 않고 직접 교체해야함 */
  async bannedWords(): Promise<{ words: string[]; replacement?: string }> {
    const r = await this.http.get<{ banned_word_list?: string[]; replacement_word?: string }>(
      "users/v1/banned_words/",
      { anon: true },
    );
    return { words: r.banned_word_list ?? [], replacement: r.replacement_word };
  }

  /** 구매 주문 생성. product_ids로 주문을 만들고 반환된 id를 payments.charge의 orderId로 사용. */
  async createOrder(input: { productIds: number[]; itemId?: number }): Promise<Order> {
    const r = await this.http.post<{
      id: number;
      account: number;
      order_items?: { product_id: number; list_price: number; price: number; promotion_id: number | null }[];
    }>("orders/v1/list/", { body: { product_ids: input.productIds, item_id: input.itemId } });
    return {
      id: r.id,
      account: r.account,
      items: (r.order_items ?? []).map((o) => ({
        productId: o.product_id,
        listPrice: o.list_price,
        price: o.price,
        promotionId: o.promotion_id,
      })),
    };
  }
}
