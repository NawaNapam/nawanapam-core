"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/services/toast";
import { Mail, Lock, Loader2 } from "lucide-react";
import { authService } from "@/services/auth";

/**
 * Native-app-only login screen — no site Header/Footer or "Back to Home"
 * (there's no landing page to go back to on native, see NativeSplashGate).
 * Same auth logic as the web LoginPage, distinct branded layout.
 */
export default function NativeLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "OAuthAccountNotLinked") {
      toast.error(
        "Account already exists with this email. Please sign in with your original method or use password reset.",
        { duration: 6000 }
      );
    } else if (error) {
      toast.error("Authentication error. Please try again.");
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await authService.loginWithCredentials(email, password);

    if (!result.ok) {
      toast.error("Invalid email or password");
      setIsLoading(false);
    } else {
      toast.success("Welcome back!");
      setTimeout(() => (window.location.href = "/dashboard"), 100);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await authService.loginWithGoogle("/dashboard");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen flex-col bg-signature-forest"
      style={{ paddingTop: "var(--status-bar-height)" }}
    >
      {/* Brand header */}
      <div className="flex flex-col items-center gap-4 px-8 pb-10 pt-12">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/manifest-icon-512.maskable.png"
          alt="Nawa Napam"
          className="h-20 w-20 rounded-full shadow-lg shadow-black/30"
        />
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-on-dark">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-on-dark/70">
            Sign in to continue your journey
          </p>
        </div>
      </div>

      {/* Form card */}
      <div className="flex-1 rounded-t-[2rem] bg-background px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-8 shadow-[0_-8px_30px_rgba(0,0,0,0.15)]">
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-14 rounded-2xl pl-12 text-base"
            />
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-14 rounded-2xl pl-12 text-base"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="h-14 w-full rounded-2xl bg-signature-forest text-base font-semibold text-on-dark hover:bg-signature-forest/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Signing In...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        <div className="my-6 flex items-center">
          <hr className="grow border-t border-border" />
          <span className="mx-4 text-xs font-medium text-muted-foreground">OR</span>
          <hr className="grow border-t border-border" />
        </div>

        <Button
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading}
          variant="outline"
          className="h-14 w-full rounded-2xl text-base"
        >
          {isGoogleLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          Continue with Google
        </Button>

        <p className="mt-8 text-center text-sm text-body">
          New here?{" "}
          <Link href="/native/signup" className="font-medium text-link hover:text-link-active">
            Create Account
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-body">
          Forgot your password?{" "}
          <Link href="/forget-pass" className="font-medium text-link hover:text-link-active">
            Reset Password
          </Link>
        </p>
      </div>
    </div>
  );
}
