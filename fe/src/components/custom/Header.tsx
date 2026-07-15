"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { platform } from "@/platform";
import { authService } from "@/services/auth";
import { useAuthStore } from "@/stores/authStore";
import {
  X,
  LogOut,
  Settings,
  LayoutDashboard,
  Download,
  Sun,
  Moon,
  History,
} from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="size-10 rounded-full" />;
  }

  const isDark = resolvedTheme === "dark";
  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
      className="flex size-10 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-accent"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export default function Header() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(true);
  const [isStandalone, setIsStandalone] = useState(false);

  const { user, isAuthenticated, isLoading } = useAuthStore();

  // PWA Install Detection
  useEffect(() => {
    // Already running as the native Android app — never show the PWA install prompt.
    if (platform.isNative) {
      setIsStandalone(true);
      setShowInstallPrompt(false);
      return;
    }

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone ||
      document.referrer.includes("android-app://");

    setIsStandalone(standalone);
    setShowInstallPrompt(!standalone);

    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler as EventListener);

    return () =>
      window.removeEventListener(
        "beforeinstallprompt",
        handler as EventListener,
      );
  }, []);

  const handleInstallClick = async () => {
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as { MSStream?: unknown }).MSStream;

    if (isIOS) {
      alert(
        'To install on iOS:\n1. Tap the Share button\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" to confirm',
      );
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowInstallPrompt(false);
      }
      setDeferredPrompt(null);
    } else {
      alert(
        'To install this app:\n• Chrome/Edge: Look for the install icon in the address bar\n• Or use the browser menu and select "Install app"',
      );
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        !target.closest(".profile-dropdown") &&
        !target.closest(".profile-button")
      ) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [sidebarOpen]);

  if (isLoading) {
    return (
      <header className="fixed top-0 inset-x-0 z-50 bg-background border-b border-border pt-(--status-bar-height)">
        <div className="container mx-auto h-16 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="size-9 bg-muted rounded-full animate-pulse" />
            <div className="h-5 w-32 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      {/* Dropdown Portal */}
      {dropdownOpen && (
        <div className="profile-dropdown fixed top-20 right-4 sm:right-6 xl:right-25 w-64 z-50">
          <div className="origin-top-right rounded-lg bg-popover border border-border shadow-lg overflow-hidden">
            <div className="p-4 border-b border-border">
              <p className="text-sm font-medium text-foreground">
                {user!.username?.toLowerCase() ||
                  user!.name?.split(" ")[0]?.toLowerCase() ||
                  "not set"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user!.email}
              </p>
            </div>
            <div className="py-2">
              <Link
                href="/dashboard"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-3 px-5 py-3 text-foreground hover:bg-accent transition-colors"
              >
                <LayoutDashboard size={18} />
                Dashboard
              </Link>
              <Link
                href="/call-history"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-3 px-5 py-3 text-foreground hover:bg-accent transition-colors"
              >
                <History size={18} />
                Call History
              </Link>
              <Link
                href="/settings"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-3 px-5 py-3 text-foreground hover:bg-accent transition-colors"
              >
                <Settings size={18} />
                Settings
              </Link>
            </div>
            <div className="border-t border-border pt-2">
              <button
                onClick={() => authService.logout("/")}
                className="flex w-full items-center gap-3 px-5 py-3 text-destructive hover:bg-accent transition-colors"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="fixed top-0 inset-x-0 z-50 bg-background border-b border-border pt-(--status-bar-height)">
        <div className="container mx-auto h-16 flex items-center justify-between px-4 sm:px-6">
          {/* Logo + Brand Name */}
          <Link href="/" className="flex items-center gap-3">
            <div className="size-9 rounded-full overflow-hidden border border-border">
              <Image
                src="/images/logo.jpg"
                alt="NawaNapam"
                width={36}
                height={36}
                className="object-cover"
              />
            </div>
            <span className="text-lg font-medium tracking-tight text-foreground">
              NawaNapam
            </span>
          </Link>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            {isAuthenticated && user ? (
              <>
                {/* Desktop Dropdown */}
                <div className="hidden sm:block relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="profile-button flex items-center gap-3 p-1 rounded-full border border-border hover:bg-accent transition-colors"
                  >
                    <div className="size-8 rounded-full overflow-hidden">
                      <Image
                        src={user.image || "/images/default-avatar.png"}
                        alt="User"
                        width={32}
                        height={32}
                        className="object-cover"
                      />
                    </div>
                  </button>
                </div>

                {/* Mobile User Avatar */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="sm:hidden flex items-center gap-2 p-1 rounded-full border border-border hover:bg-accent transition-colors"
                >
                  <div className="size-8 rounded-full overflow-hidden">
                    <Image
                      src={user.image || "/images/default-avatar.png"}
                      alt="User"
                      width={32}
                      height={32}
                      className="object-cover"
                    />
                  </div>
                </button>
              </>
            ) : (
              /* Guest Buttons */
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="hidden sm:inline-flex h-10 px-5 rounded-lg text-sm font-medium text-foreground border border-border hover:bg-accent transition-colors items-center"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="hidden sm:inline-flex h-10 px-5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors items-center"
                >
                  Join Now
                </Link>
                {/* Mobile Login */}
                <Link
                  href="/login"
                  className="sm:hidden h-9 px-4 rounded-lg text-sm font-medium text-foreground border border-border hover:bg-accent transition-colors inline-flex items-center"
                >
                  Login
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-60 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-80 bg-background border-r border-border shadow-lg z-70 sm:hidden transform transition-transform duration-300 ease-in-out flex flex-col ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-border pt-[calc(1rem+var(--status-bar-height))]">
          <h2 className="text-lg font-medium text-foreground">Menu</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-full hover:bg-accent transition-colors"
          >
            <X size={20} className="text-foreground" />
          </button>
        </div>

        {/* User Info */}
        {isAuthenticated && user && (
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-4">
              <div className="size-14 rounded-full overflow-hidden border border-border">
                <Image
                  src={user.image || "/images/default-avatar.png"}
                  alt="User"
                  width={56}
                  height={56}
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-medium text-foreground truncate">
                  {user.username?.toLowerCase() ||
                    user.name?.split(" ")[0]?.toLowerCase() ||
                    "not set"}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <Link
            href="/dashboard"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-4 px-4 py-3 text-foreground hover:bg-accent rounded-lg transition-colors"
          >
            <LayoutDashboard size={20} />
            <span className="text-base">Dashboard</span>
          </Link>
          <Link
            href="/call-history"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-4 px-4 py-3 text-foreground hover:bg-accent rounded-lg transition-colors"
          >
            <History size={20} />
            <span className="text-base">Call History</span>
          </Link>
          <Link
            href="/settings"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-4 px-4 py-3 text-foreground hover:bg-accent rounded-lg transition-colors"
          >
            <Settings size={20} />
            <span className="text-base">Settings</span>
          </Link>

          {showInstallPrompt && !isStandalone && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-4 px-4 py-3 text-foreground hover:bg-accent rounded-lg transition-colors w-full"
            >
              <Download size={20} />
              <span className="text-base">Install App</span>
            </button>
          )}
        </nav>

        {/* Logout Button at Bottom */}
        <div className="mt-auto p-4 border-t border-border">
          <button
            onClick={() => {
              setSidebarOpen(false);
              authService.logout("/");
            }}
            className="flex w-full items-center gap-4 px-4 py-3 text-destructive hover:bg-accent rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span className="text-base">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}
