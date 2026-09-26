import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { AdminUpdateUserProfileDto } from './dto/admin-update-user-profile.dto';

/**
 * AdminService — admin user governance.
 *
 * Methods:
 *   - listUsers(page, limit, role?, isActive?)            [existing]
 *   - changeUserRole(userId, newRole)                     [existing]
 *   - changeUserStatus(userId, isActive)                  [existing]
 *   - verifyWorkshop(userId, isWorkshopVerified)          [existing — now sends email on approve]
 *   - deleteUser(userId)                                  [existing — hard delete]
 *   - createUser(dto)                                    [NEW Batch 5]
 *   - updateUserProfile(userId, dto)                      [NEW Batch 5]
 *   - forceLogout(userId)                                 [NEW Batch 5]
 *   - rejectWorkshop(userId, reason)                     [NEW Batch 5 — sends rejection email]
 *   - bulkDeactivate(userIds[])                          [NEW Batch 5]
 */
@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async listUsers(page = 1, limit = 10, role?: UserRole, isActive?: boolean) {
    const skip = (page - 1) * limit;

    // Build query conditions
    const where: any = {};
    if (role) {
      where.role = role;
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          driverDetails: true,
          mechanicDetails: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Sanitize output
    const sanitizedUsers = users.map((user) => {
      const { passwordHash, ...rest } = user;
      return rest;
    });

    return {
      users: sanitizedUsers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async changeUserRole(userId: string, newRole: UserRole) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (user.role === newRole) {
      return { message: `User is already in the ${newRole} role.` };
    }

    await this.prisma.$transaction(async (tx) => {
      // Update core role
      await tx.user.update({
        where: { id: userId },
        data: { role: newRole },
      });

      // Maintain extension tables. If transitioning to a new role, create a default details entry.
      if (newRole === UserRole.DRIVER) {
        await tx.driverDetails.upsert({
          where: { userId },
          update: {},
          create: { userId },
        });
      } else if (newRole === UserRole.MECHANIC) {
        await tx.mechanicDetails.upsert({
          where: { userId },
          update: {},
          create: { userId },
        });
      }
    });

    return { message: `Successfully updated user role to ${newRole}.` };
  }

  async changeUserStatus(userId: string, isActive: boolean) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });

    // If deactivated, revoke all refresh tokens to terminate sessions
    if (!isActive) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId },
      });
    }

    return { message: `Successfully ${isActive ? 'activated' : 'deactivated'} the user account.` };
  }

  /**
   * Approve a mechanic's workshop. After this, the mechanic appears in
   * "Find Nearest Workshop" results.
   *
   * Side effect: sends a workshop-approved email to the mechanic.
   * Email failures are non-blocking (queued for retry) — the approval
   * status change is what matters.
   */
  async verifyWorkshop(userId: string, isWorkshopVerified: boolean) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { mechanicDetails: true },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (user.role !== UserRole.MECHANIC) {
      throw new BadRequestException('User is not a Mechanic.');
    }

    const updated = await this.prisma.mechanicDetails.update({
      where: { userId },
      data: { isWorkshopVerified },
    });

    // Send approval email (non-blocking — queue for retry if SMTP down)
    if (isWorkshopVerified) {
      try {
        await this.emailService.sendWorkshopApprovedEmail(
          user.email,
          user.fullName,
          updated.workshopName,
        );
      } catch (err) {
        // Email queued or failed — approval still succeeded
        console.warn('[AdminService] Workshop approval email failed for', user.email, err);
      }
    }

    return {
      message: `Workshop verification status set to ${isWorkshopVerified}.`,
      workshopName: updated.workshopName,
      isWorkshopVerified: updated.isWorkshopVerified,
    };
  }

  async deleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    await this.prisma.user.delete({
      where: { id: userId },
    });

    return { message: 'User account has been permanently deleted.' };
  }

  // ─── BATCH 5 — New admin user management methods ───────────────────────────

  /**
   * Admin creates a new user. Can create any role (DRIVER, MECHANIC, ADMIN).
   *
   * Defaults:
   *   - isVerified: true (admin-created users skip email verification)
   *     unless dto.isVerified === false explicitly
   *   - isActive: true
   *
   * Role-specific extension tables (DriverDetails / MechanicDetails) are
   * upserted based on dto.role + dto.cnicNumber / dto.workshopName etc.
   */
  async createUser(dto: AdminCreateUserDto) {
    // Uniqueness checks (Prisma throws on unique-violation, but we want a
    // friendly error message before the transaction)
    const existingByEmail = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingByEmail) {
      throw new BadRequestException('A user with this email already exists.');
    }
    const existingByPhone = await this.prisma.user.findUnique({ where: { phoneNumber: dto.phoneNumber } });
    if (existingByPhone) {
      throw new BadRequestException('A user with this phone number already exists.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          fullName: dto.fullName,
          email: dto.email,
          phoneNumber: dto.phoneNumber,
          passwordHash,
          role: dto.role,
          isVerified: dto.isVerified ?? true, // admin-created users are auto-verified
          isActive: true,
        },
      });

      if (dto.role === UserRole.DRIVER) {
        await tx.driverDetails.create({
          data: {
            userId: created.id,
            cnicNumber: dto.cnicNumber,
            drivingLicenseNumber: dto.drivingLicenseNumber,
          },
        });
      } else if (dto.role === UserRole.MECHANIC) {
        await tx.mechanicDetails.create({
          data: {
            userId: created.id,
            workshopName: dto.workshopName,
            workshopAddress: dto.workshopAddress,
            specialization: dto.specialization,
            isWorkshopVerified: false, // mechanics must be approved by admin later
          },
        });
      }
      // ADMIN role has no extension table

      return created;
    });

    // Sanitize output (don't return passwordHash)
    const { passwordHash: _omit, ...sanitized } = user;
    void _omit;
    return {
      message: `User ${user.fullName} created with role ${user.role}.`,
      user: sanitized,
    };
  }

  /**
   * Admin override of user profile fields. Cannot change role (use /role
   * endpoint) or isActive (use /status endpoint).
   *
   * Role-specific fields (cnicNumber, drivingLicenseNumber, workshopName,
   * workshopAddress, specialization) are upserted into the right extension
   * table based on the user's current role.
   */
  async updateUserProfile(userId: string, dto: AdminUpdateUserProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { driverDetails: true, mechanicDetails: true },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    // Uniqueness checks for email/phone if they're being changed
    if (dto.email && dto.email !== user.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existing && existing.id !== userId) {
        throw new BadRequestException('This email is already in use by another account.');
      }
    }
    if (dto.phoneNumber && dto.phoneNumber !== user.phoneNumber) {
      const existing = await this.prisma.user.findUnique({ where: { phoneNumber: dto.phoneNumber } });
      if (existing && existing.id !== userId) {
        throw new BadRequestException('This phone number is already in use by another account.');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      // Update core user fields (only those present in dto)
      const coreUpdate: any = {};
      if (dto.fullName !== undefined) coreUpdate.fullName = dto.fullName;
      if (dto.email !== undefined) coreUpdate.email = dto.email;
      if (dto.phoneNumber !== undefined) coreUpdate.phoneNumber = dto.phoneNumber;
      if (dto.profilePictureUrl !== undefined) coreUpdate.profilePictureUrl = dto.profilePictureUrl;

      if (Object.keys(coreUpdate).length > 0) {
        await tx.user.update({ where: { id: userId }, data: coreUpdate });
      }

      // Update DriverDetails (if user is DRIVER and any driver field is in dto)
      const driverUpdate: any = {};
      if (dto.cnicNumber !== undefined) driverUpdate.cnicNumber = dto.cnicNumber;
      if (dto.drivingLicenseNumber !== undefined) driverUpdate.drivingLicenseNumber = dto.drivingLicenseNumber;

      if (Object.keys(driverUpdate).length > 0) {
        if (user.role === UserRole.DRIVER) {
          // upsert in case driverDetails row doesn't exist
          await tx.driverDetails.upsert({
            where: { userId },
            update: driverUpdate,
            create: { userId, ...driverUpdate },
          });
        } else {
          throw new BadRequestException('Cannot update driver details — user is not a DRIVER.');
        }
      }

      // Update MechanicDetails (if user is MECHANIC and any mechanic field is in dto)
      const mechanicUpdate: any = {};
      if (dto.workshopName !== undefined) mechanicUpdate.workshopName = dto.workshopName;
      if (dto.workshopAddress !== undefined) mechanicUpdate.workshopAddress = dto.workshopAddress;
      if (dto.specialization !== undefined) mechanicUpdate.specialization = dto.specialization;

      if (Object.keys(mechanicUpdate).length > 0) {
        if (user.role === UserRole.MECHANIC) {
          await tx.mechanicDetails.upsert({
            where: { userId },
            update: mechanicUpdate,
            create: { userId, ...mechanicUpdate },
          });
        } else {
          throw new BadRequestException('Cannot update workshop details — user is not a MECHANIC.');
        }
      }
    });

    // Return updated user (without passwordHash)
    const updated = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { driverDetails: true, mechanicDetails: true },
    });
    if (updated) {
      const { passwordHash: _omit, ...sanitized } = updated;
      void _omit;
      return { message: 'Profile updated.', user: sanitized };
    }
    return { message: 'Profile updated.' };
  }

  /**
   * Force-logout: deletes ALL refresh tokens for the user. Their access
   * token (short-lived, 15min) continues to work until it expires, but
   * they cannot refresh and will be kicked out on next 401.
   *
   * Use case: security incident, suspicious session, or admin support
   * ("user is locked out / stuck on a stale session").
   */
  async forceLogout(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    const deleted = await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
    return {
      message: `Force-logout complete. ${deleted.count} refresh token${deleted.count === 1 ? '' : 's'} revoked.`,
      revokedCount: deleted.count,
    };
  }

  /**
   * Reject a mechanic's workshop application. Sends a rejection email
   * containing the admin-provided reason so the mechanic knows what to fix.
   *
   * The mechanic is NOT deactivated — they just can't receive workshop
   * jobs until they re-apply and get approved.
   */
  async rejectWorkshop(userId: string, reason: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { mechanicDetails: true },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (user.role !== UserRole.MECHANIC) {
      throw new BadRequestException('User is not a Mechanic.');
    }

    // Mark as not verified (in case they were previously verified and admin is reverting)
    const updated = await this.prisma.mechanicDetails.update({
      where: { userId },
      data: { isWorkshopVerified: false },
    });

    // Send rejection email (non-blocking)
    try {
      await this.emailService.sendWorkshopRejectedEmail(
        user.email,
        user.fullName,
        updated.workshopName,
        reason,
      );
    } catch (err) {
      console.warn('[AdminService] Workshop rejection email failed for', user.email, err);
    }

    return {
      message: 'Workshop application rejected. Rejection email sent to mechanic.',
      workshopName: updated.workshopName,
      isWorkshopVerified: updated.isWorkshopVerified,
      reason,
    };
  }

  /**
   * Bulk deactivate multiple users in one transaction. Also revokes all
   * their refresh tokens (same as changeUserStatus(false) but batched).
   *
   * Returns the count of users actually deactivated + their IDs.
   */
  async bulkDeactivate(userIds: string[]) {
    // Validate that all IDs exist
    const found = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, isActive: true },
    });
    const foundIds = new Set(found.map((u) => u.id));
    const missing = userIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      throw new NotFoundException(`Users not found: ${missing.join(', ')}`);
    }
    // Only deactivate currently-active ones (idempotent)
    const eligible = found.filter((u) => u.isActive);
    if (eligible.length === 0) {
      return { count: 0, deactivatedIds: [] };
    }

    const eligibleIds = eligible.map((u) => u.id);

    await this.prisma.$transaction([
      // Deactivate all eligible users
      this.prisma.user.updateMany({
        where: { id: { in: eligibleIds } },
        data: { isActive: false },
      }),
      // Revoke all their refresh tokens
      this.prisma.refreshToken.deleteMany({
        where: { userId: { in: eligibleIds } },
      }),
    ]);

    return {
      count: eligibleIds.length,
      deactivatedIds: eligibleIds,
    };
  }
}
