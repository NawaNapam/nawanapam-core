import { signIn, signOut, getSession } from "next-auth/react";
import type { AuthProvider, AuthUser, CredentialsResult } from "./AuthProvider";
import { useAuthStore } from "@/stores/authStore";
import { storageService } from "@/services/storage";
import { AUTH_STORAGE_KEY } from "@/platform/constants";

/**
 * Credentials login, logout, and session lookup are identical on web and
 * native today (both go through NextAuth) — shared here so `NativeAuth` and
 * `WebAuth` only need to differ on `loginWithGoogle`.
 */
export abstract class BaseAuth implements AuthProvider {
  abstract loginWithGoogle(callbackUrl: string): Promise<void>;

  async loginWithCredentials(email: string, password: string): Promise<CredentialsResult> {
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      return { ok: false, error: result.error };
    }
    return { ok: true };
  }

  async logout(callbackUrl = "/"): Promise<void> {
    // The auth store is persisted to native storage (survives app restarts)
    // as a UI-convenience mirror of the session. It must be wiped explicitly
    // and *awaited* before signOut's redirect navigates away — zustand's
    // persist middleware writes through an async native bridge call
    // (Preferences.set) that a same-tick navigation can otherwise cut off,
    // leaving a stale "authenticated" flag for the next cold start to read.
    useAuthStore.getState().clearUser();
    await storageService.remove(AUTH_STORAGE_KEY);
    await signOut({ callbackUrl });
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const session = await getSession();
    if (!session?.user) return null;
    return session.user as AuthUser;
  }
}
