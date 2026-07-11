import { AdminAuthProvider } from "@/components/admin/AdminAuthProvider";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin | NawaNapam",
  description: "Administration dashboard",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthProvider>
      <div className="flex h-screen flex-col overflow-hidden lg:flex-row">
        <AdminSidebar />
        <main className="min-h-0 flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </AdminAuthProvider>
  );
}
