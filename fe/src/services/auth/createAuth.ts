import { platform } from "@/platform";
import type { AuthProvider } from "./AuthProvider";
import { NativeAuth } from "./NativeAuth";
import { WebAuth } from "./WebAuth";

export function createAuthProvider(): AuthProvider {
  return platform.features.auth === "native" ? new NativeAuth() : new WebAuth();
}

export const authService: AuthProvider = createAuthProvider();
