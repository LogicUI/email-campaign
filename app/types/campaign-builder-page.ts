import type { DatabaseConnectionProfile, DatabaseSettingsOpenContext } from "@/types/database";

export interface CampaignBuilderPageProps {
  senderEmail?: string;
  connectionProfiles?: DatabaseConnectionProfile[];
  onOpenDashboard?: () => void;
  onOpenDatabaseSettings?: (context?: DatabaseSettingsOpenContext) => void;
  onSavedDataChange?: () => Promise<unknown> | void;
}
