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

/** Metadata only: credentials, query values and request/response bodies are omitted. */
export type Debug = boolean | ((line: string) => void);

function debugUrl(value: string): string {
  const url = new URL(value);
  url.username = "";
  url.password = "";
  url.pathname = url.pathname.replace(/(\/(?:premiere_)?sessions\/)[^/]+/g, "$1[redacted]");
  for (const name of new Set(url.searchParams.keys())) url.searchParams.set(name, "[redacted]");
  url.hash = "";
  return url.href;
}

export interface HttpConfig {
  baseUrl: string;
  session: Session;
  anon?: boolean;
  fetch?: typeof fetch;
  userAgent?: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
  debug?: Debug;
}

export interface ApiOptions {
  anon?: boolean;
  signal?: AbortSignal;
}

export interface RequestOptions extends ApiOptions {
  query?: Record<string, QueryValue>;
  body?: unknown;
  ok404?: boolean;
  headers?: Record<string, string>;
  /** Follow HTTP redirects (default: true). */
  followRedirects?: boolean;
}

export class Http {
  readonly baseUrl: string;
  readonly session: Session;
  readonly anon?: boolean;
  private readonly fetchImpl: typeof fetch;
  private readonly userAgent: string;
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
    this.anon = config.anon;
    this.fetchImpl = f === globalThis.fetch ? f.bind(globalThis) : f;
    this.userAgent = config.userAgent ?? USER_AGENT;
    this.extraHeaders = config.headers;
    this.timeoutMs = config.timeoutMs ?? 20_000;
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
    if ((opts.anon ?? this.anon) || !token) {
      headers.delete("Authorization");
      headers.delete("Cookie");
    } else headers.set("Authorization", `Token ${token}`);

    let payload: string | undefined;
    if (opts.body !== undefined) {
      payload = JSON.stringify(opts.body);
      if (!headers.has("content-type")) headers.set("Content-Type", "application/json");
    }

    if (this.log) {
      this.log(
        `laftel --> ${method} ${debugUrl(url)}\n   header names ${
          JSON.stringify([...this.wireHeaders(url, headers).keys()])
        }${payload ? `\n   body (${payload.length} chars)` : ""}`,
      );
    }

    const { res, bodyText } = await this.send(method, url, headers, opts, payload);
    if (this.log) this.log(`laftel <-- ${res.status} ${method} ${debugUrl(url)} (${bodyText.length} chars)`);

    if (!res.ok) {
      if (res.status === 404 && opts.ok404) {
        if (this.log) this.log(`laftel skip 404 (ok404, null): ${debugUrl(url)}`);
        return null as T;
      }
      throw parseError(res.status, method, url, bodyText, undefined, res.headers.get("retry-after"));
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
    if ((opts.anon ?? this.anon) || !token) {
      headers.delete("Authorization");
      headers.delete("Cookie");
    } else headers.set("Authorization", `Token ${token}`);

    if (this.log) {
      this.log(
        `laftel --> GET(text) ${debugUrl(url)}\n   header names ${
          JSON.stringify([...this.wireHeaders(url, headers).keys()])
        }`,
      );
    }

    const { res, bodyText } = await this.send("GET", url, headers, opts);
    if (this.log) this.log(`laftel <-- ${res.status} GET(text) ${debugUrl(url)} (${bodyText.length} chars)`);
    if (!res.ok) throw parseError(res.status, "GET", url, bodyText, undefined, res.headers.get("retry-after"));
    return bodyText;
  }

  resolve(path: string, query?: Record<string, QueryValue>): string {
    const url = new URL(path, this.baseUrl);
    if (url.username || url.password) throw new TypeError("Request URLs must not contain credentials");
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

  private apiTarget(value: string): boolean {
    const origin = new URL(value).origin;
    return origin === new URL(this.baseUrl).origin || origin === "https://api.laftel.net" ||
      origin === "https://store-api.laftel.net";
  }

  private wireHeaders(value: string, headers: Headers): Headers {
    const result = new Headers(headers);
    if (this.apiTarget(value)) {
      if (!result.has("Laftel")) result.set("Laftel", "TeJava");
    } else {
      result.delete("Laftel");
      result.delete("Authorization");
      result.delete("Cookie");
    }
    return result;
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
    try {
      while (true) {
        signal.throwIfAborted();
        const res = await this.fetchImpl(target, {
          method: requestMethod,
          headers: this.wireHeaders(target, headers),
          credentials: this.apiTarget(target) && headers.has("Authorization") ? "same-origin" : "omit",
          body: requestBody,
          signal,
          redirect: "manual",
        });
        const bodyText = await res.text();
        const location = res.headers.get("location");
        if (opts.followRedirects === false || ![301, 302, 303, 307, 308].includes(res.status) || !location) {
          return { res, bodyText };
        }
        if (redirects++ === 20) throw new Error("Too many redirects");
        const next = this.resolve(new URL(location, target).href);
        const crossOrigin = new URL(next).origin !== new URL(target).origin;
        if (crossOrigin) {
          headers.delete("Authorization");
          headers.delete("Cookie");
        }
        if (
          (res.status === 303 && requestMethod !== "HEAD") ||
          ((res.status === 301 || res.status === 302) && requestMethod === "POST")
        ) {
          requestMethod = "GET";
          requestBody = undefined;
          headers.delete("content-type");
          headers.delete("content-length");
        }
        if (crossOrigin && requestBody !== undefined) throw new Error("Cross-origin request body redirect refused");
        target = next;
      }
    } catch (cause) {
      const detail = describe(cause);
      const code = opts.signal?.aborted ? "aborted" : timeout.signal.aborted ? "timeout" : "network";
      if (this.log) {
        this.log(`laftel err ${method} ${debugUrl(url)} (${code})`);
      }
      throw new LaftelError({
        status: 0,
        method,
        url,
        code,
        detail,
        bodyText: "",
        cause,
      });
    } finally {
      clearTimeout(timer);
    }
  }
}
