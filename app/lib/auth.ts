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

const resolveProductionHost = (request?: Request): string => {
  if (request) {
    const forwardedHost = request.headers.get("x-forwarded-host");
    if (forwardedHost) return forwardedHost.split(",")[0].trim();
    const host = request.headers.get("host");
    if (host) return host.split(",")[0].trim();
  }

  if (process.env.RENDER_EXTERNAL_HOSTNAME) {
    return process.env.RENDER_EXTERNAL_HOSTNAME;
  }
  if (process.env.RENDER_EXTERNAL_URL) {
    try {
      return new URL(process.env.RENDER_EXTERNAL_URL).host;
    } catch {
      // ignore
    }
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return process.env.VERCEL_PROJECT_PRODUCTION_URL;
  }
  if (process.env.VERCEL_URL) {
    return process.env.VERCEL_URL;
  }
  if (process.env.BETTER_AUTH_URL) {
    try {
      const url = new URL(process.env.BETTER_AUTH_URL);
      if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
        return url.host;
      }
    } catch {
      // ignore
    }
  }

  return "client-e-commesr-project.onrender.com";
};

const resolveFallbackBaseURL = (): string => {
  if (process.env.BETTER_AUTH_URL) {
    try {
      const url = new URL(process.env.BETTER_AUTH_URL);
      if (
        process.env.NODE_ENV === "production" &&
        (url.hostname === "localhost" || url.hostname === "127.0.0.1")
      ) {
        // In production, ignore misconfigured localhost:3000
      } else {
        return process.env.BETTER_AUTH_URL;
      }
    } catch {
      // ignore
    }
  }

  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL;
  }
  if (process.env.RENDER_EXTERNAL_HOSTNAME) {
    return `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  if (process.env.NODE_ENV === "production") {
    return "https://client-e-commesr-project.onrender.com";
  }

  return "http://localhost:3000";
};

const allowedHosts = Array.from(
  new Set([
    "localhost:3000",
    "127.0.0.1:3000",
    "client-e-commesr-project.onrender.com",
    "client-e-commesr-project.vercel.app",
    "client-e-commesr-project-q6cxmls9c.vercel.app",
    ...(process.env.RENDER_EXTERNAL_HOSTNAME ? [process.env.RENDER_EXTERNAL_HOSTNAME] : []),
    ...(process.env.VERCEL_URL ? [process.env.VERCEL_URL] : []),
    ...(process.env.BETTER_AUTH_URL
      ? [
          (() => {
            try {
              return new URL(process.env.BETTER_AUTH_URL).host;
            } catch {
              return process.env.BETTER_AUTH_URL;
            }
          })(),
        ]
      : []),
    ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS
      ? process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(",")
          .map((origin) => {
            try {
              return new URL(origin.trim()).host;
            } catch {
              return origin.trim();
            }
          })
          .filter(Boolean)
      : []),
  ])
);

const configuredOrigins = [
  "http://localhost:3000",
  "https://client-e-commesr-project.vercel.app",
  "https://client-e-commesr-project-q6cxmls9c.vercel.app",
  "https://client-e-commesr-project.onrender.com",
  ...(process.env.RENDER_EXTERNAL_URL ? [process.env.RENDER_EXTERNAL_URL] : []),
  ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
  ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
  ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS
    ? process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    : []),
];

const trustedOrigins = Array.from(new Set(configuredOrigins));

const sanitizeAuthLink = (rawUrl: string, request?: Request): string => {
  try {
    const parsed = new URL(rawUrl);
    const isLocalhost =
      parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";

    if (isLocalhost && process.env.NODE_ENV === "production") {
      const prodHost = resolveProductionHost(request);
      const proto = request?.headers.get("x-forwarded-proto") || "https";

      parsed.protocol = `${proto}:`;
      parsed.host = prodHost;
    }

    const callbackParam = parsed.searchParams.get("callbackURL");
    if (callbackParam) {
      try {
        const callbackUrl = new URL(callbackParam, parsed.origin);
        if (
          (callbackUrl.hostname === "localhost" ||
            callbackUrl.hostname === "127.0.0.1") &&
          process.env.NODE_ENV === "production"
        ) {
          callbackUrl.protocol = parsed.protocol;
          callbackUrl.host = parsed.host;
          parsed.searchParams.set("callbackURL", callbackUrl.toString());
        }
      } catch {
        // relative callbackURL is preserved
      }
    }

    return parsed.toString();
  } catch {
    return rawUrl;
  }
};

export const auth = betterAuth({
  baseURL: {
    allowedHosts,
    fallback: resolveFallbackBaseURL(),
    protocol: "auto",
  },
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins,
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
    trustedProxyHeaders: true,
    ipAddress: {
      ipAddressHeaders: [
        "x-render-client-ip",
        "cf-connecting-ip",
        "x-real-ip",
        "x-forwarded-for",
      ],
    },
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
    sendResetPassword: async ({ user, url }, request) => {
      if (!resendApiKey) {
        throw new Error("RESEND_API_KEY is not defined");
      }

      const safeUrl = sanitizeAuthLink(url, request);

      const response = await resend.emails.send({
        from: resendFrom,
        to: user.email,
        subject: "Reset your password",
        html: buildPasswordResetEmailHtml(user.name || "there", safeUrl),
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
    sendVerificationEmail: async ({ user, url }, request) => {
      if (!resendApiKey) {
        throw new Error("RESEND_API_KEY is not defined");
      }

      const safeUrl = sanitizeAuthLink(url, request);

      const response = await resend.emails.send({
        from: resendFrom,
        to: user.email,
        subject: "Verify your email",
        html: buildVerificationEmailHtml(user.name || "there", safeUrl),
      });

      if (response.error) {
        throw new Error(response.error.message ?? "Failed to send verification email");
      }
      console.info("Better Auth verification email accepted by Resend");
    },
  },
});