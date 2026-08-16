import { LaftelError, parseError } from "./errors.ts";
import { USER_AGENT } from "./version.ts";

function describe(e: unknown): string {
  const parts: string[] = [];
  const seen = new Set<unknown>();
  let cur: unknown = e;
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    if (cur instanceof Error) {
      parts.push(cur.message);
      cur = (cur as { cause?: unknown }).cause;
    } else {
      parts.push(String(cur));
      break;
    }
  }
  return parts.filter(Boolean).join(": ");
}

export type QueryValue = string | number | boolean | null | undefined | Array<string | number | boolean>;

export interface Session {
  token: string | null;
}

export type Debug = boolean | ((line: string) => void);

export interface HttpConfig {
  baseUrl: string;
  session: Session;
  fetch?: typeof fetch;
  userAgent?: string;
  headers?: Record<string, string>;
  debug?: Debug;
}

export interface RequestOptions {
  query?: Record<string, QueryValue>;
  body?: unknown;
  anon?: boolean;
  ok404?: boolean;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export class Http {
  readonly baseUrl: string;
  readonly session: Session;
  private readonly fetchImpl: typeof fetch;
  private readonly userAgent: string;
  private readonly extraHeaders?: Record<string, string>;
  private readonly log?: (line: string) => void;

  constructor(config: HttpConfig) {
    const f = config.fetch ?? globalThis.fetch;
    if (typeof f !== "function") {
      throw new Error("laftel: no fetch available in this runtime; pass { fetch } explicitly");
    }
    this.baseUrl = config.baseUrl;
    this.session = config.session;
    this.fetchImpl = f;
    this.userAgent = config.userAgent ?? USER_AGENT;
    this.extraHeaders = config.headers;
    const d = config.debug;
    this.log = typeof d === "function" ? d : d ? (line) => console.error(line) : undefined;
  }

  get<T>(path: string, opts?: RequestOptions): Promise<T> {
    return this.request<T>("GET", path, opts);
  }
  post<T>(path: string, opts?: RequestOptions): Promise<T> {
    return this.request<T>("POST", path, opts);
  }
  patch<T>(path: string, opts?: RequestOptions): Promise<T> {
    return this.request<T>("PATCH", path, opts);
  }
  del<T>(path: string, opts?: RequestOptions): Promise<T> {
    return this.request<T>("DELETE", path, opts);
  }

  async request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
    const url = this.resolve(path, opts.query);

    const headers: Record<string, string> = {
      "User-Agent": this.userAgent,
      Accept: "application/json",
      Origin: "https://laftel.net",
      Referer: "https://laftel.net/",
      ...this.extraHeaders,
      ...opts.headers,
    };

    const token = this.session.token;
    if (token && !opts.anon) headers.Authorization = `Token ${token}`;

    let payload: string | undefined;
    if (opts.body !== undefined) {
      payload = JSON.stringify(opts.body);
      headers["Content-Type"] = "application/json";
    }

    if (this.log) {
      this.log(
        `laftel --> ${method} ${url}\n   headers ${JSON.stringify(headers)}${payload ? `\n   body ${payload}` : ""}`,
      );
    }

    let res: Response;
    try {
      res = await this.fetchImpl(url, { method, headers, body: payload, signal: opts.signal });
    } catch (cause) {
      const msg = describe(cause);
      if (this.log) this.log(`laftel err ${method} ${url}\n   ${msg}`);
      throw new LaftelError({ status: 0, method, url, code: "network", detail: msg, bodyText: "", cause });
    }

    const bodyText = await res.text();
    if (this.log) this.log(`laftel <-- ${res.status} ${method} ${url}\n   ${bodyText || "(empty body)"}`);

    if (!res.ok) {
      if (res.status === 404 && opts.ok404) {
        if (this.log) this.log(`laftel skip 404 (ok404, null): ${url}`);
        return null as T;
      }
      throw parseError(res.status, method, url, bodyText);
    }

    if (!bodyText) return null as T;

    try {
      return JSON.parse(bodyText) as T;
    } catch (cause) {
      throw new LaftelError({
        status: res.status,
        method,
        url,
        code: "parse",
        detail: "response was not valid JSON",
        bodyText,
        cause,
      });
    }
  }

  async text(path: string, opts: RequestOptions = {}): Promise<string> {
    const url = this.resolve(path, opts.query);
    const headers: Record<string, string> = {
      "User-Agent": this.userAgent,
      ...this.extraHeaders,
      ...opts.headers,
    };
    const token = this.session.token;
    if (token && !opts.anon) headers.Authorization = `Token ${token}`;

    if (this.log) this.log(`laftel --> GET(text) ${url}\n   headers ${JSON.stringify(headers)}`);

    let res: Response;
    try {
      res = await this.fetchImpl(url, { method: "GET", headers, signal: opts.signal });
    } catch (cause) {
      const msg = describe(cause);
      if (this.log) this.log(`laftel err GET(text) ${url}\n   ${msg}`);
      throw new LaftelError({ status: 0, method: "GET", url, code: "network", detail: msg, bodyText: "", cause });
    }
    const bodyText = await res.text();
    if (this.log) this.log(`laftel <-- ${res.status} GET(text) ${url} (${bodyText.length} bytes)`);
    if (!res.ok) throw parseError(res.status, "GET", url, bodyText);
    return bodyText;
  }

  private resolve(path: string, query?: Record<string, QueryValue>): string {
    const base = path.startsWith("http://") || path.startsWith("https://") ? path : this.baseUrl + path;
    if (!query) return base;

    const params = new URLSearchParams();
    for (const key in query) {
      const value = query[key];
      if (value === null || value === undefined) continue;
      if (Array.isArray(value)) {
        for (const v of value) params.append(key, String(v));
      } else {
        params.append(key, String(value));
      }
    }
    const qs = params.toString();
    if (!qs) return base;
    return base + (base.indexOf("?") === -1 ? "?" : "&") + qs;
  }
}
