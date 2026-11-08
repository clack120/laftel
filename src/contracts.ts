import type { Http, QueryValue, RequestOptions } from "./http.ts";
import { CONTRACTS } from "./contract-registry.ts";

export type ContractEvidence = "android" | "web" | "community" | "sdk" | "response";

/** A fixed wire contract; labels identify separate routes, not an upgrade order. */
export interface Contract {
  readonly origin: "api" | "store";
  readonly method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  readonly path: string;
  readonly evidence: readonly ContractEvidence[];
  /** Observed wire keys; an empty list means no keys have been recovered. */
  readonly queryKeys: readonly string[];
  /** Observed wire fields; source-client argument names may differ. */
  readonly bodyFields: readonly string[];
  /** Observed HTTP statuses; an empty list means static evidence only. */
  readonly statuses: readonly number[];
}

type PathKeys<P extends string> = P extends `${string}{${infer K}}${infer Rest}` ? K | PathKeys<Rest> : never;

export type ContractOptions<C extends Contract> = Omit<RequestOptions, "query"> & {
  /** Observed keys are suggestions; unknown keys are forwarded without rewriting. */
  query?: Partial<Record<C["queryKeys"][number], QueryValue>> & Record<string, QueryValue>;
  /** Redirects are disabled unless explicitly enabled by the caller. */
  followRedirects?: boolean;
};

export type ContractCall<C extends Contract> =
  & (
    [PathKeys<C["path"]>] extends [never] ? (options?: ContractOptions<C>) => Promise<unknown>
      : (
        params: { [K in PathKeys<C["path"]>]: string | number },
        options?: ContractOptions<C>,
      ) => Promise<unknown>
  )
  & { readonly contract: C };

export type Contracts = {
  readonly [R in keyof typeof CONTRACTS]: {
    readonly [K in keyof typeof CONTRACTS[R]]: typeof CONTRACTS[R][K] extends Contract
      ? ContractCall<typeof CONTRACTS[R][K]>
      : never;
  };
};

function pathValue(params: unknown, name: string): string {
  const value = params && typeof params === "object" ? (params as Record<string, unknown>)[name] : undefined;
  if (
    (typeof value !== "string" && typeof value !== "number") ||
    (typeof value === "number" && !Number.isFinite(value)) ||
    value === "" || value === "." || value === ".."
  ) throw new TypeError(`laftel: invalid path parameter ${name}`);
  return encodeURIComponent(String(value));
}

/** Bind named routes without retries, fallback, response merging or schema coercion. */
export function bindContracts(api: Http, store: Http): Contracts {
  const resources: Record<string, Record<string, unknown>> = {};
  for (const [resource, definitions] of Object.entries(CONTRACTS)) {
    const methods: Record<string, unknown> = {};
    for (const [name, definition] of Object.entries(definitions)) {
      const descriptor: Contract = definition;
      const hasParams = descriptor.path.includes("{");
      const call = (first?: unknown, options?: RequestOptions): Promise<unknown> => {
        const path = descriptor.path.replace(/\{([^}]+)\}/g, (_, key: string) => pathValue(first, key));
        const http = descriptor.origin === "api" ? api : store;
        const relative = descriptor.origin === "api" ? path.replace(/^\/api\//, "") : path.replace(/^\//, "");
        const opts = hasParams ? options : first as RequestOptions | undefined;
        return http.request(descriptor.method, relative, { ...opts, followRedirects: opts?.followRedirects ?? false });
      };
      Object.defineProperty(call, "contract", { value: definition, enumerable: true });
      methods[name] = call;
    }
    resources[resource] = Object.freeze(methods);
  }
  return Object.freeze(resources) as Contracts;
}

export { CONTRACTS } from "./contract-registry.ts";
