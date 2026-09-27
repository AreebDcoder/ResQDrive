import { SetMetadata } from '@nestjs/common';

/**
 * AuditLog decorator — marks an admin endpoint for audit logging.
 *
 * Usage:
 *   @AuditLog('resolve_incident', 'Incident')
 *   @Patch('incidents/:id/resolve')
 *   async resolveIncident(@Param('id') id: string) { ... }
 *
 * The AuditLogInterceptor reads this metadata + captures:
 *   - the admin user (from request.user, populated by JwtAuthGuard)
 *   - the action name (first arg)
 *   - the resource type (second arg)
 *   - the resource ID (extracted from request params — uses 'id' by default,
 *     can be overridden via options.resourceIdParam)
 *   - before state (fetched via options.fetchBefore? callback)
 *   - after state (captured from response body)
 *   - IP + user-agent
 *
 * The interceptor writes the audit log AFTER the response is sent. Failures
 * to log are non-blocking — the original response is always returned.
 */
export interface AuditLogOptions {
  /** Param name in the URL that contains the resource ID (default: 'id') */
  resourceIdParam?: string;
  /**
   * Optional async function that fetches the resource state BEFORE the
   * mutation. Useful for capturing before/after diffs.
   * Receives the request object. Should return a JSON-serializable object.
   */
  fetchBefore?: (request: any) => Promise<any>;
  /**
   * Whether to capture the response body as the after-state (default: true).
   * Set to false for endpoints that return large binaries (PDF, CSV).
   */
  captureAfter?: boolean;
}

export const AUDIT_LOG_METADATA = 'audit_log_metadata';

export interface AuditLogMetadata {
  action: string;
  resourceType: string;
  options?: AuditLogOptions;
}

export function AuditLog(action: string, resourceType: string, options?: AuditLogOptions) {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    SetMetadata(AUDIT_LOG_METADATA, { action, resourceType, options } satisfies AuditLogMetadata)(
      target,
      propertyKey,
      descriptor,
    );
  };
}
