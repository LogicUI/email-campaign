export interface CampaignActionBarProps {
  hasCampaign: boolean;
  onOpenDashboard?: () => void;
  onOpenDatabaseSettings: () => void;
  onEditTemplate: () => void;
  onReupload: () => void;
}
