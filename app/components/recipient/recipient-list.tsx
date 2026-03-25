import { RecipientEmailCard } from "@/components/recipient/recipient-email-card";
import type { RecipientListProps } from "@/types/recipient-list";

export function RecipientList({
  emptyStateMessage = "No recipients available in this view.",
  recipientIds,
  senderEmail,
}: RecipientListProps) {
  if (recipientIds.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        {emptyStateMessage}
      </div>
    );
  }

  return (
    <div className="grid gap-5 grid-cols-1 md:grid-cols-2">
      {recipientIds.map((recipientId) => (
        <RecipientEmailCard
          key={recipientId}
          recipientId={recipientId}
          senderEmail={senderEmail}
        />
      ))}
    </div>
  );
}
