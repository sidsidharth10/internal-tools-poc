"use client";

import Link from "next/link";

import { DataTable, type Column } from "@/components/data-table";
import { Badge, Button } from "@/components/ui";
import { KYC_STATUSES } from "@/lib/domain";

import { STATUS_TONES } from "./status";

type ApplicantRow = {
  id: string;
  fullName: string;
  status: string;
  submittedAt: string;
};

const columns: Column<ApplicantRow>[] = [
  {
    key: "fullName",
    header: "Applicant",
    sortable: true,
    render: (row) => (
      <Link
        href={`/kyc/${row.id}`}
        className="font-medium text-ink underline-offset-2 hover:text-brand-700 hover:underline"
      >
        {row.fullName}
      </Link>
    ),
  },
  {
    key: "status",
    header: "Status",
    sortable: true,
    render: (row) => (
      <Badge tone={STATUS_TONES[row.status as keyof typeof STATUS_TONES]} dot>
        {row.status.replace("_", " ")}
      </Badge>
    ),
  },
  {
    key: "submittedAt",
    header: "Submitted",
    sortable: true,
    render: (row) => (
      <span className="tabular text-ink-soft">
        {new Date(row.submittedAt).toLocaleString()}
      </span>
    ),
  },
  {
    key: "actions",
    header: "",
    align: "right",
    render: (row) => (
      <Link href={`/kyc/${row.id}`}>
        <Button variant="secondary" size="sm">
          Review
        </Button>
      </Link>
    ),
  },
];

export function KycTable() {
  return (
    <DataTable
      endpoint="/api/kyc"
      rowKey={(row) => row.id}
      defaultSort={{ key: "submittedAt", dir: "desc" }}
      columns={columns}
      filters={[
        { type: "search", key: "search", placeholder: "Applicant name" },
        {
          type: "select",
          key: "status",
          label: "Status",
          options: KYC_STATUSES.map((status) => ({
            value: status,
            label: status,
          })),
        },
      ]}
    />
  );
}
