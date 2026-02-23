export type AuditAction =
  | 'login'
  | 'login_failed'
  | 'logout'
  | 'review_submitted'
  | 'admin_page_access'
  | 'unauthorized_access_attempt'
  | 'token_refresh'
  | 'search_performed';

export interface AuditEvent {
  timestamp: string;
  sessionId: string;
  userId: string | null;
  action: AuditAction;
  target: string | null;
  metadata: Record<string, unknown>;
  correlationId: string;
}
