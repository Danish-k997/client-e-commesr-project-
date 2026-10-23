import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { after } from "next/server";
import { Resend } from "resend";

import { mongoClient, mongoDb } from "./auth-db";

const PRODUCTION_VERIFIED_DOMAIN = "kasardimensions.com";
const PRODUCTION_DEFAULT_FROM = "KASAR DIMENSIONS <notifications@kasardimensions.com>";
const DEVELOPMENT_DEFAULT_FROM = "KASAR DIMENSIONS <onboarding@resend.dev>";

/**
 * Strips whitespace and accidental surrounding quotes from environment variables.
 */
const sanitizeEnvString = (value?: string): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim().replace(/^["']|["']$/g, "");
  return trimmed.length > 0 ? trimmed : undefined;
};

/**
 * Resolves the Resend API key strictly from server environment variables.
 * Keeps the key strictly server-side and never exposed to the client.
 */
const getResendApiKey = (): string | undefined => {
  return sanitizeEnvString(process.env.RESEND_API_KEY);
};

/**
 * Resolves the sender email address for outgoing transactional emails.
 *
 * Requirements:
 * 1. Removes the production fallback to onboarding@resend.dev. Resend strictly restricts
 *    onboarding@resend.dev to sending only to the account owner's email address (returning HTTP 403
 *    for any customer signup).
 * 2. Uses process.env.RESEND_FROM if defined.
 * 3. In production, if RESEND_FROM is omitted or mistakenly set to @resend.dev, safely defaults to
 *    the verified production domain sender: 'KASAR DIMENSIONS <notifications@kasardimensions.com>'.
 * 4. In development, defaults to onboarding@resend.dev for local sandbox testing if RESEND_FROM is unset.
 */
const resolveResendFrom = (): string => {
  const configuredFrom = sanitizeEnvString(process.env.RESEND_FROM);

  if (configuredFrom) {
    if (
      process.env.NODE_ENV === "production" &&
      configuredFrom.toLowerCase().includes("@resend.dev")
    ) {
      console.warn(
        `[Resend:Sender] RESEND_FROM is set to '${configuredFrom}' in production. ` +
        `Resend blocks @resend.dev from sending to customer emails (HTTP 403 Forbidden). ` +
        `Overriding to verified domain sender: '${PRODUCTION_DEFAULT_FROM}'.`
      );
      return PRODUCTION_DEFAULT_FROM;
    }
    return configuredFrom;
  }

  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_DEFAULT_FROM;
  }

  return DEVELOPMENT_DEFAULT_FROM;
};

/**
 * Masks an email address for privacy-safe, sanitized server logging (PII protection).
 * Example: 'customer@gmail.com' -> 'c*****r@gmail.com'
 */
const maskEmail = (email: string): string => {
  if (!email || !email.includes("@")) return "invalid-email";
  const [localPart, domain] = email.split("@");
  if (localPart.length <= 2) {
    return `${localPart[0]}*@${domain}`;
  }
  return `${localPart[0]}${"*".repeat(Math.min(localPart.length - 2, 5))}${localPart[localPart.length - 1]}@${domain}`;
};

/**
 * Masks the API key for safe server diagnostics without leaking secrets in logs.
 * Example: 're_12345...6789 (length: 36)'
 */
const maskApiKey = (key?: string): string => {
  if (!key) return "MISSING";
  if (key.length <= 10) return "CONFIGURED (length < 10)";
  return `${key.slice(0, 7)}...${key.slice(-4)} (length: ${key.length})`;
};

interface SendTransactionalEmailParams {
  to: string;
  subject: string;
  html: string;
  context: "EmailVerification" | "PasswordReset";
}

/**
 * Sends a transactional email through Resend with comprehensive sanitized error handling.
 */
const sendTransactionalEmail = async ({
  to,
  subject,
  html,
  context,
}: SendTransactionalEmailParams): Promise<void> => {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    console.error(`[Auth:${context}:Failure] RESEND_API_KEY environment variable is not defined on the server`);
    throw new Error("RESEND_API_KEY is not defined");
  }

  const from = resolveResendFrom();
  const recipientDomain = to.includes("@") ? to.split("@")[1] : "unknown";
  const sanitizedRecipient = maskEmail(to);
  const resend = new Resend(apiKey);

  let response;
  try {
    response = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });
  } catch (err: unknown) {
    const errorDetails = err instanceof Error ? err.message : String(err);
    console.error(`[Auth:${context}:NetworkFailure] Unexpected exception communicating with Resend`, {
      provider: "Resend",
      endpoint: "POST https://api.resend.com/emails",
      errorMessage: errorDetails,
      sender: from,
      recipient: sanitizedRecipient,
      recipientDomain,
      apiKeyHint: maskApiKey(apiKey),
    });
    throw new Error(`Failed to send ${context.toLowerCase()} email: ${errorDetails}`);
  }

  if (response.error) {
    const resendError = response.error;
    const statusCode =
      (resendError as { statusCode?: number; status?: number })?.statusCode ??
      (resendError as { statusCode?: number; status?: number })?.status;

    console.error(`[Auth:${context}:Failure] Resend API rejected email`, {
      provider: "Resend",
      endpoint: "POST https://api.resend.com/emails",
      errorName: resendError.name,
      errorMessage: resendError.message,
      statusCode,
      sender: from,
      recipient: sanitizedRecipient,
      recipientDomain,
      apiKeyHint: maskApiKey(apiKey),
    });

    if (
      resendError.name === "validation_error" &&
      from.toLowerCase().includes("@resend.dev")
    ) {
      console.error(
        `[Resend:Diagnostic:403] Sender uses 'onboarding@resend.dev', which Resend restricts to the account owner. ` +
        `Set RESEND_FROM to a sender on verified domain 'kasardimensions.com' (e.g. 'KASAR DIMENSIONS <notifications@kasardimensions.com>').`
      );
    } else if (resendError.name === "restricted_api_key") {
      console.error(
        `[Resend:Diagnostic:403] The Resend API key (${maskApiKey(apiKey)}) is restricted to a different domain. ` +
        `Create a new API key in the Resend dashboard with Sending access for '${PRODUCTION_VERIFIED_DOMAIN}' or 'Full access'.`
      );
    } else if (statusCode === 403 || resendError.name?.toLowerCase().includes("forbidden")) {
      console.error(
        `[Resend:Diagnostic:403] Resend 403 Forbidden. Verify the following in your Resend dashboard: ` +
        `1) 'kasardimensions.com' domain is Verified (DKIM/SPF passed); ` +
        `2) RESEND_API_KEY was generated in the SAME Team/Workspace as the verified domain; ` +
        `3) RESEND_FROM uses the verified domain '${PRODUCTION_VERIFIED_DOMAIN}'.`
      );
    }

    throw new Error(resendError.message ?? `Failed to send ${context.toLowerCase()} email`);
  }

  console.info(`[Auth:${context}:Success] Email accepted by Resend`, {
    emailId: response.data?.id,
    sender: from,
    recipientDomain,
  });
};

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

const normalizeOrigin = (origin: string): string => {
  try {
    const url = new URL(origin.trim());
    return url.origin;
  } catch {
    return origin.trim().replace(/\/+$/, "");
  }
};

const normalizeHost = (hostOrUrl: string): string => {
  try {
    if (hostOrUrl.includes("://")) {
      return new URL(hostOrUrl.trim()).host;
    }
    return hostOrUrl.trim().replace(/\/+$/, "");
  } catch {
    return hostOrUrl.trim();
  }
};

const resolveProductionHost = (request?: Request): string => {
  if (request) {
    const forwardedHost = request.headers.get("x-forwarded-host");
    if (forwardedHost) return forwardedHost.split(",")[0].trim();
    const host = request.headers.get("host");
    if (host) return host.split(",")[0].trim();
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

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return process.env.VERCEL_PROJECT_PRODUCTION_URL;
  }
  if (process.env.VERCEL_URL) {
    return process.env.VERCEL_URL;
  }

  return "www.kasardimensions.com";
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
        return normalizeOrigin(process.env.BETTER_AUTH_URL);
      }
    } catch {
      // ignore
    }
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  if (process.env.NODE_ENV === "production") {
    return "https://www.kasardimensions.com";
  }

  return "http://localhost:3000";
};

const allowedHosts = Array.from(
  new Set([
    "localhost:3000",
    "127.0.0.1:3000",
    "www.kasardimensions.com",
    "kasardimensions.com",
    "client-e-commesr-project.vercel.app",
    "client-e-commesr-project-q6cxmls9c.vercel.app",
    ...(process.env.VERCEL_PROJECT_PRODUCTION_URL ? [normalizeHost(process.env.VERCEL_PROJECT_PRODUCTION_URL)] : []),
    ...(process.env.VERCEL_URL ? [normalizeHost(process.env.VERCEL_URL)] : []),
    ...(process.env.BETTER_AUTH_URL ? [normalizeHost(process.env.BETTER_AUTH_URL)] : []),
    ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS
      ? process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(",")
          .map((origin) => normalizeHost(origin))
          .filter(Boolean)
      : []),
  ])
);

const configuredOrigins = [
  "http://localhost:3000",
  "https://www.kasardimensions.com",
  "https://kasardimensions.com",
  "https://client-e-commesr-project.vercel.app",
  "https://client-e-commesr-project-q6cxmls9c.vercel.app",
  ...(process.env.VERCEL_PROJECT_PRODUCTION_URL ? [`https://${normalizeHost(process.env.VERCEL_PROJECT_PRODUCTION_URL)}`] : []),
  ...(process.env.VERCEL_URL ? [`https://${normalizeHost(process.env.VERCEL_URL)}`] : []),
  ...(process.env.BETTER_AUTH_URL ? [normalizeOrigin(process.env.BETTER_AUTH_URL)] : []),
  ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS
    ? process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(",")
        .map((origin) => normalizeOrigin(origin))
        .filter(Boolean)
    : []),
].map(normalizeOrigin);

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
      const safeUrl = sanitizeAuthLink(url, request);
      await sendTransactionalEmail({
        to: user.email,
        subject: "Reset your password",
        html: buildPasswordResetEmailHtml(user.name || "there", safeUrl),
        context: "PasswordReset",
      });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    expiresIn: 86400,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }, request) => {
      const safeUrl = sanitizeAuthLink(url, request);
      await sendTransactionalEmail({
        to: user.email,
        subject: "Verify your email",
        html: buildVerificationEmailHtml(user.name || "there", safeUrl),
        context: "EmailVerification",
      });
    },
  },
});