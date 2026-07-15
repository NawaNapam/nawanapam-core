export interface AuthUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  username?: string | null;
}

export interface CredentialsResult {
  ok: boolean;
  error?: string;
}

/**
 * Everything the UI needs to authenticate a user, with the Google flow being
 * the only piece that actually differs between web (redirect OAuth) and
 * native (native Google Sign-In SDK + ID-token exchange).
 */
export interface AuthProvider {
  loginWithGoogle(callbackUrl: string): Promise<void>;
  loginWithCredentials(email: string, password: string): Promise<CredentialsResult>;
  logout(callbackUrl?: string): Promise<void>;
  getCurrentUser(): Promise<AuthUser | null>;
}
