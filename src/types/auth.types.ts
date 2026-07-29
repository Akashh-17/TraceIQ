import { z } from 'zod';

export const RegisterUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  tenantId: z.string().uuid('Invalid tenant ID format'),
});

export const LoginUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type RegisterUserDto = z.infer<typeof RegisterUserSchema>;
export type LoginUserDto = z.infer<typeof LoginUserSchema>;
