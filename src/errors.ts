export class LaftelError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly method: string;
  readonly url: string;
  readonly detail: unknown;
  readonly body: unknown;
  readonly bodyText: string;

  constructor(init: {
    status: number;
    method: string;
    url: string;
    code?: string | null;
    detail?: unknown;
    body?: unknown;
    bodyText: string;
    cause?: unknown;
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
  }
}

function messageOf(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return JSON.stringify(detail);
  return "";
}

export function parseError(
  status: number,
  method: string,
  url: string,
  bodyText: string,
  cause?: unknown,
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

  return new LaftelError({ status, method, url, code, detail, body, bodyText, cause });
}
