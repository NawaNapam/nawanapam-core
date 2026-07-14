"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, Lock, Loader2, ArrowLeft } from "lucide-react";
import { signInWithGoogle } from "@/lib/nativeGoogleAuth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();

  // Handle OAuth errors
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

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      toast.error("Invalid email or password");
      setIsLoading(false);
    } else {
      toast.success("Welcome back!");
      setTimeout(() => (window.location.href = "/dashboard"), 100);
    }
  };

  const handleProvider = (provider: "google" | "instagram") => {
    if (provider === "google") {
      signInWithGoogle("/dashboard");
      return;
    }
    signIn(provider, { callbackUrl: "/dashboard" });
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-background">
      {/* Top Bar */}
      <div className="absolute top-6 left-6 right-6 hidden md:flex justify-between items-center">
        <Link
          href="/"
          className="flex items-center gap-2 text-body hover:text-foreground text-sm font-medium transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>
      </div>

      <Card className="relative z-10 w-full max-w-md rounded-lg border border-border p-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-medium text-foreground tracking-tight">
            Welcome Back
          </h1>
          <p className="text-body text-sm mt-3">
            Sign in to continue your journey
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="relative">
            <Mail className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
            <Input
              type="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-11"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
            <Input
              type="password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-11"
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full" size="lg">
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
          <span className="mx-4 text-xs font-medium text-muted-foreground">
            OR
          </span>
          <hr className="grow border-t border-border" />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Button
            onClick={() => handleProvider("google")}
            variant="outline"
            size="lg"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
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
            Google
          </Button>
        </div>

        <p className="mt-10 text-center text-sm text-body">
          New here?{" "}
          <Link href="/signup" className="text-link hover:text-link-active font-medium">
            Create Account
          </Link>
        </p>

        <p className="text-center text-sm text-body">
          Forgot your password?{" "}
          <Link
            href="/forget-pass"
            className="text-link hover:text-link-active font-medium"
          >
            Reset Password
          </Link>
        </p>
      </Card>
    </div>
  );
}
