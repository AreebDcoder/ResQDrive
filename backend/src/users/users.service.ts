import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        driverDetails: true,
        mechanicDetails: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

   const { fullName, phoneNumber, profilePictureUrl, pushToken, ...details } = updateProfileDto;

    if (phoneNumber && phoneNumber !== user.phoneNumber) {
      const conflictUser = await this.prisma.user.findUnique({
        where: { phoneNumber },
      });
      if (conflictUser) {
        throw new ConflictException('Phone number is already registered by another user.');
      }
    }

    await this.prisma.$transaction(async (tx) => {
    await tx.user.update({
  where: { id: userId },
  data: {
    fullName,
    phoneNumber,
    profilePictureUrl,
    pushToken,
  },
});
      if (user.role === UserRole.DRIVER) {
        await tx.driverDetails.upsert({
          where: { userId },
          update: {
            cnicNumber: details.cnicNumber,
            drivingLicenseNumber: details.drivingLicenseNumber,
          },
          create: {
            userId,
            cnicNumber: details.cnicNumber,
            drivingLicenseNumber: details.drivingLicenseNumber,
          },
        });
      } else if (user.role === UserRole.MECHANIC) {
        await tx.mechanicDetails.upsert({
          where: { userId },
          update: {
            workshopName: details.workshopName,
            workshopAddress: details.workshopAddress,
            specialization: details.specialization,
          },
          create: {
            userId,
            workshopName: details.workshopName,
            workshopAddress: details.workshopAddress,
            specialization: details.specialization,
          },
        });
      }
    });

    return this.getProfile(userId);
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Incorrect current password.');
    }

    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash },
      });

      await tx.refreshToken.deleteMany({
        where: { userId },
      });
    });

    return { message: 'Password updated successfully. You have been logged out of all devices.' };
  }

  async deleteAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Delete profile details
      await tx.driverDetails.deleteMany({ where: { userId } });
      await tx.mechanicDetails.deleteMany({ where: { userId } });

      // 2. Delete configuration and sessions
      await tx.refreshToken.deleteMany({ where: { userId } });
      await tx.passwordResetToken.deleteMany({ where: { userId } });
      await tx.deviceToken.deleteMany({ where: { userId } });
      await tx.notificationPreference.deleteMany({ where: { userId } });
      await tx.notificationLog.deleteMany({ where: { userId } });
      await tx.notificationSession.deleteMany({ where: { userId } });

      // 3. Delete logs & contacts
      await tx.crashSoundDetectionLog.deleteMany({ where: { userId } });
      await tx.voiceCommandLog.deleteMany({ where: { userId } });
      await tx.emergencyContact.deleteMany({ where: { userId } });
      await tx.locationSession.deleteMany({ where: { userId } });

      // 4. Delete user data records
      await tx.vehicle.deleteMany({ where: { userId } });
      await tx.damageAssessment.deleteMany({ where: { userId } });
      await tx.repairCostReport.deleteMany({ where: { userId } });
      await tx.incident.deleteMany({ where: { userId } });

      // 5. Finally delete the user account
      await tx.user.delete({ where: { id: userId } });
    });
  }
}
