import { LaftelError, parseError } from "./errors.ts";
import { GOOGLEBOT_USER_AGENT, USER_AGENT } from "./version.ts";

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
  googlebotFallback?: boolean;
  timeoutMs?: number;
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
  private readonly googlebotFallback: boolean;
  private readonly timeoutMs: number;
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
    this.timeoutMs = config.timeoutMs ?? 20_000;
    this.googlebotFallback = (config.googlebotFallback ?? false) && config.userAgent === undefined &&
      !new Headers(config.headers).has("user-agent");
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

    const headers = new Headers({
      "User-Agent": this.userAgent,
      Accept: "application/json",
      Origin: "https://laftel.net",
      Referer: "https://laftel.net/",
    });
    for (const source of [this.extraHeaders, opts.headers]) {
      for (const [key, value] of Object.entries(source ?? {})) headers.set(key, value);
    }

    const token = this.session.token;
    if (token && !opts.anon) headers.set("Authorization", `Token ${token}`);

    let payload: string | undefined;
    if (opts.body !== undefined) {
      payload = JSON.stringify(opts.body);
      if (!headers.has("content-type")) headers.set("Content-Type", "application/json");
    }

    if (this.log) {
      this.log(
        `laftel --> ${method} ${url}\n   headers ${JSON.stringify(Object.fromEntries(headers))}${
          payload ? `\n   body ${payload}` : ""
        }`,
      );
    }

    const { res, bodyText } = await this.send(method, url, headers, opts, payload);
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
    const headers = new Headers({ "User-Agent": this.userAgent });
    for (const source of [this.extraHeaders, opts.headers]) {
      for (const [key, value] of Object.entries(source ?? {})) headers.set(key, value);
    }
    const token = this.session.token;
    if (token && !opts.anon) headers.set("Authorization", `Token ${token}`);

    if (this.log) this.log(`laftel --> GET(text) ${url}\n   headers ${JSON.stringify(Object.fromEntries(headers))}`);

    const { res, bodyText } = await this.send("GET", url, headers, opts);
    if (this.log) this.log(`laftel <-- ${res.status} GET(text) ${url} (${bodyText.length} bytes)`);
    if (!res.ok) throw parseError(res.status, "GET", url, bodyText);
    return bodyText;
  }

  private resolve(path: string, query?: Record<string, QueryValue>): string {
    const url = new URL(path, this.baseUrl);
    const laftel = url.protocol === "https:" &&
      (url.hostname === "laftel.net" || url.hostname.endsWith(".laftel.net"));
    if (!laftel && url.origin !== new URL(this.baseUrl).origin) {
      throw new TypeError(`Request URL host is not allowed: ${url.origin}`);
    }
    if (!query) return url.href;

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
    if (!qs) return url.href;
    url.search += (url.search ? "&" : "") + qs;
    return url.href;
  }

  private async send(
    method: string,
    url: string,
    headers: Headers,
    opts: RequestOptions,
    body?: string,
  ): Promise<{ res: Response; bodyText: string }> {
    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(new DOMException("Timed out", "TimeoutError")), this.timeoutMs);
    const signal = opts.signal ? AbortSignal.any([opts.signal, timeout.signal]) : timeout.signal;
    let target = url;
    let requestMethod = method;
    let requestBody = body;
    let redirects = 0;
    let retried = false;
    try {
      while (true) {
        const res = await this.fetchImpl(target, {
          method: requestMethod,
          headers,
          body: requestBody,
          signal,
          redirect: "manual",
        });
        if (
          this.googlebotFallback && !retried && res.status === 403 &&
          !new Headers(opts.headers).has("user-agent")
        ) {
          await res.text();
          if (this.log) this.log(`laftel retry ${requestMethod} ${target} with Googlebot UA after 403`);
          headers.set("User-Agent", GOOGLEBOT_USER_AGENT);
          retried = true;
          continue;
        }
        const location = res.headers.get("location");
        if (![301, 302, 303, 307, 308].includes(res.status) || !location) {
          return { res, bodyText: await res.text() };
        }
        await res.text();
        if (redirects++ === 20) throw new Error("Too many redirects");
        target = this.resolve(new URL(location, target).href);
        if (
          (res.status === 303 && requestMethod !== "HEAD") ||
          ((res.status === 301 || res.status === 302) && requestMethod === "POST")
        ) {
          requestMethod = "GET";
          requestBody = undefined;
          headers.delete("content-type");
          headers.delete("content-length");
        }
      }
    } catch (cause) {
      const detail = describe(cause);
      if (this.log) this.log(`laftel err ${method} ${url}\n   ${detail}`);
      throw new LaftelError({
        status: 0,
        method,
        url,
        code: timeout.signal.aborted ? "timeout" : "network",
        detail,
        bodyText: "",
        cause,
      });
    } finally {
      clearTimeout(timer);
    }
  }
}
