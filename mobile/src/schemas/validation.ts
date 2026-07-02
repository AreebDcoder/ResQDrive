import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, { message: 'Password must be at least 8 characters long' })
  .regex(/[0-9]/, { message: 'Password must contain at least one number' })
  .regex(/[!@#$%^&*(),.?":{}|<>]/, { message: 'Password must contain at least one special character' });

export const loginSchema = z.object({
  emailOrPhone: z.string().min(1, { message: 'Email or phone number is required' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

export const registerSchema = z
  .object({
    fullName: z.string().min(2, { message: 'Name must be at least 2 characters long' }),
    email: z.string().email({ message: 'Please enter a valid email address' }),
    phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, {
      message: 'Enter a valid international phone number (e.g. +923001234567)',
    }),
    password: passwordSchema,
    confirmPassword: z.string(),
    role: z.enum(['DRIVER', 'MECHANIC']),
    // Driver Details (Optional in Zod, but verified conditionally)
    cnicNumber: z.string().optional(),
    drivingLicenseNumber: z.string().optional(),
    // Mechanic Details (Optional in Zod, but verified conditionally)
    workshopName: z.string().optional(),
    workshopAddress: z.string().optional(),
    specialization: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine(
    (data) => {
      if (data.role === 'DRIVER') {
        return !!data.cnicNumber && data.cnicNumber.trim().length > 0;
      }
      return true;
    },
    {
      message: 'CNIC number is required for Driver registration',
      path: ['cnicNumber'],
    }
  )
  .refine(
    (data) => {
      if (data.role === 'DRIVER') {
        return !!data.drivingLicenseNumber && data.drivingLicenseNumber.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Driving license number is required for Driver registration',
      path: ['drivingLicenseNumber'],
    }
  )
  .refine(
    (data) => {
      if (data.role === 'MECHANIC') {
        return !!data.workshopName && data.workshopName.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Workshop name is required for Mechanic registration',
      path: ['workshopName'],
    }
  )
  .refine(
    (data) => {
      if (data.role === 'MECHANIC') {
        return !!data.workshopAddress && data.workshopAddress.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Workshop address is required for Mechanic registration',
      path: ['workshopAddress'],
    }
  )
  .refine(
    (data) => {
      if (data.role === 'MECHANIC') {
        return !!data.specialization && data.specialization.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Workshop specialization is required for Mechanic registration',
      path: ['specialization'],
    }
  );

export const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, { message: 'Reset token is required' }),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const updateProfileSchema = z.object({
  fullName: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, {
    message: 'Enter a valid international phone number',
  }),
  cnicNumber: z.string().optional(),
  drivingLicenseNumber: z.string().optional(),
  workshopName: z.string().optional(),
  workshopAddress: z.string().optional(),
  specialization: z.string().optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { message: 'Current password is required' }),
    newPassword: passwordSchema,
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'New passwords do not match',
    path: ['confirmNewPassword'],
  });
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
