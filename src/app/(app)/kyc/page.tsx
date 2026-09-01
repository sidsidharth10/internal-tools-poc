import { Card, PageHeader } from "@/components/ui";

export default function KycPlaceholderPage() {
  return (
    <div>
      <PageHeader title="KYC Review Queue" />
      <Card className="p-4 text-sm text-slate-600">
        Not built yet. This app is deliberately the thinnest of the three: list,
        detail, status change, and query-layer redaction for the ops role.
      </Card>
    </div>
  );
}
