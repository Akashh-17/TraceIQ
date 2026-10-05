// src/types/common.types.ts

// T is a placeholder — when you USE ApiResponse, you replace T with the actual type
// ApiResponse<{ event_id: string }> means: data will be { event_id: string }
// ApiResponse<AuditEvent[]>         means: data will be AuditEvent[]

export interface ApiResponse<T> {
  success: boolean;
  data?: T;           // optional — error responses don't have data
  message: string;
}

// Paginated response — we'll use this in Phase 8 (Query API)
// Adding it now so the type exists when we need it
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  message: string;
  meta: {
    limit: number;
    has_next: boolean;
    cursor?: string;
  };
}