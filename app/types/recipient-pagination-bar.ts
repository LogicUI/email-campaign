export interface RecipientPaginationBarProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalRecipients: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}
