import { signIn, signOut, getSession } from "next-auth/react";
import type { AuthProvider, AuthUser, CredentialsResult } from "./AuthProvider";
import { useAuthStore } from "@/stores/authStore";
import { storageService } from "@/services/storage";
import { AUTH_STORAGE_KEY, LOGOUT_FLAG_KEY } from "@/platform/constants";
import { platform } from "@/platform";

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
    // Clear any stale logout flag left from a previous session
    await storageService.remove(LOGOUT_FLAG_KEY);
    return { ok: true };
  }

  async logout(callbackUrl = "/"): Promise<void> {
    // 1. Wipe the Zustand store immediately (in-memory, synchronous).
    useAuthStore.getState().clearUser();

    if (platform.isNative) {
      // ── Native path ───────────────────────────────────────────────────────
      // On the Capacitor WebView, `signOut({ callbackUrl })` triggers a full
      // page navigation *before* the HTTP response that clears the session
      // cookie is processed. The next cold start therefore still sees a valid
      // JWT and `useSession` returns "authenticated" → wrong dashboard redirect.
      //
      // Fix: use `redirect: false` so we await the server round-trip that
      // invalidates the session and sets Set-Cookie: Max-Age=0 *before* we
      // do anything else. Then we clear persistent storage and navigate
      // explicitly ourselves.
      //
      // We also write a LOGOUT_FLAG to Capacitor Preferences as a belt-and-
      // braces guard: if the server is unreachable (offline) the cookie can't
      // be cleared server-side, but we still must not land on /dashboard.
      // NativeSplashGate reads this flag and routes to /native/login
      // regardless of what useSession says.
      try {
        await signOut({ redirect: false });
      } catch {
        // Network offline — the flag below ensures we still land on login.
      }
      // Clear persisted auth store key
      await storageService.remove(AUTH_STORAGE_KEY);
      // Write the explicit logout flag AFTER signOut (so a successful online
      // logout + flag both guarantee the next cold start goes to login).
      await storageService.set(LOGOUT_FLAG_KEY, true);
      // Navigate to native login
      window.location.replace("/native/login");
    } else {
      // ── Web path ─────────────────────────────────────────────────────────
      // Standard behaviour: let NextAuth handle the redirect.
      await storageService.remove(AUTH_STORAGE_KEY);
      await signOut({ callbackUrl });
    }
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const session = await getSession();
    if (!session?.user) return null;
    return session.user as AuthUser;
  }
}
