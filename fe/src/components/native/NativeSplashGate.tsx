"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { platform } from "@/platform";
import { storageService } from "@/services/storage";
import { LOGOUT_FLAG_KEY } from "@/platform/constants";
import { SplashScreen } from "@capacitor/splash-screen";

/** Hard ceiling so a stuck session fetch or failed navigation can never leave the splash up forever. */
const MAX_WAIT_MS = 6000;

export default function NativeSplashGate() {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const redirected = useRef(false);
  const hidden = useRef(false);

  const [loggedOutFlag, setLoggedOutFlag] = useState<boolean | null>(
    platform.isNative ? null : false,
  );

  useEffect(() => {
    if (!platform.isNative) return;
    storageService
      .get<boolean>(LOGOUT_FLAG_KEY)
      .then((val) => setLoggedOutFlag(!!val))
      .catch(() => setLoggedOutFlag(false));
  }, []);

  const hide = () => {
    if (hidden.current) return;
    hidden.current = true;
    try {
      SplashScreen.hide();
    } catch (e) {
      console.error(e);
    }
  };


  useEffect(() => {
    if (!platform.isNative) return;
    // Wait until we've read the logout flag AND the session has resolved.
    if (loggedOutFlag === null || status === "loading") return;
    if (pathname !== "/" || redirected.current) return;

    redirected.current = true;

    // If the user explicitly logged out, always go to login — regardless of
    // whether the JWT cookie is still technically valid.
    const isAuthenticated = status === "authenticated" && !loggedOutFlag;
    router.replace(isAuthenticated ? "/dashboard" : "/native/login");
  }, [pathname, status, router, loggedOutFlag]);

  useEffect(() => {
    if (!platform.isNative || hidden.current) return;
    if (pathname === "/") return;
    hide();
  }, [pathname]);

  useEffect(() => {
    if (!platform.isNative) return;
    const timer = setTimeout(() => {
      if (hidden.current) return;
      if (!redirected.current) router.replace("/native/login");
      hide();
    }, MAX_WAIT_MS);
    return () => clearTimeout(timer);
  }, [router]);

  return null;
}
