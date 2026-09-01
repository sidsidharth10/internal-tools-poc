import { Card, PageHeader } from "@/components/ui";

export default function RefundsPlaceholderPage() {
  return (
    <div>
      <PageHeader title="Refunds Dashboard" />
      <Card className="p-4 text-sm text-slate-600">
        Not built yet. This app is next: server-side filtering over 5,000+
        seeded refund requests, plus a value-gated approve/deny workflow.
      </Card>
    </div>
  );
}
