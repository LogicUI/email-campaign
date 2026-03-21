import { HomePageShell } from "@/components/home/home-page-shell";
import { requirePageSession } from "@/core/auth/session";
import { getDashboardSummaryForUser } from "@/core/persistence/dashboard-summary";
import { ensureAppUser } from "@/core/persistence/users-repo";

export default async function HomePage() {
  const session = await requirePageSession({
    callbackUrl: "/",
  });

  const userId = await ensureAppUser({
    email: session.user.email,
    authSubject: session.user.id || session.user.email,
  });
  const initialSummary = await getDashboardSummaryForUser(userId);

  return <HomePageShell senderEmail={session.user.email} initialSummary={initialSummary} />;
}
