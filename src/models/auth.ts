import { z } from "zod";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address").max(254, "Email is too long"));

// bcrypt only hashes the first 72 bytes of its input, so longer passwords are
// rejected rather than silently truncated.
const newPassword = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .refine((value) => new TextEncoder().encode(value).length <= 72, {
    message: "Password must be at most 72 bytes",
  })
  .refine((value) => /[a-zA-Z]/.test(value) && /\d/.test(value), {
    message: "Password must contain a letter and a number",
  });

const name = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(80, "Name must be at most 80 characters");

export const registerSchema = z.object({ name, email, password: newPassword });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required").max(200),
});

export const updateProfileSchema = z.object({ name });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required").max(200),
    newPassword,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from the current one",
    path: ["newPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

/** The user fields that are safe to send to the browser. */
export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
};

/** Error body returned by every API route. */
export type ApiError = {
  error: string;
  fieldErrors?: Record<string, string[]>;
};
