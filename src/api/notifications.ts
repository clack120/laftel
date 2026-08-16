import type { Http } from "../http.ts";
import { mapPage } from "../paginate.ts";
import { kst } from "../normalize.ts";
import type { LiteralUnion, Paginated } from "../types.ts";
import type { RawNotification } from "../raw.ts";

export interface Notification {
  id?: number;
  type?: string;
  status?: LiteralUnion<"read" | "unread">;
  title?: string;
  description?: string;
  content?: string;
  icon?: string;
  image?: string;
  itemId?: number;
  episodeId?: number;
  createdAt: Date | null;
  endsAt: Date | null;
}

function toNotification(r: RawNotification): Notification {
  return {
    id: r.id,
    type: r.notification_type ?? r.type,
    status: r.status,
    title: r.title,
    description: r.description,
    content: r.content,
    icon: r.icon,
    image: r.image,
    itemId: r.extra_data?.item_id,
    episodeId: r.extra_data?.episode_id,
    createdAt: kst(r.created),
    endsAt: kst(r.end_datetime),
  };
}

export class Notifications {
  constructor(private http: Http) {}

  async list(
    opts: { limit?: number; notificationType?: string; offset?: number } = {},
  ): Promise<Paginated<Notification>> {
    const page = await this.http.get<Paginated<RawNotification>>("notifications/v2/list/", {
      query: { limit: opts.limit, notification_type: opts.notificationType, offset: opts.offset },
    });
    return mapPage(page, toNotification);
  }

  async count(): Promise<number> {
    const res = await this.http.get<{ new_notification_history_count: number }>("notifications/v1/count/");
    return res.new_notification_history_count;
  }

  read(id: number): Promise<void> {
    return this.http.patch(`notifications/v2/${id}/`);
  }

  delete(id: number): Promise<void> {
    return this.http.del(`notifications/v2/${id}/`);
  }
}
