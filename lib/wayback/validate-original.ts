import { InvalidDomainError } from "@/lib/errors";

/**
 * Validate that an `original` URL from the CDX response is safe to use
 * as the base URL for a Wayback fetch.
 *
 * Rules:
 *  - Must be a string
 *  - Must parse as a valid URL
 *  - Scheme must be http or https
 *  - Hostname must match the validated domain (exact or www. prefix)
 *
 * Returns the original URL unchanged on success, throws InvalidDomainError
 * otherwise so the route handler can return a 400.
 */
export function validateOriginalUrl(original: string, validDomain: string): string {
  if (!original || typeof original !== "string") {
    throw new InvalidDomainError(`original URL is missing`);
  }

  let parsed: URL;
  try {
    parsed = new URL(original);
  } catch {
    throw new InvalidDomainError(`original URL is not a valid URL: "${original}"`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new InvalidDomainError(`original URL has unexpected scheme: "${parsed.protocol}"`);
  }

  // Allow an exact hostname match, or the domain with a leading "www."
  const host = parsed.hostname.toLowerCase();
  if (host !== validDomain && host !== `www.${validDomain}` && !host.endsWith(`.${validDomain}`)) {
    throw new InvalidDomainError(
      `original URL hostname "${host}" does not match domain "${validDomain}"`
    );
  }

  return original;
}
