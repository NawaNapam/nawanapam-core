"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { notificationService } from "@/services/notifications";

/** Mounted once near the app root; only does anything once a user is signed in. */
export default function NativePush() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status !== "authenticated") return;

    const unsubscribe = notificationService.onNotificationTap((data) => {
      // Match-found, background chat messages, and reminders all resolve
      // back to the call screen for now — there's nowhere else to route to.
      if (data.type === "match" || data.type === "message" || data.type === "reminder") {
        router.push("/chat");
      }
    });

    notificationService.register();

    return unsubscribe;
  }, [status, router]);

  return null;
}
