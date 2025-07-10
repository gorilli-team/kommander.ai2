
import { z } from 'zod';

// Schema per password complessa
const complexPasswordSchema = z.string()
  .min(8, { message: "Password must be at least 8 characters." })
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)."
  });

export const LoginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});
export type LoginFormData = z.infer<typeof LoginSchema>;

// Schema per la registrazione diretta
export const RegisterSchema = z.object({
  name: z.string().optional(),
  email: z.string().email({ message: "Invalid email address." }),
  password: complexPasswordSchema,
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"], // Applica l'errore al campo confirmPassword
});
export type RegisterFormData = z.infer<typeof RegisterSchema>;

// Schema per la verifica OTP
export const OtpSchema = z.object({
  otp: z.string().length(6, { message: "OTP must be 6 digits." }).regex(/^\d{6}$/, { message: "OTP must be 6 digits."}),
  email: z.string().email({ message: "Invalid email address." }),
});
export type OtpFormData = z.infer<typeof OtpSchema>;

// Schema per l'inizializzazione della registrazione (prima dell'OTP)
export const InitialRegisterSchema = z.object({
  name: z.string().optional(),
  email: z.string().email({ message: "Invalid email address." }),
  password: complexPasswordSchema,
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});
export type InitialRegisterFormData = z.infer<typeof InitialRegisterSchema>;

// Schema per richiesta reset password
export const ForgotPasswordSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
});
export type ForgotPasswordFormData = z.infer<typeof ForgotPasswordSchema>;

// Schema per reset password con token
export const ResetPasswordSchema = z.object({
  token: z.string().min(1, { message: "Reset token is required." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: complexPasswordSchema,
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});
export type ResetPasswordFormData = z.infer<typeof ResetPasswordSchema>;

// Schema per cambio password (utente autenticato)
export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, { message: "Current password is required." }),
  newPassword: complexPasswordSchema,
  confirmNewPassword: z.string(),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: "Passwords do not match.",
  path: ["confirmNewPassword"],
});
export type ChangePasswordFormData = z.infer<typeof ChangePasswordSchema>;
