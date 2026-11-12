import { redirect } from "next/navigation";
import Link from "next/link";
import { CURATED_EXAMPLES } from "@/lib/curated-examples";
import { validateDomain } from "@/lib/validation/domain";
import { InvalidDomainError } from "@/lib/errors";

async function handleSearch(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  "use server";
  const raw = (formData.get("domain") as string)?.trim() ?? "";

  try {
    const domain = validateDomain(raw);
    redirect(`/${encodeURIComponent(domain)}`);
  } catch (err) {
    if (err instanceof InvalidDomainError) {
      return { error: err.message };
    }
    throw err; // redirect throws internally — let Next.js handle it
  }

  // Unreachable, but satisfies the return type
  return { error: null };
}

// Thin wrapper so we can use useFormState without making the whole page "use client"
import LandingForm from "./LandingForm";

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16 space-y-12">
      {/* Header */}
      <header className="text-center space-y-4 max-w-2xl">
        <div className="text-6xl" aria-hidden="true">🕸️</div>
        <h1 className="text-4xl md:text-5xl font-bold text-bone font-spooky tracking-tight">
          Back to the Past
        </h1>
        <p className="text-gray-400 text-lg leading-relaxed">
          Enter a domain and travel through its history. Every year the Internet
          Archive captured comes back to life — narrated by a spooky AI.
        </p>
      </header>

      <LandingForm handleSearch={handleSearch} />

      {/* Curated examples */}
      <section className="text-center space-y-4" aria-label="Curated examples">
        <h2 className="text-xs uppercase tracking-widest text-gray-600">
          Or summon a ghost from the past
        </h2>
        <div className="flex flex-wrap justify-center gap-2">
          {CURATED_EXAMPLES.map(({ domain, label }) => (
            <Link
              key={domain}
              href={`/${encodeURIComponent(domain)}`}
              className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-full text-sm text-gray-300
                         hover:border-pumpkin hover:text-pumpkin transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="text-xs text-gray-700 text-center">
        <p>Powered by the Internet Archive Wayback Machine · Kiroween 2026</p>
      </footer>
    </main>
  );
}
