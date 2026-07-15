"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { platform } from "@/platform";

/** Hard ceiling so a stuck session fetch or failed navigation can never leave the splash up forever. */
const MAX_WAIT_MS = 6000;

/**
 * Native has no use for the marketing landing page. Mounted globally in
 * Provider.tsx (not scoped to "/") so it stays alive across the redirect it
 * triggers — a component scoped to the "/" page tree unmounts the moment
 * that navigation lands, before it could ever observe pathname changing.
 *
 * Splash stays up (launchAutoHide: false, see capacitor.config.ts) the
 * entire time this is deciding/navigating, so nobody sees Landing render.
 */
export default function NativeSplashGate() {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const redirected = useRef(false);
  const hidden = useRef(false);

  const hide = () => {
    if (hidden.current) return;
    hidden.current = true;
    import("@capacitor/splash-screen").then(({ SplashScreen }) => SplashScreen.hide());
  };

  useEffect(() => {
    if (!platform.isNative) return;
    if (pathname !== "/" || status === "loading" || redirected.current) return;

    redirected.current = true;
    router.replace(status === "authenticated" ? "/dashboard" : "/native/login");
  }, [pathname, status, router]);

  useEffect(() => {
    if (!platform.isNative || hidden.current) return;
    // Still sitting on "/": either we haven't decided where to send them yet,
    // or we have and the navigation hasn't landed — either way keep waiting,
    // hiding here would expose Landing mid-transition.
    if (pathname === "/") return;

    hide();
  }, [pathname]);

  useEffect(() => {
    if (!platform.isNative) return;
    // Belt-and-braces: a hung session fetch or a navigation that never lands
    // (bad network, server error mid-redirect) must not strand the user on
    // an unhideable splash screen forever.
    const timer = setTimeout(() => {
      if (hidden.current) return;
      if (!redirected.current) router.replace("/native/login");
      hide();
    }, MAX_WAIT_MS);
    return () => clearTimeout(timer);
  }, [router]);

  return null;
}
