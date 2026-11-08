import { type ApiOptions, type Debug, Http, type QueryValue, type Session } from "./http.ts";
import { paginate } from "./paginate.ts";
import type { LiteralUnion, Paginated } from "./types.ts";
import { type AccountInfo, toAccount } from "./models.ts";
import type { RawAuth, RawStatus } from "./raw.ts";

import { Items } from "./api/items.ts";
import { Episodes, type PlaybackDevice } from "./api/episodes.ts";
import { Search } from "./api/search.ts";
import { Comments } from "./api/comments.ts";
import { Reviews } from "./api/reviews.ts";
import { Profiles } from "./api/profiles.ts";
import { Users } from "./api/users.ts";
import { Home } from "./api/home.ts";
import { Notifications } from "./api/notifications.ts";
import { Events } from "./api/events.ts";
import { Live } from "./api/live.ts";
import { Premieres } from "./api/premieres.ts";
import { Memberships } from "./api/memberships.ts";
import { Misc } from "./api/misc.ts";
import { Account } from "./api/account.ts";
import { FreeView } from "./api/freeview.ts";
import { Playback } from "./api/playback.ts";
import { Shorts } from "./api/shorts.ts";
import { Store } from "./store/index.ts";
import { bindContracts, type Contracts } from "./contracts.ts";

export const API_BASE = "https://api.laftel.net/api/";
export const STORE_BASE = "https://store-api.laftel.net/";

export interface LaftelConfig {
  token?: string | null;
  anon?: boolean;
  baseUrl?: string;
  storeBaseUrl?: string;
  fetch?: typeof fetch;
  userAgent?: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
  debug?: Debug;
  device?: PlaybackDevice;
}

export interface Status {
  readonly raw: RawStatus;
  status?: string;
  ip?: string;
  countryCode?: string;
  localAd?: boolean;
  env?: string;
  androidVersion?: RawStatus["android_version"];
  iosVersion?: RawStatus["ios_version"];
  tizenVersion?: RawStatus["tizen_version"];
  webosVersion?: RawStatus["webos_version"];
  tvosVersion?: RawStatus["tvos_version"];
  androidTvVersion?: RawStatus["androidtv_version"];
}

export interface LoginResult {
  account: AccountInfo;
  token: string;
  method: LiteralUnion<"email" | "google" | "kakao" | "apple">;
  /** 휴면 해제되어 복구된 계정 */
  isRestored: boolean;
  /** 이번 로그인으로 신규 가입 처리됨 */
  isRegistered: boolean;
}

function toLoginResult(r: RawAuth): LoginResult {
  return {
    account: toAccount(r.user),
    token: r.key,
    method: r.method,
    isRestored: r.is_restored,
    isRegistered: r.is_registered,
  };
}

export class Laftel {
  readonly api: Http;
  readonly storeHttp: Http;
  private readonly session: Session;
  private contractBindings?: Contracts;

  readonly items: Items;
  readonly episodes: Episodes;
  readonly search: Search;
  readonly comments: Comments;
  readonly reviews: Reviews;
  readonly profiles: Profiles;
  readonly users: Users;
  readonly home: Home;
  readonly notifications: Notifications;
  readonly events: Events;
  readonly live: Live;
  readonly premieres: Premieres;
  readonly memberships: Memberships;
  readonly misc: Misc;
  readonly account: Account;
  readonly freeView: FreeView;
  readonly playback: Playback;
  readonly shorts: Shorts;
  readonly store: Store;

  constructor(config: LaftelConfig = {}) {
    this.session = { token: config.token ?? null };
    const shared = {
      session: this.session,
      anon: config.anon,
      fetch: config.fetch,
      userAgent: config.userAgent,
      timeoutMs: config.timeoutMs,
      headers: config.headers,
      debug: config.debug,
    };
    this.api = new Http({ baseUrl: config.baseUrl ?? API_BASE, ...shared });
    this.storeHttp = new Http({ baseUrl: config.storeBaseUrl ?? STORE_BASE, ...shared });

    this.items = new Items(this.api);
    this.episodes = new Episodes(this.api, config.device);
    this.search = new Search(this.api);
    this.comments = new Comments(this.api);
    this.reviews = new Reviews(this.api);
    this.profiles = new Profiles(this.api);
    this.users = new Users(this.api);
    this.home = new Home(this.api);
    this.notifications = new Notifications(this.api);
    this.events = new Events(this.api);
    this.live = new Live(this.api);
    this.premieres = new Premieres(this.api);
    this.memberships = new Memberships(this.api);
    this.misc = new Misc(this.api);
    this.account = new Account(this.api);
    this.freeView = new FreeView(this.api);
    this.playback = new Playback(this.api);
    this.shorts = new Shorts(this.api);
    this.store = new Store(this.storeHttp);
  }

  /** Named raw contracts; availability and response fields depend on the server at request time. */
  get contracts(): Contracts {
    return this.contractBindings ??= bindContracts(this.api, this.storeHttp);
  }

  get token(): string | null {
    return this.session.token;
  }
  set token(value: string | null) {
    this.session.token = value;
  }

  async login(username: string, password: string, opts: ApiOptions = {}): Promise<LoginResult> {
    const res = await this.api.post<RawAuth>("authentications/v3/email/", {
      ...opts,
      anon: opts.anon ?? this.api.anon ?? true,
      body: { username, password },
    });
    this.session.token = res.key;
    return toLoginResult(res);
  }

  async loginSocial(
    provider: "kakao" | "apple" | "google",
    tokens: { access_token: string; id_token?: string },
    opts: ApiOptions = {},
  ): Promise<LoginResult> {
    const res = await this.api.post<RawAuth>(`authentications/v3/${provider}/`, {
      ...opts,
      anon: opts.anon ?? this.api.anon ?? true,
      body: tokens,
    });
    this.session.token = res.key;
    return toLoginResult(res);
  }

  logout(): void {
    this.session.token = null;
  }

  /**
   * PIN은 프론트엔드측 UI 잠금일 뿐이므로 잠긴 프로필에 대해서도 전환이 가능함.
   * 전환 전에 profiles.checkPassword() 호출하여 PIN 검사 기능을 만들 수 있음.
   */
  async selectProfile(profileId: number): Promise<string> {
    const res = await this.profiles.token(profileId);
    this.session.token = res.token;
    return res.token;
  }

  async status(opts: ApiOptions = {}): Promise<Status> {
    const r = await this.api.get<RawStatus>("v1.0/status/", { ...opts, anon: opts.anon ?? this.api.anon ?? true });
    return {
      raw: r,
      status: r.status,
      ip: r.ip,
      countryCode: r.country_code,
      localAd: r.local_ad,
      env: r.env,
      androidVersion: r.android_version,
      iosVersion: r.ios_version,
      tizenVersion: r.tizen_version,
      webosVersion: r.webos_version,
      tvosVersion: r.tvos_version,
      androidTvVersion: r.androidtv_version,
    };
  }

  paginate<T>(
    path: string,
    query?: Record<string, QueryValue>,
    opts: ApiOptions = {},
  ): AsyncGenerator<T, void, unknown> {
    return paginate<T>(this.api, path, { ...opts, query });
  }

  page<T>(path: string, query?: Record<string, QueryValue>, opts: ApiOptions = {}): Promise<Paginated<T>> {
    return this.api.get<Paginated<T>>(path, { ...opts, query });
  }
}
