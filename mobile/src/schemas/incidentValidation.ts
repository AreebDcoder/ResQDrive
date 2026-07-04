import { z } from 'zod';

export const SEVERITY_OPTIONS = ['NONE', 'MINOR', 'MODERATE', 'SEVERE'] as const;
export const STATUS_OPTIONS = ['ACTIVE', 'RESOLVED', 'FALSE_ALARM'] as const;

const baseIncidentSchema = z.object({
  severity: z.enum(SEVERITY_OPTIONS).default('NONE'),
  status: z.enum(STATUS_OPTIONS).default('ACTIVE'),
  occurredAt: z.string().min(1, { message: 'Date and time are required' }),
  latitude: z.string().optional().or(z.number().optional()),
  longitude: z.string().optional().or(z.number().optional()),
  address: z.string().max(500, { message: 'Address must be at most 500 characters' }).optional(),
  description: z.string().max(2000, { message: 'Description must be at most 2000 characters' }).optional(),
});

const validateCoordinates = (data: any) => {
  if (data.latitude && data.longitude) {
    const lat = parseFloat(String(data.latitude));
    const lng = parseFloat(String(data.longitude));
    if (isNaN(lat) || lat < -90 || lat > 90) return false;
    if (isNaN(lng) || lng < -180 || lng > 180) return false;
  }
  return true;
};

export const createIncidentSchema = baseIncidentSchema.refine(validateCoordinates, {
  message: 'Invalid coordinates',
  path: ['latitude'],
});

export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;

export const updateIncidentSchema = baseIncidentSchema.partial().refine(validateCoordinates, {
  message: 'Invalid coordinates',
  path: ['latitude'],
});

export type UpdateIncidentInput = z.infer<typeof updateIncidentSchema>;