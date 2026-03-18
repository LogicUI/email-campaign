import { RecipientEmailCard } from "@/components/recipient/recipient-email-card";
import type { RecipientListProps } from "@/types/recipient-list";

export function RecipientList({ recipientIds }: RecipientListProps) {
  if (recipientIds.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        No recipients available on this page.
      </div>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {recipientIds.map((recipientId) => (
        <RecipientEmailCard key={recipientId} recipientId={recipientId} />
      ))}
    </div>
  );
}
