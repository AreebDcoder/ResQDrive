import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

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

    await this.prisma.mechanicDetails.update({
      where: { userId },
      data: { isWorkshopVerified },
    });

    return { message: `Workshop verification status set to ${isWorkshopVerified}.` };
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
}
