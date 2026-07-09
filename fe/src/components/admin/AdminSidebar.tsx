"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAdminAuth } from "./AdminAuthProvider";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  AlertTriangle,
  Settings,
  LogOut,
  ShieldAlert,
  BarChart3,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/console/dashboard", icon: LayoutDashboard },
  { name: "Users", href: "/console/users", icon: Users },
  { name: "Chat Rooms", href: "/console/rooms", icon: MessageSquare },
  { name: "Reports", href: "/console/reports", icon: AlertTriangle },
  { name: "Moderation", href: "/console/moderation", icon: ShieldAlert },
  { name: "Analytics", href: "/console/analytics", icon: BarChart3 },
  { name: "Settings", href: "/console/settings", icon: Settings },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { admin, logout } = useAdminAuth();

  return (
    <div className="flex h-full flex-col bg-surface-dark text-on-dark">
      {/* Logo/Brand */}
      <div className="flex h-16 shrink-0 items-center justify-center border-b border-white/10">
        <h1 className="text-xl font-semibold">Admin Console</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/");

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "bg-surface-dark-elevated text-on-dark"
                  : "text-on-dark/70 hover:bg-surface-dark-elevated hover:text-on-dark",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Admin Info & Logout */}
      <div className="shrink-0 border-t border-white/10 p-4">
        <div className="mb-3 min-w-0">
          <p className="truncate text-sm font-medium">
            {admin?.name || admin?.email}
          </p>
          <p className="text-xs text-on-dark/60">{admin?.role}</p>
        </div>
        <Button
          variant="ghost"
          className="min-h-11 w-full justify-start text-on-dark/70 hover:bg-surface-dark-elevated hover:text-on-dark"
          onClick={logout}
        >
          <LogOut className="mr-3 h-5 w-5" />
          Logout
        </Button>
      </div>
    </div>
  );
}

export function AdminSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface-dark px-4 text-on-dark lg:hidden">
        <h1 className="text-lg font-semibold">Admin Console</h1>
        <Sheet open={open} onOpenChange={setOpen}>
          <Button
            variant="ghost"
            size="icon"
            className="text-on-dark hover:bg-surface-dark-elevated hover:text-on-dark"
            onClick={() => setOpen(true)}
            aria-label="Open admin navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <SheetContent side="left" className="w-72 border-0 p-0 sm:max-w-72">
            <SheetHeader className="sr-only">
              <SheetTitle>Admin navigation</SheetTitle>
            </SheetHeader>
            <SidebarNav onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </header>

      {/* Desktop sidebar */}
      <div className="hidden lg:block lg:w-64 lg:shrink-0">
        <SidebarNav />
      </div>
    </>
  );
}
