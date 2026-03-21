export interface FileUploadDropzoneProps {
  isImporting: boolean;
  error?: string | null;
  notice?: string | null;
  savedWorkbookLabel?: string;
  onFilesSelect: (files: FileList | File[] | null) => void;
  onImportFromDatabase?: () => void;
  onImportFromGoogle?: () => void;
  onRestoreSavedFile?: () => void;
}
