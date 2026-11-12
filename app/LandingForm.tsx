"use client";

import { useActionState } from "react";

interface LandingFormProps {
  handleSearch: (
    prevState: { error: string | null },
    formData: FormData
  ) => Promise<{ error: string | null }>;
}

/**
 * Client wrapper so the domain form can display server-side validation errors
 * using useActionState without making the whole landing page a client component.
 */
export default function LandingForm({ handleSearch }: LandingFormProps) {
  const [state, formAction, isPending] = useActionState(handleSearch, { error: null });

  return (
    <section className="w-full max-w-md space-y-4" aria-label="Domain search">
      <form action={formAction} className="flex gap-2">
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
          aria-describedby="domain-hint"
          aria-invalid={state.error ? "true" : undefined}
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-bone placeholder-gray-600
                     focus:outline-none focus:border-pumpkin focus:ring-1 focus:ring-pumpkin transition-colors
                     aria-[invalid=true]:border-red-500"
        />
        <button
          type="submit"
          disabled={isPending}
          className="bg-pumpkin-500 hover:bg-pumpkin-600 disabled:opacity-60 text-white font-semibold px-5 py-3 rounded-lg
                     transition-colors focus:outline-none focus:ring-2 focus:ring-pumpkin focus:ring-offset-2
                     focus:ring-offset-gray-950"
        >
          {isPending ? "…" : "Travel"}
        </button>
      </form>

      {state.error ? (
        <p role="alert" className="text-red-400 text-xs text-center">
          {state.error}
        </p>
      ) : (
        <p id="domain-hint" className="text-xs text-gray-600 text-center">
          Hostname only — no https://, no paths. e.g.{" "}
          <code className="text-gray-500">bbc.co.uk</code>
        </p>
      )}
    </section>
  );
}
