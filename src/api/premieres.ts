import { LaftelError } from "../errors.ts";
import type { ApiOptions, Http } from "../http.ts";
import { Premiere, PremiereChatSeed, PremierePlayback, PremiereSession, PremiereViewerCount } from "../models.ts";
import type {
  RawPremiere,
  RawPremiereChatSeed,
  RawPremierePlayback,
  RawPremiereSession,
  RawPremiereViewerCount,
} from "../raw.ts";

export type PremiereRequestOptions = ApiOptions;

export type PremierePlaybackStatus = "playing" | "paused" | "stopped";

export interface PremiereMessageOptions extends PremiereRequestOptions {
  /** UUID for matching the Ably echo. */
  clientMessageId?: string;
}

export interface PremiereMessageReceipt {
  /** HTTP acceptance is separate from receiving the corresponding Ably message. */
  clientMessageId: string;
}

function id(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) throw new TypeError("premiere ID must be a positive safe integer");
  return value;
}

export class Premieres {
  constructor(private http: Http) {}

  async list(opts: PremiereRequestOptions = {}): Promise<Premiere[]> {
    const rows = await this.http.get<RawPremiere[]>("premieres/v1/list/", {
      ...opts,
      anon: opts.anon ?? this.http.anon ?? true,
    });
    return rows.map((row) => new Premiere(row));
  }

  /** Finds an event in the current schedule. */
  async get(premiereId: number, opts: PremiereRequestOptions = {}): Promise<Premiere | null> {
    id(premiereId);
    return (await this.list(opts)).find((event) => event.id === premiereId) ?? null;
  }

  /** Public viewer count. */
  async viewerCount(premiereId: number, opts: PremiereRequestOptions = {}): Promise<PremiereViewerCount> {
    const raw = await this.http.get<RawPremiereViewerCount>(`premieres/v1/${id(premiereId)}/viewer_count/`, {
      ...opts,
      anon: opts.anon ?? this.http.anon ?? true,
    });
    return new PremiereViewerCount(raw);
  }

  setReminder(premiereId: number, opts: PremiereRequestOptions = {}): Promise<void> {
    return this.http.post(`premieres/v1/${id(premiereId)}/reminder/`, {
      ...opts,
      followRedirects: false,
      body: {},
    });
  }

  removeReminder(premiereId: number, opts: PremiereRequestOptions = {}): Promise<void> {
    return this.http.del(`premieres/v1/${id(premiereId)}/reminder/`, {
      ...opts,
      followRedirects: false,
    });
  }

  /** Opens a playback session. */
  async playback(premiereId: number, opts: PremiereRequestOptions = {}): Promise<PremierePlayback> {
    const raw = await this.http.post<RawPremierePlayback>("playbacks/v1/premiere/", {
      ...opts,
      followRedirects: false,
      body: { premiere_id: id(premiereId) },
    });
    return new PremierePlayback(raw);
  }

  /** offset is the playback position in seconds. */
  async session(
    playbackToken: string,
    status: PremierePlaybackStatus,
    offset: number,
    opts: PremiereRequestOptions = {},
  ): Promise<PremiereSession | null> {
    if (
      typeof playbackToken !== "string" || !playbackToken || /\s|[\u0000-\u001f\u007f]/u.test(playbackToken) ||
      playbackToken === "." || playbackToken === ".."
    ) throw new TypeError("a valid premiere playback token is required");
    if (!["playing", "paused", "stopped"].includes(status)) throw new TypeError("invalid premiere playback status");
    if (typeof offset !== "number" || !Number.isFinite(offset) || offset < 0) {
      throw new TypeError("premiere offset must be a finite nonnegative number of seconds");
    }
    const raw = await this.http.post<RawPremiereSession | null>(
      `playbacks/v1/premiere_sessions/${encodeURIComponent(playbackToken)}/`,
      { ...opts, followRedirects: false, body: { status, offset } },
    );
    return raw ? new PremiereSession(raw) : null;
  }

  async chat(premiereId: number, opts: PremiereRequestOptions = {}): Promise<PremiereChatSeed> {
    const path = `premieres/v1/${id(premiereId)}/chat/`;
    let raw: RawPremiereChatSeed;
    try {
      raw = await this.http.post<RawPremiereChatSeed>(path, {
        ...opts,
        followRedirects: false,
        body: {},
      });
    } catch (error) {
      if (
        (opts.anon ?? this.http.anon) || !(error instanceof LaftelError) || error.status !== 401 ||
        !this.http.session.token
      ) {
        throw error;
      }
      raw = await this.http.post<RawPremiereChatSeed>(path, { ...opts, anon: true, followRedirects: false, body: {} });
    }
    return new PremiereChatSeed(raw);
  }

  /** HTTP 204 means the message was accepted. */
  async sendMessage(
    premiereId: number,
    content: string,
    opts: PremiereMessageOptions = {},
  ): Promise<PremiereMessageReceipt> {
    id(premiereId);
    if (typeof content !== "string" || !content.trim()) {
      throw new TypeError("premiere message content must not be empty");
    }
    const clientMessageId = opts.clientMessageId ?? crypto.randomUUID();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clientMessageId)) {
      throw new TypeError("clientMessageId must be a UUID");
    }
    await this.http.post<void>(`premieres/v1/${premiereId}/chat/messages/`, {
      anon: opts.anon,
      signal: opts.signal,
      followRedirects: false,
      body: { content, client_message_id: clientMessageId },
    });
    return { clientMessageId };
  }
}
