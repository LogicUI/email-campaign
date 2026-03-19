import { CampaignBuilderPage } from "@/components/campaign/campaign-builder-page";
import { requirePageSession } from "@/core/auth/session";

export default async function HomePage() {
  const session = await requirePageSession({
    callbackUrl: "/",
  });

  return <CampaignBuilderPage senderEmail={session.user.email} />;
}
