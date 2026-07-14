export const nextEnv = {
  NA_SECRET: process.env.NEXTAUTH_SECRET,
  NA_URL: process.env.NEXTAUTH_URL,
};
export const isDev = process.env.NODE_ENV !== "production";

export const googleEnv = {
  CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  // Same OAuth client as CLIENT_ID above, exposed to the client bundle so the
  // native Android app (Capacitor) can request Google ID tokens directly.
  // Client IDs are not secret; only CLIENT_SECRET must stay server-only.
  WEB_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID,
};
