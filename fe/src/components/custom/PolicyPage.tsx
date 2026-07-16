import Header from "@/components/custom/Header";
import Footer from "@/components/custom/Footer";
import type { PolicySection } from "@/constants/policies";

export default function PolicyPage({ title, items }: PolicySection) {
  return (
    <main className="min-h-screen flex flex-col bg-background">
      <Header />
      <section className="flex-1 w-full pt-[calc(6rem+var(--status-bar-height))] pb-16">
        <div className="container mx-auto px-6 max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-medium text-foreground mb-8">
            {title}
          </h1>
          <ol className="space-y-4 text-body text-sm leading-relaxed">
            {items.map((item, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-medium text-foreground">{i + 1}.</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
          <p className="mt-12 text-xs text-muted-foreground">
            Last updated: November 2025
          </p>
        </div>
      </section>
      <Footer />
    </main>
  );
}
