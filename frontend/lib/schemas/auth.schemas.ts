
import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});
export type LoginFormData = z.infer<typeof LoginSchema>;

// Schema per la registrazione diretta
export const RegisterSchema = z.object({
  name: z.string().optional(),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"], // Applica l'errore al campo confirmPassword
});
export type RegisterFormData = z.infer<typeof RegisterSchema>;

// OtpSchema non è più necessario per la registrazione diretta
// export const OtpSchema = z.object({
//   otp: z.string().length(6, { message: "OTP must be 6 digits." }).regex(/^\d{6}$/, { message: "OTP must be 6 digits."}),
// });
// export type OtpFormData = z.infer<typeof OtpSchema>;
