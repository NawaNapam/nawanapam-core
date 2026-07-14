import { signIn } from "next-auth/react";

let initialized = false;

/**
 * Google blocks its OAuth consent screen inside embedded WebViews, so the
 * website's normal redirect-based `signIn("google")` can't complete when run
 * inside the Capacitor app. There we get an ID token from the native Google
 * Sign-In SDK instead and hand it to the "google-native" credentials
 * provider. On the web this just falls back to the existing behavior.
 */
export async function signInWithGoogle(callbackUrl: string) {
  const { Capacitor } = await import("@capacitor/core");

  if (!Capacitor.isNativePlatform()) {
    return signIn("google", { callbackUrl });
  }

  const { SocialLogin } = await import("@capgo/capacitor-social-login");

  if (!initialized) {
    await SocialLogin.initialize({
      google: {
        webClientId: process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        mode: "online",
      },
    });
    initialized = true;
  }

  const result = await SocialLogin.login({
    provider: "google",
    options: { scopes: ["profile", "email"] },
  });

  const idToken =
    result.provider === "google" && result.result.responseType !== "offline"
      ? result.result.idToken
      : undefined;

  if (!idToken) {
    throw new Error("Google sign-in did not return an ID token");
  }

  return signIn("google-native", { idToken, callbackUrl, redirect: true });
}
