export interface InvalidRowAlertItem {
  rowIndex: number;
  sourceFileName?: string;
  email?: string;
  reason: string;
}

export interface InvalidRowAlertProps {
  invalidCount: number;
  rows?: InvalidRowAlertItem[];
}
