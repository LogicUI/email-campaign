export interface FileUploadDropzoneProps {
  isImporting: boolean;
  error?: string | null;
  onFileSelect: (file: File | null) => void;
}
