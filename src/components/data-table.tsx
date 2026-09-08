"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { PAGE_SIZES, type Paginated } from "@/lib/data/query";

import { Button } from "./ui";

function SortIcon({ state }: { state: "asc" | "desc" | "none" }) {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden="true"
      className={`h-3 w-3 ${state === "none" ? "text-ink-muted/50" : "text-brand-600"}`}
      fill="currentColor"
    >
      <path d="M6 1.5 9 5H3z" opacity={state === "desc" ? 0.25 : 1} />
      <path d="M6 10.5 3 7h6z" opacity={state === "asc" ? 0.25 : 1} />
    </svg>
  );
}

export type Column<T> = {
  /** Also the sort key sent to the API when `sortable` is set. */
  key: string;
  header: string;
  sortable?: boolean;
  align?: "left" | "right";
  render: (row: T, reload: () => void) => ReactNode;
};

export type FilterDef =
  | { type: "search"; key: string; placeholder: string }
  | {
      type: "select";
      key: string;
      label: string;
      options: { value: string; label: string }[];
    }
  | { type: "number"; key: string; label: string; placeholder?: string }
  | { type: "date"; key: string; label: string };

type DataTableProps<T> = {
  /** API route that performs the filtering, sorting and pagination in SQL. */
  endpoint: string;
  columns: Column<T>[];
  filters?: FilterDef[];
  defaultSort?: { key: string; dir: "asc" | "desc" };
  rowKey: (row: T) => string;
  emptyMessage?: string;
};

/**
 * Server-driven table. All filter/sort/page state lives in the URL, is sent to the
 * API route verbatim, and is applied in the database query — no client-side
 * filtering of a pre-fetched dataset.
 */
export function DataTable<T>({
  endpoint,
  columns,
  filters = [],
  defaultSort,
  rowKey,
  emptyMessage = "No matching rows.",
}: DataTableProps<T>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();

  const [data, setData] = useState<Paginated<T> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const [lastUrl, setLastUrl] = useState("");

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const requestUrl = useMemo(() => {
    const params = new URLSearchParams(queryString);
    if (defaultSort && !params.get("sort")) {
      params.set("sort", defaultSort.key);
      params.set("dir", defaultSort.dir);
    }
    return `${endpoint}?${params.toString()}`;
  }, [endpoint, queryString, defaultSort]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLastUrl(requestUrl);

    fetch(requestUrl, { headers: { accept: "application/json" } })
      .then(async (response) => {
        const body = await response.json();
        if (cancelled) return;
        if (!response.ok) {
          setError(body.error ?? `Request failed (${response.status})`);
          setData(null);
          return;
        }
        setError(null);
        setData(body);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [requestUrl, nonce]);

  const setParams = useCallback(
    (updates: Record<string, string | undefined>, resetPage = true) => {
      const params = new URLSearchParams(queryString);
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === "") params.delete(key);
        else params.set(key, value);
      }
      if (resetPage) params.delete("page");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, queryString, router],
  );

  const sort = searchParams.get("sort") ?? defaultSort?.key;
  const dir = searchParams.get("dir") ?? defaultSort?.dir ?? "desc";
  const page = data?.page ?? 1;
  const pageCount = data?.pageCount ?? 1;

  const activeFilters = filters.filter((filter) =>
    Boolean(searchParams.get(filter.key)),
  ).length;
  const pageSize = data?.pageSize ?? 25;
  const firstRow = data && data.total > 0 ? (page - 1) * pageSize + 1 : 0;
  const lastRow = data ? Math.min(page * pageSize, data.total) : 0;

  return (
    <div className="space-y-2.5">
      <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
        {filters.length > 0 ? (
          <div className="flex flex-wrap items-end gap-x-3 gap-y-2.5 border-b border-line bg-surface-muted px-4 py-3">
            {filters.map((filter) => (
              <FilterControl
                key={filter.key}
                filter={filter}
                value={searchParams.get(filter.key) ?? ""}
                onChange={(value) => setParams({ [filter.key]: value })}
              />
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="mb-0.5"
              disabled={activeFilters === 0}
              onClick={() => router.replace(pathname, { scroll: false })}
            >
              Clear{activeFilters > 0 ? ` (${activeFilters})` : ""}
            </Button>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-line">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={`px-4 py-2.5 text-xs font-semibold tracking-[0.06em] text-ink-muted uppercase ${
                      column.align === "right" ? "text-right" : "text-left"
                    }`}
                  >
                    {column.sortable ? (
                      <button
                        className={`inline-flex items-center gap-1.5 rounded transition-colors hover:text-ink ${
                          sort === column.key ? "text-ink" : ""
                        }`}
                        onClick={() =>
                          setParams({
                            sort: column.key,
                            dir:
                              sort === column.key && dir === "asc"
                                ? "desc"
                                : "asc",
                          })
                        }
                      >
                        {column.header}
                        <SortIcon
                          state={
                            sort === column.key
                              ? dir === "asc"
                                ? "asc"
                                : "desc"
                              : "none"
                          }
                        />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {error ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-10 text-center text-sm text-red-700"
                  >
                    {error}
                  </td>
                </tr>
              ) : null}
              {!error && loading && !data ? <SkeletonRows columns={columns} /> : null}
              {!error && data?.rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-14">
                    <p className="text-center text-sm font-medium text-ink">
                      Nothing to show
                    </p>
                    <p className="mt-1 text-center text-sm text-ink-muted">
                      {emptyMessage}
                    </p>
                  </td>
                </tr>
              ) : null}
              {data?.rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  className={`border-b border-line/70 transition-colors last:border-0 hover:bg-surface-muted ${
                    loading ? "opacity-60" : ""
                  }`}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-4 py-3 align-middle text-ink-soft ${
                        column.align === "right" ? "text-right" : "text-left"
                      }`}
                    >
                      {column.render(row, reload)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface-muted px-4 py-2.5 text-sm text-ink-soft">
          <span className="tabular">
            {loading && !data
              ? "Loading…"
              : `${firstRow.toLocaleString()}–${lastRow.toLocaleString()} of ${
                  data?.total.toLocaleString() ?? 0
                }`}
          </span>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-ink-muted">
              Rows
              <select
                className="h-7 rounded-lg border border-line-strong bg-surface px-1.5 text-xs text-ink"
                value={searchParams.get("pageSize") ?? "25"}
                onChange={(e) => setParams({ pageSize: e.target.value })}
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <span className="tabular text-xs text-ink-muted">
              Page {page} of {pageCount}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setParams({ page: String(page - 1) }, false)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= pageCount}
                onClick={() => setParams({ page: String(page + 1) }, false)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>

      <p
        className="truncate text-xs text-ink-muted"
        title="The request the browser actually made — filtering happens in SQL, not in the browser."
      >
        <span className="font-medium">Request</span>{" "}
        <code className="font-mono">GET {lastUrl}</code>
      </p>
    </div>
  );
}

function SkeletonRows<T>({ columns }: { columns: Column<T>[] }) {
  return (
    <>
      {Array.from({ length: 6 }).map((_, rowIndex) => (
        <tr key={rowIndex} className="border-b border-line/70 last:border-0">
          {columns.map((column) => (
            <td key={column.key} className="px-4 py-3">
              <span className="block h-3.5 animate-pulse rounded bg-line" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function FilterControl({
  filter,
  value,
  onChange,
}: {
  filter: FilterDef;
  value: string;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const committed = useRef(value);

  useEffect(() => {
    if (value !== committed.current) {
      committed.current = value;
      setDraft(value);
    }
  }, [value]);

  useEffect(() => {
    if (filter.type === "select") return;
    const timer = setTimeout(() => {
      if (draft !== committed.current) {
        committed.current = draft;
        onChange(draft);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [draft, filter.type, onChange]);

  const inputClass =
    "h-9 rounded-lg border border-line-strong bg-surface px-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-brand-500";
  const labelClass =
    "flex flex-col gap-1 text-[0.7rem] font-medium tracking-wide text-ink-muted uppercase";

  if (filter.type === "select") {
    return (
      <label className={labelClass}>
        {filter.label}
        <select
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">All</option>
          {filter.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (filter.type === "search") {
    return (
      <label className={labelClass}>
        Search
        <input
          className={`${inputClass} w-64`}
          placeholder={filter.placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
      </label>
    );
  }

  return (
    <label className={labelClass}>
      {filter.label}
      <input
        className={`${inputClass} tabular`}
        type={filter.type === "date" ? "date" : "number"}
        placeholder={filter.type === "number" ? filter.placeholder : undefined}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
    </label>
  );
}
