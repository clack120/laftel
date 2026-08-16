import type { Http } from "../http.ts";
import { LiveChannel, LiveProgram } from "../models.ts";
import { kst } from "../normalize.ts";
import type { RawLiveChannel, RawLiveProgram } from "../raw.ts";

export interface Reminder {
  programId: number;
  startsAt: Date | null;
}

export class Live {
  constructor(private http: Http) {}

  async channels(): Promise<LiveChannel[]> {
    const list = await this.http.get<RawLiveChannel[]>("live/v1/channels/", { anon: true });
    return list.map((r) => new LiveChannel(r));
  }

  /** 편성표를 가져옵니다. */
  async schedule(channelName: string, start: string, end: string): Promise<LiveProgram[]> {
    const list = await this.http.get<RawLiveProgram[]>("live/v1/programs/", {
      query: { channel_name: channelName, start, end },
      anon: true,
    });
    return list.map((r) => new LiveProgram(r));
  }

  /** 내 예약 알림 목록. schedule과 동일하게 채널+기간이 모두 필수(없으면 400). */
  reminders(channelName: string, start: string, end: string): Promise<unknown[]> {
    return this.http.get("live/v1/reminders/", {
      query: { channel_name: channelName, start, end },
    });
  }

  async setReminder(programId: number): Promise<Reminder> {
    const r = await this.http.post<{ live_channel_program: number; start_datetime: string }>(
      `live/v1/programs/${programId}/reminder/`,
      { body: {} },
    );
    return { programId: r.live_channel_program, startsAt: kst(r.start_datetime) };
  }

  removeReminder(programId: number): Promise<void> {
    return this.http.del(`live/v1/programs/${programId}/reminder/`);
  }
}
