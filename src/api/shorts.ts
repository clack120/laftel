import type { Http } from "../http.ts";
import { kst, text } from "../normalize.ts";
import { mapPage } from "../paginate.ts";
import type { Paginated } from "../types.ts";

export interface RawShortCreator {
  id: number;
  name: string;
  profile_image: string;
}

export interface RawShortLinkedItem {
  id: number;
  name: string;
  img: string;
  is_adult: boolean;
  episode_count: number;
  first_episode_id: number;
}

export interface RawShort {
  id: number;
  title: string;
  description: string;
  thumbnail: string;
  seek_thumbnail_url: string;
  hls_url: string;
  dash_url: string;
  running_time: number;
  is_adult: boolean;
  created: string;
  creator: RawShortCreator;
  tags: unknown[];
  linked_items: RawShortLinkedItem[];
  related_shorts_count: number;
  like_count: number;
  play_count: number;
  comment_count: number;
  is_liked: boolean;
  is_bookmarked: boolean;
  is_wished: boolean;
  first_related_shorts?: RawShort | null;
}

export interface RawShortCard {
  id: number;
  title: string;
  thumbnail: string;
  is_adult: boolean;
}

export interface ShortCreator {
  id: number;
  name: string;
  profileImage: string;
}

export interface ShortLinkedItem {
  id: number;
  name: string;
  image: string;
  adult: boolean;
  episodeCount: number;
  firstEpisodeId: number;
}

export class ShortCard {
  readonly id: number;
  readonly title: string;
  readonly thumbnail: string;
  readonly adult: boolean;

  constructor(readonly raw: RawShortCard) {
    this.id = raw.id;
    this.title = raw.title;
    this.thumbnail = raw.thumbnail;
    this.adult = raw.is_adult;
  }
}

export class Short {
  readonly id: number;
  readonly title: string;
  readonly description?: string;
  readonly thumbnail: string;
  readonly seekThumbnailUrl: string;
  readonly hlsUrl: string;
  readonly dashUrl: string;
  readonly runningTime: number;
  readonly adult: boolean;
  readonly createdAt: Date | null;
  readonly creator: ShortCreator;
  readonly tags: readonly unknown[];
  readonly linkedItems: readonly ShortLinkedItem[];
  readonly relatedCount: number;
  readonly likeCount: number;
  readonly playCount: number;
  readonly commentCount: number;
  readonly liked: boolean;
  readonly bookmarked: boolean;
  readonly wished: boolean;
  readonly firstRelated: Short | null;

  constructor(readonly raw: RawShort, includeFirstRelated = true) {
    this.id = raw.id;
    this.title = raw.title;
    this.description = text(raw.description);
    this.thumbnail = raw.thumbnail;
    this.seekThumbnailUrl = raw.seek_thumbnail_url;
    this.hlsUrl = raw.hls_url;
    this.dashUrl = raw.dash_url;
    this.runningTime = raw.running_time;
    this.adult = raw.is_adult;
    this.createdAt = kst(raw.created);
    this.creator = { id: raw.creator.id, name: raw.creator.name, profileImage: raw.creator.profile_image };
    this.tags = raw.tags ?? [];
    this.linkedItems = (raw.linked_items ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      image: item.img,
      adult: item.is_adult,
      episodeCount: item.episode_count,
      firstEpisodeId: item.first_episode_id,
    }));
    this.relatedCount = raw.related_shorts_count;
    this.likeCount = raw.like_count;
    this.playCount = raw.play_count;
    this.commentCount = raw.comment_count;
    this.liked = raw.is_liked;
    this.bookmarked = raw.is_bookmarked;
    this.wished = raw.is_wished;
    this.firstRelated = includeFirstRelated && raw.first_related_shorts
      ? new Short(raw.first_related_shorts, false)
      : null;
  }
}

export interface ShortFeedPage {
  next: string | null;
  results: Short[];
}

export interface ShortCollection {
  placement: string;
  results: ShortCard[];
}

export interface ShortFeedOptions {
  limit?: number;
  afterShortsId?: number;
  anchorShortsId?: number;
}

export interface ShortPageOptions {
  limit?: number;
  offset?: number;
}

export interface BookmarkedShortsOptions {
  limit?: number;
  startShortsId?: number;
  offset?: number;
}

export interface RawShortPlaybackSession {
  playback_session_id?: string | number;
  [key: string]: unknown;
}

export interface ShortPlaybackEnd {
  playbackSessionId: string | number;
  watchTimeSeconds: number;
  maxPositionSeconds: number;
}

const mapFeed = (page: { next: string | null; results?: RawShort[] }): ShortFeedPage => ({
  next: page.next,
  results: (page.results ?? []).map((raw) => new Short(raw)),
});

export class Shorts {
  constructor(private http: Http) {}

  async feed(opts: ShortFeedOptions = {}): Promise<ShortFeedPage> {
    const page = await this.http.get<{ next: string | null; results?: RawShort[] }>("shorts/v1/feed/", {
      query: {
        limit: opts.limit,
        after_shorts_id: opts.afterShortsId,
        anchor_shorts_id: opts.anchorShortsId,
      },
    });
    return mapFeed(page);
  }

  async *allFeed(opts: ShortFeedOptions = {}): AsyncGenerator<Short, void, unknown> {
    let page = await this.feed(opts);
    while (true) {
      for (const short of page.results) yield short;
      if (!page.next) return;
      page = mapFeed(await this.http.get<{ next: string | null; results?: RawShort[] }>(page.next));
    }
  }

  async get(shortsId: number): Promise<Short> {
    return new Short(await this.http.get<RawShort>(`shorts/v1/${shortsId}/`));
  }

  async related(shortsId: number): Promise<Short[]> {
    const response = await this.http.get<{ results?: RawShort[] }>(`shorts/v1/${shortsId}/related/`);
    return (response.results ?? []).map((raw) => new Short(raw));
  }

  async forItem(itemId: number, opts: ShortPageOptions = {}): Promise<Paginated<Short>> {
    const page = await this.http.get<Paginated<RawShort>>(`shorts/v1/items/${itemId}/shorts/`, {
      query: { limit: opts.limit, offset: opts.offset },
    });
    return mapPage(page, (raw) => new Short(raw));
  }

  async bookmarks(opts: BookmarkedShortsOptions = {}): Promise<Paginated<Short>> {
    const page = await this.http.get<Paginated<RawShort>>("shorts/v1/bookmarks/", {
      query: { limit: opts.limit, start_shorts_id: opts.startShortsId, offset: opts.offset },
    });
    return mapPage(page, (raw) => new Short(raw));
  }

  async collections(opts: { limit?: number } = {}): Promise<ShortCard[]> {
    const rows = await this.http.get<RawShortCard[]>("shorts/v1/collections/", { query: { limit: opts.limit } });
    return rows.map((raw) => new ShortCard(raw));
  }

  async collectionsV2(opts: { limit?: number } = {}): Promise<ShortCollection> {
    const collection = await this.http.get<{ placement: string; results?: RawShortCard[] }>(
      "shorts/v2/collections/",
      { query: { limit: opts.limit } },
    );
    return {
      placement: collection.placement,
      results: (collection.results ?? []).map((raw) => new ShortCard(raw)),
    };
  }

  bookmark(shortsId: number): Promise<void> {
    return this.http.post(`shorts/v1/${shortsId}/bookmark/`);
  }

  unbookmark(shortsId: number): Promise<void> {
    return this.http.del(`shorts/v1/${shortsId}/bookmark/`);
  }

  like(shortsId: number): Promise<void> {
    return this.http.post(`shorts/v1/${shortsId}/like/`);
  }

  unlike(shortsId: number): Promise<void> {
    return this.http.del(`shorts/v1/${shortsId}/like/`);
  }

  disinterest(shortsId: number, reason: string): Promise<void> {
    return this.http.post(`shorts/v1/${shortsId}/disinterest/`, { body: { reason } });
  }

  report(shortsId: number, reason: string): Promise<void> {
    return this.http.post(`shorts/v1/${shortsId}/report/`, { body: { reason } });
  }

  hideCollections(): Promise<void> {
    return this.http.post("shorts/v1/collections/hide/", { body: {} });
  }

  startPlayback(shortsId: number): Promise<RawShortPlaybackSession> {
    return this.http.post(`shorts/v1/${shortsId}/playbacks/start/`);
  }

  playback(shortsId: number, playbackSessionId: string | number): Promise<void> {
    return this.http.post(`shorts/v1/${shortsId}/playbacks/`, {
      body: { playback_session_id: playbackSessionId },
    });
  }

  endPlayback(shortsId: number, input: ShortPlaybackEnd): Promise<void> {
    return this.http.post(`shorts/v1/${shortsId}/playbacks/end/`, {
      body: {
        playback_session_id: input.playbackSessionId,
        watch_time_seconds: input.watchTimeSeconds,
        max_position_seconds: input.maxPositionSeconds,
      },
    });
  }
}
