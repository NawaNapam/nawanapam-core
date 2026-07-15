"use client";
import React, { useState, useEffect } from "react";
import { Mail, Lock, KeyRound, ArrowLeft, Loader2, Clock } from "lucide-react";
import { toast } from "@/services/toast";

type Step = "email" | "otp" | "password";

const ForgetPassword = () => {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpVerified, setOtpVerified] = useState(false);

  // Timer effect for resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(
        () => setResendCooldown(resendCooldown - 1),
        1000
      );
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send OTP");
      }

      toast.success("OTP sent to your email!");
      setResendCooldown(300); // 5 minutes cooldown
      setTimeout(() => {
        setStep("otp");
      }, 1500);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to send OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: Number(otp) }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Invalid OTP");
      }

      setOtpVerified(true);
      toast.success("OTP verified successfully!");
      setTimeout(() => {
        setStep("password");
      }, 1500);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Invalid OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate OTP was verified
    if (!otpVerified) {
      toast.error("Please verify OTP first");
      setStep("otp");
      return;
    }

    // Password validation
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    // Password strength validation
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      toast.error("Password must contain uppercase, lowercase, and numbers");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      toast.success("Password reset successfully! Redirecting to login...");
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to reset password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) {
      toast.error(`Please wait ${formatTime(resendCooldown)} before resending`);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to resend OTP");
      }

      toast.success("New OTP sent to your email!");
      setResendCooldown(300); // Reset to 5 minutes
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="relative bg-card rounded-lg border border-border overflow-hidden">
          {/* Header */}
          <div className="p-8 pb-6 border-b border-border">
            <div className="flex items-center gap-3 mb-2">
              {step !== "email" && (
                <button
                  onClick={() => setStep(step === "otp" ? "email" : "otp")}
                  className="p-2 rounded-full border border-border hover:bg-accent transition-colors"
                >
                  <ArrowLeft size={20} className="text-foreground" />
                </button>
              )}
              <h2 className="text-2xl font-medium text-foreground">
                {step === "email" && "Forgot Password"}
                {step === "otp" && "Verify OTP"}
                {step === "password" && "Reset Password"}
              </h2>
            </div>
            <p className="text-sm text-body">
              {step === "email" &&
                "Enter your registered email to receive a verification code for resetting your password."}
              {step === "otp" && "Enter the 6-digit code sent to your email"}
              {step === "password" && "Create a new strong password"}
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Email Step */}
            {step === "email" && (
              <form onSubmit={handleSendOTP} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-body mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                      size={20}
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="w-full h-11 pl-12 pr-4 bg-background border border-input rounded-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send OTP"
                  )}
                </button>
              </form>
            )}

            {/* OTP Step */}
            {step === "otp" && (
              <form onSubmit={handleVerifyOTP} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-body mb-2">
                    Verification Code
                  </label>
                  <div className="relative">
                    <KeyRound
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                      size={20}
                    />
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) =>
                        setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      placeholder="000000"
                      maxLength={6}
                      required
                      className="w-full h-14 pl-12 pr-4 bg-background border border-input rounded-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring transition-colors text-center text-2xl tracking-widest font-mono"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Sent to {email}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full h-12 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify OTP"
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={loading || resendCooldown > 0}
                  className="w-full text-sm text-link hover:text-link-active transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {resendCooldown > 0 ? (
                    <>
                      <Clock size={16} />
                      Resend in {formatTime(resendCooldown)}
                    </>
                  ) : (
                    "Didn't receive code? Resend OTP"
                  )}
                </button>
              </form>
            )}

            {/* Password Step */}
            {step === "password" && (
              <form onSubmit={handleResetPassword} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-body mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                      size={20}
                    />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={8}
                      className="w-full h-11 pl-12 pr-4 bg-background border border-input rounded-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring transition-colors"
                    />
                  </div>
                  {newPassword && (
                    <div className="mt-2 space-y-1 text-xs">
                      <p
                        className={
                          newPassword.length >= 8
                            ? "text-success"
                            : "text-muted-foreground"
                        }
                      >
                        ✓ At least 8 characters
                      </p>
                      <p
                        className={
                          /[A-Z]/.test(newPassword)
                            ? "text-success"
                            : "text-muted-foreground"
                        }
                      >
                        ✓ Contains uppercase letter
                      </p>
                      <p
                        className={
                          /[a-z]/.test(newPassword)
                            ? "text-success"
                            : "text-muted-foreground"
                        }
                      >
                        ✓ Contains lowercase letter
                      </p>
                      <p
                        className={
                          /[0-9]/.test(newPassword)
                            ? "text-success"
                            : "text-muted-foreground"
                        }
                      >
                        ✓ Contains number
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-body mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                      size={20}
                    />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={8}
                      className="w-full h-11 pl-12 pr-4 bg-background border border-input rounded-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring transition-colors"
                    />
                  </div>
                  {confirmPassword && (
                    <p
                      className={`mt-2 text-xs ${newPassword === confirmPassword ? "text-success" : "text-destructive"}`}
                    >
                      {newPassword === confirmPassword
                        ? "✓ Passwords match"
                        : "✗ Passwords do not match"}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={
                    loading ||
                    newPassword !== confirmPassword ||
                    newPassword.length < 8
                  }
                  className="w-full h-12 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">
              Remember your password?{" "}
              <a href="/login" className="text-link hover:text-link-active font-medium">
                Sign In
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgetPassword;
