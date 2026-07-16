"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { Session } from "next-auth";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/providers/AuthProvider";
import dynamic from "next/dynamic";

const NativeStatusBar = dynamic(
  () => import("@/components/native/NativeStatusBar"),
  { ssr: false },
);

const NativePush = dynamic(
  () => import("@/components/native/NativePush"),
  { ssr: false },
);

const NativeSplashGate = dynamic(
  () => import("@/components/native/NativeSplashGate"),
  { ssr: false },
);


type Props = { children: ReactNode; session?: Session | null };


export default function Providers({ children, session }: Props) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
      <SessionProvider session={session}>
        <AuthProvider>
          <NativeStatusBar />
          <NativePush />
          <NativeSplashGate />
          {children}
        </AuthProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
