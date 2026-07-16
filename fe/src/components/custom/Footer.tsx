"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Heart, ArrowUp, Mail } from "lucide-react";
import { policySections } from "@/constants/policies";

export default function Footer() {
  const [modalOpen, setModalOpen] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();
  const activeSection = policySections.find((s) => s.slug === modalOpen);

  return (
    <>
      <footer className="bg-background border-t border-border">
        <div className="container mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-center">
            {/* Brand */}
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-border">
                  <Image
                    src="/images/logo.jpg"
                    alt="NawaNapam"
                    width={40}
                    height={40}
                    className="object-cover"
                  />
                </div>
                <h4 className="text-xl font-medium tracking-tight text-foreground">
                  NawaNapam
                </h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Connecting souls with respect and warmth
              </p>
              <a
                href="mailto:support@nawanapam.com"
                className="flex items-center justify-center md:justify-start gap-2 mt-4 text-sm text-link hover:text-link-active transition-colors"
              >
                <Mail size={14} />
                <span className="font-medium">support@nawanapam.com</span>
              </a>
            </div>

            {/* Policy Links */}
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              {policySections.map((section) => (
                <Link
                  key={section.slug}
                  href={`/${section.slug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setModalOpen(section.slug);
                  }}
                  className="text-body hover:text-foreground font-medium transition-colors"
                >
                  {section.title.replace(/ of | /g, " ")}
                </Link>
              ))}
            </div>

            {/* Back to Top */}
            <div className="text-center md:text-right">
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="inline-flex items-center gap-2 text-sm font-medium text-body hover:text-foreground transition-colors group"
              >
                <div className="p-2 rounded-full border border-border group-hover:bg-accent transition-colors">
                  <ArrowUp size={16} />
                </div>
                Back to Top
              </button>
            </div>
          </div>

          {/* Bottom */}
          <div className="mt-12 pt-8 border-t border-border text-center text-xs text-muted-foreground">
            <p>
              © {currentYear} NawaNapam. Made with{" "}
              <Heart className="inline fill-current text-signature-coral" size={12} />{" "}
              in India
            </p>
          </div>
        </div>
      </footer>

      {/* Modal Overlay */}
      {activeSection && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setModalOpen(null)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[85vh] bg-card rounded-lg border border-border overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-8 pb-4 border-b border-border">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-medium text-foreground">
                  {activeSection.title}
                </h2>
                <button
                  onClick={() => setModalOpen(null)}
                  className="p-2 rounded-full border border-border hover:bg-accent transition-colors"
                >
                  <X size={20} className="text-foreground" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 pt-6 overflow-y-auto max-h-[65vh]">
              <ol className="space-y-4 text-body text-sm leading-relaxed">
                {activeSection.items.map((item, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="font-medium text-foreground">{i + 1}.</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="p-6 border-t border-border flex items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground">
                Last updated: November 2025
              </p>
              <Link
                href={`/${activeSection.slug}`}
                onClick={() => setModalOpen(null)}
                className="text-sm font-medium text-link hover:text-link-active transition-colors"
              >
                Learn more →
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
