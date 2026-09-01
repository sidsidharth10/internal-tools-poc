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

  return (
    <div className="space-y-3">
      {filters.length > 0 ? (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3">
          {filters.map((filter) => (
            <FilterControl
              key={filter.key}
              filter={filter}
              value={searchParams.get(filter.key) ?? ""}
              onChange={(value) => setParams({ [filter.key]: value })}
            />
          ))}
          <Button
            variant="secondary"
            onClick={() => router.replace(pathname, { scroll: false })}
          >
            Clear
          </Button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-2 font-medium text-slate-600 ${
                    column.align === "right" ? "text-right" : "text-left"
                  }`}
                >
                  {column.sortable ? (
                    <button
                      className="inline-flex items-center gap-1 hover:text-slate-900"
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
                      <span className="text-xs text-slate-400">
                        {sort === column.key ? (dir === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {error ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-red-700"
                >
                  {error}
                </td>
              </tr>
            ) : null}
            {!error && data?.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : null}
            {data?.rows.map((row) => (
              <tr key={rowKey(row)} className="hover:bg-slate-50">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-2 align-middle ${
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

      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
        <span>
          {loading
            ? "Loading…"
            : `${data?.total.toLocaleString() ?? 0} rows · page ${page} of ${pageCount}`}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setParams({ page: String(page - 1) }, false)}
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            disabled={page >= pageCount}
            onClick={() => setParams({ page: String(page + 1) }, false)}
          >
            Next
          </Button>
        </div>
        <label className="flex items-center gap-2">
          Rows
          <select
            className="rounded-md border border-slate-300 px-2 py-1"
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
        <code
          className="ml-auto truncate rounded bg-slate-100 px-2 py-1 text-xs text-slate-600"
          title="The request the browser actually made — filtering happens in SQL, not in the browser."
        >
          GET {lastUrl}
        </code>
      </div>
    </div>
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
    "rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900";

  if (filter.type === "select") {
    return (
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
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
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
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
    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
      {filter.label}
      <input
        className={inputClass}
        type={filter.type === "date" ? "date" : "number"}
        placeholder={filter.type === "number" ? filter.placeholder : undefined}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
    </label>
  );
}
