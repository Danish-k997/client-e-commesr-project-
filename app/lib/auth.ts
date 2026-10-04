import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { after } from "next/server";
import { Resend } from "resend";

import { mongoClient, mongoDb } from "./auth-db";

const resendApiKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM ?? "KASAR DIMENSIONS <onboarding@resend.dev>";
const resend = new Resend(resendApiKey);

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");

const buildVerificationEmailHtml = (name: string, url: string) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #18181b; background: #faf9f5; padding: 32px; border: 1px solid #e4e2dc; border-radius: 20px;">
    <div style="margin-bottom: 18px; text-align: center;">
      <div style="display: inline-block; background: #ccff00; color: #18181b; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; padding: 8px 12px; border-radius: 999px;">KASAR DIMENSIONS</div>
    </div>
    <h1 style="margin: 0 0 16px; font-size: 32px; line-height: 1.1; letter-spacing: -0.04em;">Verify your email</h1>
    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #18181b;">
      Hello ${escapeHtml(name || "there")},
    </p>
    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.7; color: #71717a;">
      Please verify your email address to secure your KASAR studio account and unlock project access.
    </p>
    <p style="margin: 0 0 28px;">
      <a href="${url}" style="display: inline-block; background: #ccff00; color: #18181b; text-decoration: none; font-weight: 700; padding: 14px 22px; border-radius: 12px;">Verify email</a>
    </p>
    <p style="margin: 0 0 10px; font-size: 14px; line-height: 1.7; color: #71717a;">
      If the button above does not work, use this link:
    </p>
    <p style="margin: 0; word-break: break-all; font-size: 14px; line-height: 1.7; color: #18181b;">
      ${url}
    </p>
  </div>
`;

const buildPasswordResetEmailHtml = (name: string, url: string) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #18181b; background: #faf9f5; padding: 32px; border: 1px solid #e4e2dc; border-radius: 20px;">
    <div style="margin-bottom: 18px; text-align: center;">
      <div style="display: inline-block; background: #ccff00; color: #18181b; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; padding: 8px 12px; border-radius: 999px;">KASAR DIMENSIONS</div>
    </div>
    <h1 style="margin: 0 0 16px; font-size: 32px; line-height: 1.1; letter-spacing: -0.04em;">Reset your password</h1>
    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #18181b;">
      Hello ${escapeHtml(name || "there")},
    </p>
    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.7; color: #71717a;">
      We received a request to reset the password for your KASAR account. Use the button below to set a new password.
    </p>
    <p style="margin: 0 0 28px;">
      <a href="${url}" style="display: inline-block; background: #ccff00; color: #18181b; text-decoration: none; font-weight: 700; padding: 14px 22px; border-radius: 12px;">Reset password</a>
    </p>
    <p style="margin: 0 0 10px; font-size: 14px; line-height: 1.7; color: #71717a;">
      If you did not request this, you can safely ignore this email.
    </p>
    <p style="margin: 0; word-break: break-all; font-size: 14px; line-height: 1.7; color: #18181b;">
      ${url}
    </p>
  </div>
`;

if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET is not defined");
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,
  database: mongodbAdapter(mongoDb, {
    client: mongoClient,
  }),
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "CUSTOMER",
        input: false,
      },
    },
  },
  advanced: {
    backgroundTasks: {
      handler: (task) =>
        after(async () => {
          await task;
        }),
    },
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    autoSignIn: false,
    resetPasswordTokenExpiresIn: 3600,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      if (!resendApiKey) {
        throw new Error("RESEND_API_KEY is not defined");
      }

      const response = await resend.emails.send({
        from: resendFrom,
        to: user.email,
        subject: "Reset your password",
        html: buildPasswordResetEmailHtml(user.name || "there", url),
      });

      if (response.error) {
        throw new Error(response.error.message ?? "Failed to send password reset email");
      }
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    expiresIn: 86400,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      if (!resendApiKey) {
        throw new Error("RESEND_API_KEY is not defined");
      }

      const response = await resend.emails.send({
        from: resendFrom,
        to: user.email,
        subject: "Verify your email",
        html: buildVerificationEmailHtml(user.name || "there", url),
      });

      if (response.error) {
        throw new Error(response.error.message ?? "Failed to send verification email");
      }
      console.info("Better Auth verification email accepted by Resend");
    },
  },
});