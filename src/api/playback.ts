import type { Http } from "../http.ts";
import { hms } from "../normalize.ts";
import type { LiteralUnion } from "../types.ts";

export interface Heartbeat {
  /** 누적 시청 시간(초) */
  playedSeconds?: number;
  /** 현재 재생 위치(초) */
  positionSeconds?: number;
  exit?: boolean;
  paused?: boolean;
}

export interface StreamVariant {
  quality: string;
  url: string;
}

export interface LivePlayback {
  playbackToken: string;
  licenseToken: string;
  dash: StreamVariant[];
  hls: StreamVariant[];
}

export class Playback {
  constructor(private http: Http) {}

  heartbeat(playLogId: number, beat: Heartbeat = {}): Promise<void> {
    return this.http.patch(`play_logs/${playLogId}/`, {
      body: {
        total_play_time: hms(beat.playedSeconds ?? 0),
        play_end_offset: hms(beat.positionSeconds ?? 0),
        is_player_exit: beat.exit ?? false,
        is_player_paused: beat.paused ?? false,
      },
    });
  }

  stop(
    playLogId: number,
    beat: Pick<Heartbeat, "playedSeconds" | "positionSeconds"> & { partnerToken?: string } = {},
  ): Promise<void> {
    return this.http.post(`play_logs/${playLogId}/stop/`, {
      headers: { "Content-Type": "text/plain" }, // server rejects application/json
      body: {
        auth_token: (this.http.session.token ?? "").replace(/^\s*Token\s+/i, "").trim(),
        partner_token: beat.partnerToken,
        total_play_time: hms(beat.playedSeconds ?? 0),
        play_end_offset: hms(beat.positionSeconds ?? 0),
      },
    });
  }

  clearRecent(type = "recent", itemIds?: number[]): Promise<void> {
    return this.http.del("play_logs/delete/", { query: { type }, body: itemIds ? { item_ids: itemIds } : undefined });
  }

  session(uuid: string, status: LiteralUnion<"playing" | "paused" | "stopped">): Promise<void> {
    return this.http.post(`playbacks/v1/sessions/${uuid}/`, { body: { status } });
  }

  async live(channelName: string): Promise<LivePlayback> {
    const r = await this.http.post<
      {
        playback_token: string;
        license_token: string;
        dash_streaming_urls?: StreamVariant[];
        hls_streaming_urls?: StreamVariant[];
      }
    >("playbacks/v1/live/", { body: { channel_name: channelName } });
    return {
      playbackToken: r.playback_token,
      licenseToken: r.license_token,
      dash: r.dash_streaming_urls ?? [],
      hls: r.hls_streaming_urls ?? [],
    };
  }
}
