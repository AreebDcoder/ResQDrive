import {
  Injectable, type NestInterceptor, type ExecutionContext, type CallHandler, Logger,
} from '@nestjs/common';
import { type Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { AUDIT_LOG_METADATA, type AuditLogMetadata } from './audit-log.decorator';
import { Reflector } from '@nestjs/core';

/**
 * AuditLogInterceptor — captures admin mutations and writes them to the
 * audit_logs table.
 *
 * Behavior:
 *   - Reads @AuditLog() metadata from the handler
 *   - Calls options.fetchBefore (if provided) BEFORE the handler runs to
 *     capture the resource state
 *   - Captures the response data (AFTER state)
 *   - Extracts IP from request (x-forwarded-for or socket.remoteAddress)
 *   - Extracts resource ID from request.params (uses options.resourceIdParam
 *     or 'id' by default)
 *   - Writes the audit log entry asynchronously — does NOT block the
 *     response. Errors are logged but do NOT fail the original request.
 *
 * Note: this interceptor must run AFTER JwtAuthGuard so request.user is
 * populated. Apply it as a method-level interceptor on each admin mutation
 * (or via @UseInterceptors(AuditLogInterceptor) on the controller class).
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const metadata = this.reflector.get<AuditLogMetadata>(AUDIT_LOG_METADATA, context.getHandler());

    // If the handler isn't decorated with @AuditLog(), pass through without logging
    if (!metadata) {
      return next.handle();
    }

    const { action, resourceType, options } = metadata;
    const resourceIdParam = options?.resourceIdParam ?? 'id';
    const resourceId = request.params?.[resourceIdParam];
    const adminUser = request.user; // populated by JwtAuthGuard

    // Capture before-state if a fetchBefore callback was provided
    let beforeState: any = undefined;
    if (options?.fetchBefore && adminUser) {
      try {
        beforeState = await options.fetchBefore(request);
      } catch (err) {
        this.logger.warn(`Failed to capture before-state for ${action}: ${err}`);
      }
    }

    // Continue to the handler. After it completes, capture the response as after-state.
    return next.handle().pipe(
      tap({
        next: (response) => {
          // Fire-and-forget — don't block the response with the audit write
          this.writeAuditLog({
            adminUserId: adminUser?.id,
            action,
            resourceType,
            resourceId,
            beforeState,
            afterState: options?.captureAfter === false ? undefined : response,
            request,
          }).catch((err) => {
            this.logger.error(`Failed to write audit log for ${action}: ${err?.message ?? err}`);
          });
        },
      }),
    );
  }

  private async writeAuditLog(params: {
    adminUserId?: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    beforeState?: any;
    afterState?: any;
    request: any;
  }) {
    if (!params.adminUserId) {
      // No authenticated user — skip logging (auth guard should have blocked already)
      this.logger.warn(`Skipping audit log for ${params.action} — no admin user ID in request`);
      return;
    }

    const ip = this.extractIp(params.request);
    const userAgent = params.request.headers?.['user-agent'];

    await this.prisma.auditLog.create({
      data: {
        adminUserId: params.adminUserId,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId || null,
        beforeState: params.beforeState ?? undefined,
        afterState: params.afterState ?? undefined,
        ipAddress: ip,
        userAgent,
      },
    });
  }

  private extractIp(request: any): string | null {
    const forwarded = request.headers?.['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      // x-forwarded-for may contain multiple IPs — take the leftmost (original client)
      return forwarded.split(',')[0].trim();
    }
    const remoteAddress = request.connection?.remoteAddress || request.socket?.remoteAddress;
    return remoteAddress || null;
  }
}
