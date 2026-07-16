"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, Settings, MessageSquare, History } from "lucide-react";
import { platform } from "@/platform";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Home",    icon: Home,          href: "/dashboard"     },
  { label: "Chat",    icon: MessageSquare, href: "/chat"          },
  { label: "History", icon: History,       href: "/call-history"  },
  { label: "Profile", icon: Settings,      href: "/settings"      },
] as const;

interface NativeShellProps {
  children: React.ReactNode;
}

/**
 * Full-screen native Android shell.
 * Wraps all authenticated native screens with a persistent bottom tab bar
 * that mimics Material You design (translucent pill indicator, haptic press,
 * safe-area-aware padding).
 *
 * Only renders the bottom nav on native; on web it's transparent passthrough.
 */
export default function NativeShell({ children }: NativeShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  if (!platform.isNative) {
    return <>{children}</>;
  }

  return (
    <div
      className="flex flex-col bg-background"
      style={{
        height: "100dvh",
        paddingTop: "var(--status-bar-height)",
      }}
    >
      {/* Scrollable page content */}
      <div className="flex-1 overflow-y-auto overscroll-none">
        {children}
      </div>

      {/* Bottom Navigation Bar */}
      <nav
        aria-label="App navigation"
        className="
          shrink-0 border-t border-border
          bg-background/95 backdrop-blur-md
          px-2
          pb-[env(safe-area-inset-bottom)]
        "
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)" }}
      >
        <div className="flex items-stretch h-16">
          {TABS.map(({ label, icon: Icon, href }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <button
                key={href}
                id={`nav-tab-${label.toLowerCase()}`}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                onClick={() => router.push(href)}
                className={cn(
                  "relative flex-1 flex flex-col items-center justify-center gap-1",
                  "rounded-xl transition-all duration-150",
                  "active:scale-90 active:opacity-70",
                  "focus:outline-none",
                )}
              >
                {/* Active pill indicator */}
                {active && (
                  <span
                    className="
                      absolute top-1.5 left-1/2 -translate-x-1/2
                      h-1 w-10 rounded-full
                      bg-signature-forest
                    "
                  />
                )}

                <Icon
                  size={22}
                  strokeWidth={active ? 2.2 : 1.8}
                  className={cn(
                    "transition-colors duration-150",
                    active
                      ? "text-signature-forest dark:text-signature-mint"
                      : "text-muted-foreground",
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] font-medium leading-none transition-colors duration-150",
                    active
                      ? "text-signature-forest dark:text-signature-mint"
                      : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
