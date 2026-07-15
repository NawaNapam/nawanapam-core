"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { platform } from "@/platform";

/**
 * Drop into the web LoginPage/SignupPage. Catches every path that can land
 * a native user on the web auth screens — stray hardcoded `/login` or
 * `/signup` links (ForgetPassword.tsx, Header.tsx, SignupPage/LoginPage's
 * own cross-links), NextAuth's `pages.signIn`/`pages.error` config in
 * authOptions.ts, deep links, anything — without having to hunt down and
 * platform-branch every individual link, several of which (Header.tsx) are
 * also rendered on the real website and must keep pointing at `/login`.
 * Preserves the query string so e.g. `?error=OAuthAccountNotLinked` still
 * reaches NativeLoginPage's own error toast handling.
 */
export default function NativeAuthRedirect({ to }: { to: "/native/login" | "/native/signup" }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!platform.isNative) return;
    const qs = searchParams.toString();
    router.replace(qs ? `${to}?${qs}` : to);
  }, [to, searchParams, router]);

  return null;
}
