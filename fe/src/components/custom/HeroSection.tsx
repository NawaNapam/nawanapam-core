"use client";

import Link from "next/link";
import { Video, Zap, Users, Globe, Shield, EyeOff } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import HowStreaksWork from "@/components/custom/HowStreaksWork";

const WHY_CHOOSE_US = [
  {
    title: "100% Anonymous",
    desc: "No names, no profiles, no trace. Just you and the moment.",
    icon: EyeOff,
  },
  {
    title: "Instant Match",
    desc: "Connected in under 3 seconds — no waiting, no queues.",
    icon: Zap,
  },
  {
    title: "Global Reach",
    desc: "Chat with anyone, anytime, anywhere on Earth.",
    icon: Globe,
  },
  {
    title: "End-to-End Encrypted",
    desc: "Your video and audio are protected at all times.",
    icon: Shield,
  },
];

export default function HeroSection() {
  const { isAuthenticated, user, isLoading } = useAuthStore();

  return (
    <>
      {/* HERO BAND — calm canvas, no gradients or animation */}
      <section className="py-section w-full">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 border border-border rounded-full px-5 py-2 text-sm font-medium text-body">
              <Zap size={14} />
              <span>Instant · Anonymous · Global</span>
            </div>

            {/* Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-medium text-foreground leading-[1.1] tracking-tight">
              Nawa Juri Gate,{" "}
              <span className="text-signature-coral">in one click</span>
            </h1>

            {/* Description */}
            <p className="max-w-xl mx-auto text-lg text-body leading-relaxed">
              Skip the small talk. Connect instantly with souls across Bharat
              and the world — just you, them, and the moment.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              {isLoading ? (
                <div className="w-full sm:w-64 h-12 bg-muted rounded-lg animate-pulse" />
              ) : isAuthenticated ? (
                <>
                  <Link
                    href="/chat"
                    className="w-full sm:w-auto h-12 px-8 rounded-lg bg-primary text-primary-foreground font-medium inline-flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
                  >
                    <Video size={20} />
                    Start Video Chat
                  </Link>
                  <Link
                    href="/dashboard"
                    className="w-full sm:w-auto h-12 px-8 rounded-lg border border-border text-foreground font-medium inline-flex items-center justify-center gap-2 hover:bg-accent transition-colors"
                  >
                    <Users size={20} />
                    Dashboard
                  </Link>
                </>
              ) : (
                <Link
                  href="/chat"
                  className="w-full sm:w-auto h-12 px-8 rounded-lg bg-primary text-primary-foreground font-medium inline-flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
                >
                  <Video size={20} />
                  {isAuthenticated && user
                    ? "Start Chatting Now"
                    : "Get Started Now"}
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SIGNATURE CORAL CARD — the page's one brand-voltage moment */}
      <section className="w-full px-4 sm:px-6 lg:px-8 pb-section">
        <div className="container mx-auto">
          <div className="rounded-lg bg-signature-coral text-white px-6 py-12 sm:px-12 sm:py-16">
            <div className="text-center mb-12 max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-medium mb-4">
                Why choose NawaNapam?
              </h2>
              <p className="text-white/80 text-lg">
                Rooted in culture, built for the world — anonymous, instant, and
                truly human.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
              {WHY_CHOOSE_US.map((f) => (
                <article
                  key={f.title}
                  className="bg-background rounded-md p-6 text-center flex flex-col items-center gap-3"
                >
                  <f.icon size={24} className="text-signature-coral" />
                  <h3 className="font-medium text-foreground">{f.title}</h3>
                  <p className="text-sm text-body leading-relaxed">{f.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <HowStreaksWork />
    </>
  );
}
