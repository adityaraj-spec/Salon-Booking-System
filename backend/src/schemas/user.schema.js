import { z } from "zod";

export const registerUserSchema = {
  body: z.object({
    fullName: z.string().trim().min(2, "Full name must be at least 2 characters"),
    email: z.string().trim().email("Invalid email address"),
    username: z.string().trim().min(3, "Username must be at least 3 characters").max(30),
    password: z.string().min(8, "Password must be at least 8 characters long"),
    phonenumber: z.string().trim().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
    role: z.enum(["customer", "salonOwner", "super_admin", "staff", "unassigned"]).optional(),
  }),
};

export const loginUserSchema = {
  body: z.object({
    username: z.string().trim().optional(),
    email: z.string().trim().email("Invalid email format").optional(),
    password: z.string().min(1, "Password is required"),
  }).refine((data) => data.username || data.email, {
    message: "Either username or email is required",
    path: ["email"],
  }),
};

export const verifyEmailSchema = {
  body: z.object({
    email: z.string().trim().email("Invalid email address"),
    code: z.string().trim().regex(/^\d{4}$/, "Verification code must be exactly 4 digits"),
  }),
};

export const resendVerificationSchema = {
  body: z.object({
    email: z.string().trim().email("Invalid email address"),
  }),
};

export const selectRoleSchema = {
  body: z.object({
    role: z.enum(["customer", "salonOwner"]),
  }),
};
