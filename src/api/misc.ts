import type { Http } from "../http.ts";
import { kst, text } from "../normalize.ts";
import type { RawNotice } from "../raw.ts";
import type { LiteralUnion } from "../types.ts";

export interface NewItemRequestInput {
  medium: LiteralUnion<"MOVIE" | "TVA" | "OVA">;
  itemTitle: string;
  audioSubtitleOption: LiteralUnion<"dubbing" | "subtitle" | "dubbing_and_subtitle">;
  reason: string;
  createdAt?: Date;
}

export interface SubtitleReviewRequestInput {
  itemTitle: string;
  episodeNum: string;
  errorType: LiteralUnion<"mistranslation" | "typo" | "unrelated" | "sync" | "other">;
  timestamp: string;
  description: string;
  isItemTitleInputClean: boolean;
  createdAt?: Date;
}

export interface Notice {
  id: number;
  title?: string;
  /** 헬프센터 문서 링크(상대경로 "/hc/...") */
  articleUrl?: string;
  publishedAt: Date | null;
}

export class Misc {
  constructor(private http: Http) {}

  async currentNotice(): Promise<Notice | null> {
    const r = await this.http.get<RawNotice | null>("notices/v1/current/", { anon: true });
    if (!r) return null;
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

  requestNewItem(input: NewItemRequestInput): Promise<void> {
    return this.http.post("user_requests/v1/item_request/", {
      body: {
        medium: input.medium,
        item_title: input.itemTitle,
        audio_subtitle_option: input.audioSubtitleOption,
        reason: input.reason,
        created_at: (input.createdAt ?? new Date()).toISOString(),
      },
    });
  }

  requestSubtitleReview(input: SubtitleReviewRequestInput): Promise<void> {
    return this.http.post("user_requests/v1/subtitle_review/", {
      body: {
        item_title: input.itemTitle,
        episode_num: input.episodeNum,
        error_type: input.errorType,
        timestamp: input.timestamp,
        description: input.description,
        is_item_title_input_clean: input.isItemTitleInputClean,
        created_at: (input.createdAt ?? new Date()).toISOString(),
      },
    });
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
}
