import type { ApiOptions, Http } from "../http.ts";
import { mapPage } from "../paginate.ts";
import { Comment } from "../models.ts";
import type { LiteralUnion, Paginated } from "../types.ts";
import type { RawComment } from "../raw.ts";

export type CommentSort = LiteralUnion<"top" | "newest" | "like">;

export interface CommentListOptions extends ApiOptions {
  episodeId?: number;
  shortsId?: number;
  parentCommentId?: number;
  sort?: CommentSort;
  limit?: number;
  cursor?: string;
  mine?: boolean;
  withReplies?: boolean;
}

export type CommentCreateInput = {
  content: string;
  spoiler?: boolean;
  parentComment?: number;
} & ({ episode: number; shorts?: never } | { episode?: never; shorts: number });

export class Comments {
  constructor(private http: Http) {}

  async list(opts: CommentListOptions = {}): Promise<Paginated<Comment>> {
    const page = await this.http.get<Paginated<RawComment>>("comments/v1/list/", {
      query: {
        episode_id: opts.episodeId,
        shorts_id: opts.shortsId,
        parent_comment_id: opts.parentCommentId,
        sorting: opts.sort ?? "top",
        limit: opts.limit,
        cursor: opts.cursor,
        mine: opts.mine,
        with_replies: opts.withReplies,
      },
      anon: opts.anon,
      signal: opts.signal,
    });
    return mapPage(page, (r) => new Comment(r));
  }

  async count(episodeId: number, opts: ApiOptions = {}): Promise<number> {
    const res = await this.http.get<{ comment_count: number }>("comments/v1/count/", {
      query: { episode_id: episodeId },
      anon: opts.anon,
      signal: opts.signal,
    });
    return res.comment_count;
  }

  async countShorts(shortsId: number, opts: ApiOptions = {}): Promise<number> {
    const res = await this.http.get<{ comment_count: number }>("comments/v1/count/", {
      query: { shorts_id: shortsId },
      anon: opts.anon,
      signal: opts.signal,
    });
    return res.comment_count;
  }

  async get(id: number, opts: ApiOptions = {}): Promise<Comment> {
    return new Comment(await this.http.get<RawComment>(`comments/v1/${id}/`, opts));
  }

  create(input: CommentCreateInput, opts: ApiOptions = {}): Promise<{ id: number }> {
    return this.http.post("comments/v1/list/", {
      ...opts,
      body: {
        episode: input.episode,
        shorts: input.shorts,
        content: input.content,
        is_spoiler: input.spoiler ?? false,
        parent_comment: input.parentComment,
      },
    });
  }

  update(id: number, input: { content?: string; spoiler?: boolean }, opts: ApiOptions = {}): Promise<void> {
    return this.http.patch(`comments/v1/${id}/`, {
      ...opts,
      body: { content: input.content, is_spoiler: input.spoiler },
    });
  }

  delete(id: number, opts: ApiOptions = {}): Promise<void> {
    return this.http.del(`comments/v1/${id}/`, opts);
  }

  deleteMany(ids: number[], opts: ApiOptions = {}): Promise<void> {
    return this.http.post("comments/v1/delete/", { ...opts, body: { ids } });
  }

  like(id: number, opts: ApiOptions = {}): Promise<void> {
    return this.http.patch(`comments/v1/${id}/like/`, { ...opts, body: { is_active: true } });
  }

  unlike(id: number, opts: ApiOptions = {}): Promise<void> {
    return this.http.patch(`comments/v1/${id}/like/`, { ...opts, body: { is_active: false } });
  }

  reportSpoiler(id: number, opts: ApiOptions = {}): Promise<void> {
    return this.http.post(`comments/v1/${id}/report/`, { ...opts, body: { is_spoiler: true } });
  }

  reportAbuse(id: number, opts: ApiOptions = {}): Promise<void> {
    return this.http.post(`comments/v1/${id}/report/`, { ...opts, body: { is_spoiler: false } });
  }
}
