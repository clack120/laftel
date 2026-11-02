export class LaftelError extends Error {
  readonly status: number;
  /** Transport errors use network, timeout or aborted; HTTP responses retain server codes. */
  readonly code: string | null;
  readonly method: string;
  readonly url: string;
  readonly detail: unknown;
  readonly body: unknown;
  readonly bodyText: string;
  readonly retryAt: Date | null;

  constructor(init: {
    status: number;
    method: string;
    url: string;
    code?: string | null;
    detail?: unknown;
    body?: unknown;
    bodyText: string;
    cause?: unknown;
    retryAt?: Date | null;
  }) {
    const code = init.code ?? null;
    const detailMsg = messageOf(init.detail);
    const loc = init.status === 0
      ? `${init.method} ${init.url}`
      : `${init.method} ${init.url} (${init.status}${code ? ` ${code}` : ""})`;
    super(`${loc}${detailMsg ? `: ${detailMsg}` : ""}`, { cause: init.cause });
    this.name = "LaftelError";
    this.status = init.status;
    this.code = code;
    this.method = init.method;
    this.url = init.url;
    this.detail = init.detail;
    this.body = init.body;
    this.bodyText = init.bodyText;
    this.retryAt = init.retryAt ?? null;
  }
}

function messageOf(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object") return JSON.stringify(detail);
  return "";
}

export class LaftelGeoBlockedError extends LaftelError {
  constructor(init: ConstructorParameters<typeof LaftelError>[0]) {
    super({ ...init, code: "geo_blocked", detail: "Laftel geographic access blocked" });
    this.name = "LaftelGeoBlockedError";
  }

  static matches(status: number, bodyText: string): boolean {
    return status === 403 && /^\s*<(?:!doctype\s+html|html)\b/i.test(bodyText) &&
      bodyText.includes("라프텔 - 해외 접속 차단") &&
      bodyText.includes("https://static.laftel.net/waf-block-page/index.js");
  }
}

export function parseError(
  status: number,
  method: string,
  url: string,
  bodyText: string,
  cause?: unknown,
  retryAfter?: string | null,
): LaftelError {
  let body: unknown;
  try {
    body = bodyText ? JSON.parse(bodyText) : undefined;
  } catch {
    body = undefined;
  }

  let code: string | null = null;
  let detail: unknown = bodyText;

  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    code = (b.code as string) ?? null;
    // DRF: {detail,code}; store: {code,detail,data}; payments: {error}
    detail = b.detail ?? b.error ?? b.msg ?? bodyText;
  }

  const now = Date.now();
  const raw = retryAfter?.trim();
  const at = raw ? (/^\d+$/.test(raw) ? now + Number(raw) * 1000 : Date.parse(raw)) : NaN;
  const retryAt = Number.isFinite(at) && at > now && at <= 8.64e15 ? new Date(at) : null;
  const init = { status, method, url, code, detail, body, bodyText, cause, retryAt };
  return LaftelGeoBlockedError.matches(status, bodyText) ? new LaftelGeoBlockedError(init) : new LaftelError(init);
}
