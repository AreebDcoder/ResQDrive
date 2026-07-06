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
        return !!data.cnicNumber && /^\d{5}-\d{7}-\d{1}$/.test(data.cnicNumber);
      }
      return true;
    },
    {
      message: 'CNIC is required in standard format (e.g., 42101-1234567-1)',
      path: ['cnicNumber'],
    }
  )
  .refine(
    (data) => {
      if (data.role === 'DRIVER') {
        return !!data.drivingLicenseNumber && /^[A-Za-z0-9\-\/\s]{5,20}$/.test(data.drivingLicenseNumber);
      }
      return true;
    },
    {
      message: 'Driving license is required in a valid format (e.g., LHR-12345)',
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
  cnicNumber: z.string().regex(/^\d{5}-\d{7}-\d{1}$/, {
    message: 'CNIC must be in standard format (e.g., 42101-1234567-1)',
  }).optional().or(z.literal('')),
  drivingLicenseNumber: z.string().regex(/^[A-Za-z0-9\-\/\s]{5,20}$/, {
    message: 'Driving license must be in a valid format (e.g., LHR-12345)',
  }).optional().or(z.literal('')),
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

export const vehicleSchema = z.object({
  make: z.string().min(1, { message: 'Make is required' }),
  model: z.string().min(1, { message: 'Model is required' }),
  year: z.preprocess(
    (val) => parseInt(val as string, 10),
    z.number()
      .min(1980, { message: 'Year must be 1980 or later' })
      .max(new Date().getFullYear() + 1, { message: 'Invalid future year' })
  ),
  color: z.string().optional(),
  licensePlate: z.string().regex(/^[A-Za-z0-9\s\-]{3,15}$/, {
    message: 'License plate must be a valid format (e.g. ABC-123 or LEA-15-2839)',
  }),
});

export const insuranceSchema = z.object({
  providerName: z.string().optional(),
  policyNumber: z.string().optional(),
  coverageType: z.string().optional(),
  expiryDate: z.string().optional(),
  emergencyHelpline: z.string().optional(),
});

export const contactSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, {
    message: 'Enter a valid international phone number (e.g. +923001234567)',
  }),
  email: z.string().email({ message: 'Please enter a valid email address' }),
  relationship: z.string().min(1, { message: 'Relationship is required' }),
  priorityOrder: z.preprocess(
    (val) => (val ? parseInt(val as string, 10) : undefined),
    z.number().min(1).max(5).optional()
  ),
});

export type VehicleInput = z.infer<typeof vehicleSchema>;
export type InsuranceInput = z.infer<typeof insuranceSchema>;
export type ContactInput = z.infer<typeof contactSchema>;

