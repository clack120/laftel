export type LiteralUnion<T extends U, U = string> = T | (U & {});

type Enumerate<N extends number, Acc extends number[] = []> = Acc["length"] extends N ? Acc[number]
  : Enumerate<N, [...Acc, Acc["length"]]>;

export type IntRange<From extends number, To extends number> = Exclude<Enumerate<To>, Enumerate<From>>;

export type Paginated<T> = {
  count?: number;
  next: string | null;
  previous: string | null;
  results: T[];
};
