import type { Http } from "../http.ts";
import { mapPage } from "../paginate.ts";
import { Episode, type EpisodeProduct, StreamInfo, toEpisodeProduct } from "../models.ts";
import { kst } from "../normalize.ts";
import type { LiteralUnion, Paginated } from "../types.ts";
import type { AccessType, RawEpisode, RawEpisodeProduct, RawStreamInfo } from "../raw.ts";

export type EpisodeSort = LiteralUnion<"newest" | "oldest">;

export interface VideoPermission {
  episodeId: number;
  accessType: AccessType;
  inAppDownload: boolean;
  membershipEndsAt: Date | null;
  itemExpiresAt: Date | null;
}

export class Episodes {
  constructor(private http: Http) {}

  async list(itemId: number, opts: { sort?: EpisodeSort; limit?: number } = {}): Promise<Paginated<Episode>> {
    const page = await this.http.get<Paginated<RawEpisode>>("episodes/v3/list/", {
      query: { item_id: itemId, ...opts },
      anon: true,
    });
    return mapPage(page, (r) => new Episode(r));
  }

  async get(episodeId: number): Promise<Episode> {
    return new Episode(await this.http.get<RawEpisode>(`episodes/v3/${episodeId}/`, { anon: true }));
  }

  /** 작품의 이어보기 스트림. 시청이력 없으면 204 -> null. */
  async recentVideo(itemId: number): Promise<StreamInfo | null> {
    const raw = await this.http.get<RawStreamInfo | null>(`episodes/v1/${itemId}/recent-video/`);
    return raw ? new StreamInfo(raw) : null;
  }

  async video(episodeId: number, device = "Web"): Promise<StreamInfo> {
    return new StreamInfo(
      await this.http.post<RawStreamInfo>(`episodes/v3/${episodeId}/video/`, { query: { device } }),
    );
  }

  async videoPermission(opts: { episodeIds?: number[]; itemId?: number } = {}): Promise<VideoPermission[]> {
    const page = await this.http.get<
      Paginated<
        {
          episode_id: number;
          access_type: AccessType;
          in_app_download: boolean;
          membership_end_datetime: string | null;
          item_expire_datetime: string | null;
        }
      >
    >("episodes/v1/video/permission/", { query: { episode_ids: opts.episodeIds, item_id: opts.itemId } });
    return (page.results ?? []).map((r) => ({
      episodeId: r.episode_id,
      accessType: r.access_type,
      inAppDownload: r.in_app_download,
      membershipEndsAt: kst(r.membership_end_datetime),
      itemExpiresAt: kst(r.item_expire_datetime),
    }));
  }

  /* 프론트 측 js에 있는 유령
  videoThumbnail(episodeId: number): Promise<unknown> {
    return this.http.get(`episodes/v1/${episodeId}/video-thumbnail/`, { anon: true });
  }
  */

  /** 작품의 TVOD(대여/소장) 상품 목록. */
  async products(itemId: number): Promise<EpisodeProduct[]> {
    const r = await this.http.get<{ item_pps_products?: RawEpisodeProduct[] }>("products/v2/episode_products/", {
      query: { item_id: itemId },
    });
    return (r.item_pps_products ?? []).map(toEpisodeProduct);
  }
}
