import { redirect } from "next/navigation";
import Link from "next/link";
import { CURATED_EXAMPLES } from "@/lib/curated-examples";

async function handleSearch(formData: FormData) {
  "use server";
  const domain = (formData.get("domain") as string)?.trim();
  if (domain) {
    redirect(`/${encodeURIComponent(domain)}`);
  }
}

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

      {/* Search form */}
      <section className="w-full max-w-md space-y-4" aria-label="Domain search">
        <form action={handleSearch} className="flex gap-2">
          <label htmlFor="domain-input" className="sr-only">
            Enter a domain name
          </label>
          <input
            id="domain-input"
            name="domain"
            type="text"
            placeholder="example.com"
            autoComplete="off"
            spellCheck={false}
            required
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-bone placeholder-gray-600
                       focus:outline-none focus:border-pumpkin focus:ring-1 focus:ring-pumpkin transition-colors"
            aria-describedby="domain-hint"
          />
          <button
            type="submit"
            className="bg-pumpkin-500 hover:bg-pumpkin-600 text-white font-semibold px-5 py-3 rounded-lg
                       transition-colors focus:outline-none focus:ring-2 focus:ring-pumpkin focus:ring-offset-2
                       focus:ring-offset-gray-950"
          >
            Travel
          </button>
        </form>
        <p id="domain-hint" className="text-xs text-gray-600 text-center">
          Hostname only — no https://, no paths. e.g. <code className="text-gray-500">bbc.co.uk</code>
        </p>
      </section>

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
