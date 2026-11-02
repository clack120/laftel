import type { Http, QueryValue, RequestOptions } from "./http.ts";
import type { Paginated } from "./types.ts";

export async function* paginate<T>(
  http: Http,
  path: string,
  opts?: RequestOptions,
): AsyncGenerator<T, void, unknown> {
  const seen = new Set<string>();
  let options = opts;
  while (true) {
    const cursor = paginationCursor(http, path, options?.query);
    if (seen.has(cursor)) throw new Error("Repeated a pagination cursor");
    seen.add(cursor);
    const page = await http.get<Paginated<T>>(path, options);
    for (const item of pageResults(page)) yield item;
    const next = page.next;
    if (!next) return;
    path = new URL(next, cursor).href;
    options = opts && { ...opts, query: undefined };
  }
}

export function paginationCursor(http: Http, path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(http.resolve(path, query));
  url.hash = "";
  url.searchParams.sort();
  return url.href;
}

export function mapPage<R, M>(page: Paginated<R>, fn: (r: R) => M): Paginated<M> {
  return { ...page, results: pageResults(page).map(fn) };
}

function pageResults<T>(page: { results: T[] }): T[] {
  if (!page || !Array.isArray(page.results)) throw new TypeError("Expected a page with a results array");
  return page.results;
}

export async function collect<T>(gen: AsyncGenerator<T>, limit = Infinity): Promise<T[]> {
  const out: T[] = [];
  if (limit <= 0) return out;
  for await (const item of gen) {
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}
