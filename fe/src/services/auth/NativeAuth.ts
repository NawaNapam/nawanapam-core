import { signIn } from "next-auth/react";
import { BaseAuth } from "./BaseAuth";
import { storageService } from "@/services/storage";
import { LOGOUT_FLAG_KEY } from "@/platform/constants";

let socialLoginInitialized = false;

/**
 * Google blocks its OAuth consent screen inside embedded WebViews, so the
 * web's redirect-based `signIn("google")` can't complete when run inside the
 * Capacitor app. Here we get an ID token from the native Google Sign-In SDK
 * instead and hand it to the "google-native" credentials provider
 * (see `authOptions.ts`).
 */
export class NativeAuth extends BaseAuth {
  async loginWithGoogle(callbackUrl: string): Promise<void> {
    const { SocialLogin } = await import("@capgo/capacitor-social-login");

    if (!socialLoginInitialized) {
      await SocialLogin.initialize({
        google: {
          webClientId: process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID,
          mode: "online",
        },
      });
      socialLoginInitialized = true;
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

    // Clear any stale logout flag so the next cold start routes to dashboard
    await storageService.remove(LOGOUT_FLAG_KEY);

    await signIn("google-native", { idToken, callbackUrl, redirect: true });
  }
}

