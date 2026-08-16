import type { Http } from "../http.ts";
import { mapPage } from "../paginate.ts";
import { Comment } from "../models.ts";
import { kst } from "../normalize.ts";
import type { LiteralUnion, Paginated } from "../types.ts";
import type { RawComment, RawEvent, RawEventDraw } from "../raw.ts";

export type EventCommentSort = LiteralUnion<"latest">;

export interface Event {
  id?: number;
  name?: string;
  type?: string;
  image?: string;
  bannerImage?: string;
  ageRating?: number;
  status?: string;
  startsAt: Date | null;
  endsAt: Date | null;
}

function toEvent(r: RawEvent): Event {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    image: r.img,
    bannerImage: r.banner_img,
    ageRating: r.rating,
    status: r.status,
    startsAt: kst(r.start_datetime),
    endsAt: kst(r.end_datetime),
  };
}

export interface EventDraw {
  id: number;
  condition: string;
  minProfileLevel: number | null;
  requiresThirdPartyConsent: boolean;
  thirdPartyCompany: string;
  requiresAddress: boolean;
}

export interface DrawParticipation {
  participated: boolean;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  participatedAt: Date | null;
}

export interface DrawResult {
  status?: string;
  prizeName?: string | null;
  prizeType?: string | null;
  ticketCode?: string | null;
  eventName?: string | null;
  email?: string | null;
}

export class Events {
  constructor(private http: Http) {}

  async list(
    opts: { status?: string; offset?: number; limit?: number; banner?: boolean; itemId?: number } = {},
  ): Promise<Paginated<Event>> {
    const page = await this.http.get<Paginated<RawEvent>>("events/v2/list/", {
      query: { status: opts.status, offset: opts.offset, limit: opts.limit, banner: opts.banner, item_id: opts.itemId },
      anon: true,
    });
    return mapPage(page, toEvent);
  }

  async get(id: number): Promise<Event> {
    return toEvent(await this.http.get<RawEvent>(`events/v2/${id}/`, { anon: true }));
  }

  comments(
    id: number,
    opts: { sort?: EventCommentSort; limit?: number; cursor?: string; mine?: boolean } = {},
  ): Promise<Paginated<unknown>> {
    return this.http.get(`events/v2/${id}/comments/`, {
      query: { sorting: opts.sort ?? "latest", limit: opts.limit, cursor: opts.cursor, mine: opts.mine },
    });
  }

  async createComment(id: number, content: string, opts: { spoiler?: boolean } = {}): Promise<Comment> {
    const raw = await this.http.post<RawComment>(`events/v2/${id}/comments/`, {
      body: { content, is_spoiler: opts.spoiler ?? false },
    });
    return new Comment(raw);
  }

  themes(): Promise<unknown> {
    return this.http.get("events/v1/theme/list/", { anon: true });
  }

  async draw(id: number): Promise<EventDraw> {
    const r = await this.http.get<RawEventDraw>(`events/v1/${id}/draw/`, { anon: true });
    return {
      id: r.id,
      condition: r.condition,
      minProfileLevel: r.min_profile_level,
      requiresThirdPartyConsent: r.requires_third_party_consent,
      thirdPartyCompany: r.third_party_company_name,
      requiresAddress: r.requires_address,
    };
  }

  async drawParticipation(id: number): Promise<DrawParticipation> {
    const r = await this.http.get<
      {
        is_participated?: boolean;
        name?: string;
        email?: string;
        phone?: string;
        address?: string;
        participated_datetime?: string | null;
      }
    >(`events/v1/${id}/draw/participation/`);
    return {
      participated: !!r.is_participated,
      name: r.name,
      email: r.email,
      phone: r.phone,
      address: r.address,
      participatedAt: kst(r.participated_datetime),
    };
  }

  async drawResult(id: number): Promise<DrawResult> {
    const r = await this.http.get<
      {
        status?: string;
        prize_name?: string | null;
        prize_type?: string | null;
        ticket_code?: string | null;
        event_name?: string | null;
        email?: string | null;
      }
    >(`events/v1/${id}/draw/result/`);
    return {
      status: r.status,
      prizeName: r.prize_name,
      prizeType: r.prize_type,
      ticketCode: r.ticket_code,
      eventName: r.event_name,
      email: r.email,
    };
  }

  /** 이벤트 응모(경품 추첨). address는 실물 경품 이벤트에서만 필요(draw.requiresAddress 참고). */
  drawParticipate(
    id: number,
    entrant: { name: string; email: string; phone: string; address?: string },
  ): Promise<unknown> {
    return this.http.post(`events/v1/${id}/draw/participate/`, {
      body: { name: entrant.name, email: entrant.email, phone: entrant.phone, address: entrant.address },
    });
  }

  votes(): Promise<unknown> {
    return this.http.get("events/v1/votes/", { anon: true });
  }

  eventVotes(id: number): Promise<unknown> {
    return this.http.get(`events/v1/${id}/votes/`, { anon: true });
  }

  voteResult(id: number, voteEventId: number): Promise<unknown> {
    return this.http.get(`events/v1/${id}/votes/${voteEventId}/result/`, { anon: true });
  }

  /*
  castVote(id: number, voteEventId: number, choice: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.post(`events/v1/${id}/votes/${voteEventId}/`, { body: choice });
  }
  */
}
