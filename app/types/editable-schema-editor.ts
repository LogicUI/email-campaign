import type { InferredDatabaseColumn } from "@/types/database";

export interface EditableSchemaEditorProps {
  columns: InferredDatabaseColumn[];
  onChange: (columns: InferredDatabaseColumn[]) => void;
  previewRows: Array<{
    rowIndex: number;
    values: string[];
  }>;
  destinationColumns: Array<{
    destinationColumn: string;
    sourceHeader: string;
    type?: string;
    nullable?: boolean;
  }>;
  disabled?: boolean;
}
