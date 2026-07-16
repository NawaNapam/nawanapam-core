/** Key zustand's auth persistence writes under, shared across storage engines. */
export const AUTH_STORAGE_KEY = "nawa-napam-auth";

/**
 * Written to Capacitor Preferences on explicit logout; read by NativeSplashGate
 * on the next cold start to force the login screen even if the JWT cookie is
 * still technically alive (e.g. offline sign-out or race with cookie clearing).
 * Cleared on the next successful sign-in.
 */
export const LOGOUT_FLAG_KEY = "nawa-napam-logged-out";
