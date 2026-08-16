import type { Http } from "../http.ts";
import { mapPage } from "../paginate.ts";
import { ContinueWatchingEntry, Item } from "../models.ts";
import { episodeLabel } from "../normalize.ts";
import type { LiteralUnion, Paginated } from "../types.ts";
import type { RawContinueWatching, RawPlayHistoryEntry } from "../raw.ts";

export type PlayHistorySort = LiteralUnion<"recent">;

export interface PlayHistoryEntry {
  item: Item;
  lastPlayed?: {
    episodeId: number;
    episodeLabel: string;
    thumbnail?: string;
    /** 0~1 float */
    progressRatio?: number;
  };
}

export function toPlayHistory(r: RawPlayHistoryEntry): PlayHistoryEntry {
  const e = r.last_played_episode_info;
  return {
    item: new Item(r),
    lastPlayed: e
      ? {
        episodeId: e.episode_id,
        episodeLabel: episodeLabel(e.episode_num),
        thumbnail: e.episode_img ?? undefined,
        progressRatio: e.progressbar ?? undefined,
      }
      : undefined,
  };
}

export class Users {
  constructor(private http: Http) {}

  async continueWatching(
    userId: number,
    opts: { limit?: number; offset?: number } = {},
  ): Promise<Paginated<ContinueWatchingEntry>> {
    const page = await this.http.get<Paginated<RawContinueWatching>>(`users/v1/${userId}/continue_watching/`, {
      query: { ...opts },
    });
    return mapPage(page, (r) => new ContinueWatchingEntry(r));
  }

  async playHistory(
    userId: number,
    opts: { sort?: PlayHistorySort; limit?: number; offset?: number } = {},
  ): Promise<Paginated<PlayHistoryEntry>> {
    const page = await this.http.get<Paginated<RawPlayHistoryEntry>>(`users/v2/${userId}/playhistory_set/`, {
      query: { sorting: opts.sort, limit: opts.limit, offset: opts.offset },
    });
    return mapPage(page, toPlayHistory);
  }

  purchasedItems(
    userId: number,
    opts: { sort?: string; limit?: number; offset?: number } = {},
  ): Promise<Paginated<unknown>> {
    return this.http.get(`v1.0/users/${userId}/purchased_items/`, {
      query: { sorting: opts.sort, limit: opts.limit, offset: opts.offset },
    });
  }

  deleteContinueWatching(userId: number, seriesId: number): Promise<void> {
    return this.http.del(`users/v1/${userId}/continue_watching/series/${seriesId}/`);
  }
}
