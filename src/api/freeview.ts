import type { Http } from "../http.ts";

/** 무료 감상(PC방 등 NC 제휴 IP). start 이후 items/current로 감상 가능 목록과 상태를 조회함 */
export class FreeView {
  constructor(private http: Http) {}

  current(): Promise<unknown> {
    return this.http.get("free_views/v1/current/");
  }

  items(opts: { limit?: number; offset?: number } = {}): Promise<unknown> {
    return this.http.get("free_views/v1/items/", { query: { limit: opts.limit ?? 24, offset: opts.offset } });
  }

  recommended(): Promise<{ items?: unknown[] }> {
    return this.http.get("free_views/v1/items/recommended/");
  }

  start(): Promise<unknown> {
    return this.http.post("free_views/v1/start/", { body: {} });
  }

  /** 현재 IP가 NC 제휴 IP(PC방 등)인지 확인. 비제휴면 404 NOT_AFFILIATED. */
  checkAffiliated(): Promise<unknown> {
    return this.http.post("partners/nc/v1/check_affiliated/", { body: {} });
  }
}
