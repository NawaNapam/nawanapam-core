"use client";

import Header from "@/components/custom/Header";
import HeroSection from "@/components/custom/HeroSection";
import Footer from "@/components/custom/Footer";

export default function Landing() {
  return (
    <main className="min-h-screen flex flex-col bg-background">
      <Header />
      <section className="flex-1 flex flex-col w-full pt-[calc(4rem+var(--status-bar-height))]">
        <HeroSection />
      </section>
      <Footer />
    </main>
  );
}
