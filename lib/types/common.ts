export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  /** Additional resource-specific filters, e.g. { status: "CONFIRMED" } */
  [key: string]: string | number | boolean | undefined;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  errors?: Record<string, string[]>;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  userName: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
  ipAddress?: string;
  createdAt: string;
}
