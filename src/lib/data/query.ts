import { z } from "zod";

export const PAGE_SIZES = [10, 25, 50, 100] as const;

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((n): n is (typeof PAGE_SIZES)[number] =>
      (PAGE_SIZES as readonly number[]).includes(n),
    )
    .catch(25)
    .default(25),
});

export const sortDirSchema = z.enum(["asc", "desc"]).catch("desc").default("desc");

export type SortDir = z.infer<typeof sortDirSchema>;

export type Paginated<T> = {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export function paginate<T>(
  rows: T[],
  total: number,
  page: number,
  pageSize: number,
): Paginated<T> {
  return {
    rows,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Turns a plain object of filters into a URLSearchParams-friendly record. */
export function toSearchParams(
  values: Record<string, string | number | boolean | undefined | null>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  return params;
}
