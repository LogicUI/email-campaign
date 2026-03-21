"use client";

import { Database, FolderClock, Send } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardSummaryResponseData } from "@/types/database";

export function DashboardHome(props: {
  summary: DashboardSummaryResponseData;
  error?: string | null;
  isLoading?: boolean;
  onOpenDatabaseSettings: () => void;
  onOpenWorkspace: () => void;
  onOpenSavedList: (savedListId: string) => void;
  onRefresh: () => Promise<void>;
  onReuseCampaign: (campaignId: string) => void;
}) {
  const {
    summary,
    error,
    isLoading = false,
    onOpenDatabaseSettings,
    onOpenSavedList,
    onOpenWorkspace,
    onRefresh,
    onReuseCampaign,
  } = props;

  return (
    <div className="grid gap-6">
      <div className="rounded-[2rem] border bg-white/80 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">
              Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Saved lists and send history
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Reuse uploaded recipient lists, reopen previous send runs, and manage the
              current database connection from one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void onRefresh()} disabled={isLoading}>
              {isLoading ? "Refreshing..." : "Refresh"}
            </Button>
            <Button variant="outline" onClick={onOpenWorkspace}>
              Upload new file
            </Button>
            <Button onClick={onOpenDatabaseSettings}>
              <Database className="h-4 w-4" />
              Connect database
            </Button>
          </div>
        </div>
      </div>

      {error ? (
        <Alert className="border-destructive/40 bg-destructive/5 text-destructive">
          <AlertTitle>Unable to load dashboard data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-[1.75rem]">
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FolderClock className="h-4 w-4" />
                Saved recipient lists
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Stored imports from your uploaded Excel files.
              </p>
            </div>
            <Badge variant="outline">{summary.savedLists.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.savedLists.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No database-backed recipient lists yet. Upload a file, review it, then save it
                to the database.
              </p>
            ) : (
              summary.savedLists.map((savedList) => (
                <div key={savedList.id} className="rounded-2xl border bg-muted/25 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{savedList.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {savedList.sourceFileLabel} · {savedList.rowCount} rows · saved{" "}
                        {new Date(savedList.updatedAt).toLocaleString()}
                      </p>
                    </div>
                    {savedList.destinationTableName ? (
                      <Badge variant="secondary">{savedList.destinationTableName}</Badge>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => onOpenSavedList(savedList.id)}>
                      Open in workspace
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem]">
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Sent campaign history
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Queryable send runs that can be reopened into the workspace.
              </p>
            </div>
            <Badge variant="outline">{summary.campaigns.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.campaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No sent campaign history has been written to the database yet.
              </p>
            ) : (
              summary.campaigns.map((campaign) => (
                <div key={campaign.id} className="rounded-2xl border bg-muted/25 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{campaign.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {campaign.sentCount} sent · {campaign.failedCount} failed · created{" "}
                        {new Date(campaign.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="secondary">{campaign.sourceType}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => onReuseCampaign(campaign.id)}>
                      Reuse recipients
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
