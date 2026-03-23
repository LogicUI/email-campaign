"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { useDashboardData } from "@/hooks/use-dashboard-data";
import type { DashboardSummaryResponseData, DatabaseSettingsOpenContext } from "@/types/database";

const DashboardHome = dynamic(
  () => import("@/components/dashboard/dashboard-home").then((mod) => mod.DashboardHome),
);
const CampaignBuilderPage = dynamic(
  () => import("@/components/campaign/campaign-builder-page").then((mod) => mod.CampaignBuilderPage),
);
const DatabaseSettingsDialog = dynamic(
  () =>
    import("@/components/settings/database-settings-dialog").then(
      (mod) => mod.DatabaseSettingsDialog,
    ),
);

export function HomePageShell(props: {
  initialSummary: DashboardSummaryResponseData;
  senderEmail: string;
}) {
  const { initialSummary, senderEmail } = props;
  const [mode, setMode] = useState<"dashboard" | "workspace">(
    initialSummary.hasSavedData ? "dashboard" : "workspace",
  );
  const [databaseDialogOpen, setDatabaseDialogOpen] = useState(false);
  const [databaseDialogContext, setDatabaseDialogContext] =
    useState<DatabaseSettingsOpenContext | null>(null);
  const { error, isLoading, openSavedList, refresh, reuseCampaign, summary } = useDashboardData({
    initialSummary,
    onOpenWorkspace: () => setMode("workspace"),
  });

  return (
    <>
      <main className="app-shell">
        <div className="container py-6 md:py-10">
          <div className="mx-auto flex max-w-7xl flex-col gap-6">
            {mode === "dashboard" ? (
              <DashboardHome
                summary={summary}
                error={error}
                isLoading={isLoading}
                onOpenDatabaseSettings={() => {
                  setDatabaseDialogContext({ source: "general" });
                  setDatabaseDialogOpen(true);
                }}
                onOpenSavedList={(savedListId) => void openSavedList(savedListId)}
                onOpenWorkspace={() => setMode("workspace")}
                onRefresh={() => refresh().then(() => undefined)}
                onReuseCampaign={(campaignId) => void reuseCampaign(campaignId)}
              />
            ) : (
              <CampaignBuilderPage
                senderEmail={senderEmail}
                connectionProfiles={summary.connectionProfiles}
                onOpenDashboard={summary.hasSavedData ? () => setMode("dashboard") : undefined}
                onOpenDatabaseSettings={(context) => {
                  setDatabaseDialogContext(context ?? { source: "general" });
                  setDatabaseDialogOpen(true);
                }}
                onSavedDataChange={refresh}
              />
            )}
          </div>
        </div>
      </main>

      <DatabaseSettingsDialog
        open={databaseDialogOpen}
        onOpenChange={(nextOpen) => {
          setDatabaseDialogOpen(nextOpen);
          if (!nextOpen) {
            setDatabaseDialogContext(null);
          }
        }}
        initialProfiles={summary.connectionProfiles}
        importPreview={databaseDialogContext?.preview ?? null}
        origin={databaseDialogContext?.source ?? "general"}
        onProfilesUpdated={() => refresh().then(() => undefined)}
      />
    </>
  );
}
