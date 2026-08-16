import type { Http, RequestOptions } from "./http.ts";
import type { Paginated } from "./types.ts";

export async function* paginate<T>(
  http: Http,
  path: string,
  opts?: RequestOptions,
): AsyncGenerator<T, void, unknown> {
  let page = await http.get<Paginated<T>>(path, opts);
  while (true) {
    for (const item of page.results ?? []) yield item;
    const next = page.next;
    if (!next) return;
    // next는 풀 URL (쿼리 포함) -> query 옵션 없이 그대로 따라감
    page = await http.get<Paginated<T>>(next, opts && { anon: opts.anon, signal: opts.signal, headers: opts.headers });
  }
}

export function mapPage<R, M>(page: Paginated<R>, fn: (r: R) => M): Paginated<M> {
  return { count: page.count, next: page.next, previous: page.previous, results: (page.results ?? []).map(fn) };
}

export async function collect<T>(gen: AsyncGenerator<T>, limit = Infinity): Promise<T[]> {
  const out: T[] = [];
  for await (const item of gen) {
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}
