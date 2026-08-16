import { type Debug, Http, type Session } from "./http.ts";
import { paginate } from "./paginate.ts";
import type { LiteralUnion, Paginated } from "./types.ts";
import { type AccountInfo, toAccount } from "./models.ts";
import type { RawAuth, RawStatus } from "./raw.ts";

import { Items } from "./api/items.ts";
import { Episodes } from "./api/episodes.ts";
import { Search } from "./api/search.ts";
import { Comments } from "./api/comments.ts";
import { Reviews } from "./api/reviews.ts";
import { Profiles } from "./api/profiles.ts";
import { Users } from "./api/users.ts";
import { Home } from "./api/home.ts";
import { Notifications } from "./api/notifications.ts";
import { Events } from "./api/events.ts";
import { Live } from "./api/live.ts";
import { Memberships } from "./api/memberships.ts";
import { Misc } from "./api/misc.ts";
import { Account } from "./api/account.ts";
import { FreeView } from "./api/freeview.ts";
import { Playback } from "./api/playback.ts";
import { Store } from "./store/index.ts";

export const API_BASE = "https://api.laftel.net/api/";
export const STORE_BASE = "https://store-api.laftel.net/";

export interface LaftelConfig {
  token?: string | null;
  fetch?: typeof fetch;
  userAgent?: string;
  headers?: Record<string, string>;
  debug?: Debug;
}

export interface Status {
  status?: string;
  ip?: string;
  countryCode?: string;
  localAd?: boolean;
  env?: string;
}

export interface LoginResult {
  account: AccountInfo;
  token: string;
  method: LiteralUnion<"email" | "google" | "kakao">;
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
  readonly memberships: Memberships;
  readonly misc: Misc;
  readonly account: Account;
  readonly freeView: FreeView;
  readonly playback: Playback;
  readonly store: Store;

  constructor(config: LaftelConfig = {}) {
    this.session = { token: config.token ?? null };
    const shared = {
      session: this.session,
      fetch: config.fetch,
      userAgent: config.userAgent,
      headers: config.headers,
      debug: config.debug,
    };
    this.api = new Http({ baseUrl: API_BASE, ...shared });
    this.storeHttp = new Http({ baseUrl: STORE_BASE, ...shared });

    this.items = new Items(this.api);
    this.episodes = new Episodes(this.api);
    this.search = new Search(this.api);
    this.comments = new Comments(this.api);
    this.reviews = new Reviews(this.api);
    this.profiles = new Profiles(this.api);
    this.users = new Users(this.api);
    this.home = new Home(this.api);
    this.notifications = new Notifications(this.api);
    this.events = new Events(this.api);
    this.live = new Live(this.api);
    this.memberships = new Memberships(this.api);
    this.misc = new Misc(this.api);
    this.account = new Account(this.api);
    this.freeView = new FreeView(this.api);
    this.playback = new Playback(this.api);
    this.store = new Store(this.storeHttp);
  }

  get token(): string | null {
    return this.session.token;
  }
  set token(value: string | null) {
    this.session.token = value;
  }

  async login(username: string, password: string): Promise<LoginResult> {
    const res = await this.api.post<RawAuth>("authentications/v3/email/", { anon: true, body: { username, password } });
    this.session.token = res.key;
    return toLoginResult(res);
  }

  async loginSocial(
    provider: "kakao" | "apple" | "google",
    tokens: { access_token: string; id_token?: string },
  ): Promise<LoginResult> {
    const res = await this.api.post<RawAuth>(`authentications/v3/${provider}/`, { anon: true, body: tokens });
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

  async status(): Promise<Status> {
    const r = await this.api.get<RawStatus>("v1.0/status/", { anon: true });
    return { status: r.status, ip: r.ip, countryCode: r.country_code, localAd: r.local_ad, env: r.env };
  }

  paginate<T>(path: string, query?: Record<string, unknown>): AsyncGenerator<T, void, unknown> {
    return paginate<T>(this.api, path, query ? { query: query as never } : undefined);
  }

  page<T>(path: string, query?: Record<string, unknown>): Promise<Paginated<T>> {
    return this.api.get<Paginated<T>>(path, query ? { query: query as never } : undefined);
  }
}
