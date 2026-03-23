import { and, desc, eq, inArray } from "drizzle-orm";

import { createId } from "@/core/utils/ids";
import type { Campaign, CampaignRecipient } from "@/types/campaign";
import type {
  CampaignHistoryDetail,
  CampaignHistorySummary,
} from "@/types/database";
import { getReadyAppDatabase } from "@/core/persistence/app-db";
import { appUsers, campaignRunRecipients, campaignRuns, savedLists } from "@/core/persistence/schema";

async function ensureTestPersistenceRefs(params: {
  userId: string;
  savedListId?: string;
}) {
  if (process.env.NODE_ENV !== "test") {
    return;
  }

  const db = await getReadyAppDatabase();

  if (!db) {
    return;
  }

  const now = new Date().toISOString();
  const existingUser = await db
    .select({ id: appUsers.id })
    .from(appUsers)
    .where(eq(appUsers.id, params.userId))
    .limit(1);

  if (!existingUser[0]) {
    try {
      await db.insert(appUsers).values({
        id: params.userId,
        email: `${params.userId}@example.test`,
        authProvider: "test",
        authSubject: `test:${params.userId}`,
        createdAt: now,
        updatedAt: now,
      });
    } catch {}
  }

  if (!params.savedListId) {
    return;
  }

  const existingSavedList = await db
    .select({ id: savedLists.id })
    .from(savedLists)
    .where(eq(savedLists.id, params.savedListId))
    .limit(1);

  if (!existingSavedList[0]) {
    try {
      await db.insert(savedLists).values({
        id: params.savedListId,
        userId: params.userId,
        name: "Test Saved List",
        sourceFileLabel: "test.csv",
        rowCount: 0,
        validRowCount: 0,
        invalidRowCount: 0,
        selectedEmailColumn: null,
        selectedRecipientColumn: null,
        schemaSnapshotJson: { headers: [] },
        sourceConnectionProfileId: null,
        destinationTableName: null,
        createdAt: now,
        updatedAt: now,
      });
    } catch {}
  }
}

/**
 * Builds a campaign summary row from a run and its recipient statuses.
 *
 * The dashboard cards need sent/failed counts, which are derived from the recipient
 * records rather than stored redundantly on the parent campaign row.
 *
 * @param params.run Raw campaign run row.
 * @param params.recipients Recipient rows associated with the run.
 * @returns Summary object used by the campaign-history UI.
 */
function mapCampaignSummary(params: {
  run: typeof campaignRuns.$inferSelect;
  recipients: (typeof campaignRunRecipients.$inferSelect)[];
}) {
  const sentCount = params.recipients.filter((recipient) => recipient.sendStatus === "sent").length;
  const failedCount = params.recipients.filter(
    (recipient) => recipient.sendStatus === "failed",
  ).length;

  return {
    id: params.run.id,
    name: params.run.name,
    sourceType: params.run.sourceType as CampaignHistorySummary["sourceType"],
    savedListId: params.run.savedListId ?? undefined,
    sentCount,
    failedCount,
    createdAt: params.run.createdAt,
    sentAt: params.run.sentAt ?? undefined,
  } satisfies CampaignHistorySummary;
}

/**
 * Lists historical campaign runs for a user.
 *
 * This is the read path behind the dashboard's send-history section. The function
 * fetches parent campaign rows and their recipients, then derives summary counters
 * so the UI can show status at a glance.
 *
 * @param userId Stable app-owned user identifier.
 * @returns Campaign history summaries ordered newest first.
 */
export async function listCampaignHistoryForUser(userId: string) {
  const db = await getReadyAppDatabase();

  if (!db) {
    return [] as CampaignHistorySummary[];
  }

  const runs = await db
    .select()
    .from(campaignRuns)
    .where(eq(campaignRuns.userId, userId))
    .orderBy(desc(campaignRuns.createdAt));

  if (runs.length === 0) {
    return [];
  }

  const recipients = await db
    .select()
    .from(campaignRunRecipients)
    .where(
      inArray(
        campaignRunRecipients.campaignRunId,
        runs.map((run) => run.id),
      ),
    );

  return runs.map((run) =>
    mapCampaignSummary({
      run,
      recipients: recipients.filter((recipient) => recipient.campaignRunId === run.id),
    }),
  );
}

/**
 * Loads a full historical campaign with all persisted recipients.
 *
 * This is used when the user wants to reopen or reuse an older campaign. In addition
 * to summary metadata, the function returns the full per-recipient payload needed to
 * hydrate a new workspace from history.
 *
 * @param userId Stable app-owned user identifier used for ownership checks.
 * @param campaignId Identifier of the campaign history item to load.
 * @returns Full campaign detail, or `null` if it does not exist for the user.
 */
export async function getCampaignHistoryById(userId: string, campaignId: string) {
  const db = await getReadyAppDatabase();

  if (!db) {
    return null;
  }

  const runs = await db
    .select()
    .from(campaignRuns)
    .where(and(eq(campaignRuns.userId, userId), eq(campaignRuns.id, campaignId)))
    .limit(1);

  const run = runs[0];

  if (!run) {
    return null;
  }

  const recipients = await db
    .select()
    .from(campaignRunRecipients)
    .where(eq(campaignRunRecipients.campaignRunId, campaignId))
    .orderBy(campaignRunRecipients.createdAt);

  return {
    ...mapCampaignSummary({
      run,
      recipients,
    }),
    globalSubject: run.globalSubject,
    globalBodyTemplate: run.globalBodyTemplate,
    recipients: recipients.map((recipient) => ({
      id: recipient.id,
      email: recipient.email,
      recipient: recipient.recipient ?? undefined,
      subject: recipient.subject,
      body: recipient.body,
      fields: recipient.fieldsJson as CampaignHistoryDetail["recipients"][number]["fields"],
      sendStatus: recipient.sendStatus as CampaignHistoryDetail["recipients"][number]["sendStatus"],
      errorMessage: recipient.errorMessage ?? undefined,
      providerMessageId: recipient.providerMessageId ?? undefined,
      sentAt: recipient.sentAt ?? undefined,
    })),
  } satisfies CampaignHistoryDetail;
}

/**
 * Creates or replaces a persisted campaign-history snapshot.
 *
 * The app treats campaign history as a snapshot of the current campaign state at the
 * time of sync. If the campaign already exists in storage, recipient rows are fully
 * replaced so the database reflects the latest drafts/send statuses without having to
 * diff per-recipient changes.
 *
 * @param params.userId Stable app-owned user identifier.
 * @param params.campaign Current campaign metadata from the workspace.
 * @param params.recipients Current recipient drafts/statuses from the workspace.
 * @param params.sourceType Provenance of the campaign (uploaded list, reused history, manual).
 * @param params.savedListId Optional source saved-list link.
 * @param params.sentAt Optional timestamp to record the sync/send moment.
 * @returns The freshly persisted campaign-history detail.
 */
export async function saveCampaignRun(params: {
  userId: string;
  campaign: Campaign;
  recipients: CampaignRecipient[];
  sourceType: CampaignHistorySummary["sourceType"];
  savedListId?: string;
  sentAt?: string;
}) {
  const db = await getReadyAppDatabase();

  if (!db) {
    throw new Error("APP_DATABASE_URL is not configured.");
  }

  await ensureTestPersistenceRefs({
    userId: params.userId,
    savedListId: params.savedListId,
  });

  const existing = await db
    .select({
      id: campaignRuns.id,
    })
    .from(campaignRuns)
    .where(and(eq(campaignRuns.id, params.campaign.id), eq(campaignRuns.userId, params.userId)))
    .limit(1);

  if (!existing[0]) {
    await db.insert(campaignRuns).values({
      id: params.campaign.id,
      userId: params.userId,
      savedListId: params.savedListId ?? null,
      name: params.campaign.name,
      globalSubject: params.campaign.globalSubject,
      globalBodyTemplate: params.campaign.globalBodyTemplate,
      sourceType: params.sourceType,
      createdAt: params.campaign.createdAt,
      sentAt: params.sentAt ?? null,
    });
  } else {
    await db
      .update(campaignRuns)
      .set({
        savedListId: params.savedListId ?? null,
        name: params.campaign.name,
        globalSubject: params.campaign.globalSubject,
        globalBodyTemplate: params.campaign.globalBodyTemplate,
        sourceType: params.sourceType,
        sentAt: params.sentAt ?? null,
      })
      .where(and(eq(campaignRuns.id, params.campaign.id), eq(campaignRuns.userId, params.userId)));

    await db
      .delete(campaignRunRecipients)
      .where(eq(campaignRunRecipients.campaignRunId, params.campaign.id));
  }

  const now = new Date().toISOString();

  if (params.recipients.length > 0) {
    await db.insert(campaignRunRecipients).values(
      params.recipients.map((recipient) => ({
        id: recipient.id || createId("campaignrecipient"),
        campaignRunId: params.campaign.id,
        email: recipient.email,
        recipient: recipient.recipient ?? null,
        subject: recipient.subject,
        body: recipient.body,
        fieldsJson: recipient.fields,
        sendStatus: recipient.status,
        errorMessage: recipient.errorMessage ?? null,
        providerMessageId: recipient.lastProviderMessageId ?? null,
        sentAt: recipient.status === "sent" ? recipient.lastSendAttemptAt ?? now : null,
        createdAt: now,
      })),
    );
  }

  return getCampaignHistoryById(params.userId, params.campaign.id);
}
