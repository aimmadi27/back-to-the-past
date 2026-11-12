import { InvalidDomainError } from "@/lib/errors";

/**
 * Validate and normalise a domain string.
 * Accepts plain hostnames (example.com, sub.example.co.uk).
 * Rejects: IP addresses, localhost, paths, schemes, ports, empty strings.
 *
 * Returns the lower-cased hostname on success, throws InvalidDomainError otherwise.
 */
export function validateDomain(raw: string): string {
  if (!raw || typeof raw !== "string") {
    throw new InvalidDomainError(raw);
  }

  const trimmed = raw.trim().toLowerCase();

  // Reject if it looks like it has a scheme
  if (/^[a-z][a-z0-9+\-.]*:\/\//i.test(trimmed)) {
    throw new InvalidDomainError(raw);
  }

  // Strip a leading "www." for normalisation but keep the rest
  // We validate on the full trimmed value
  const withoutPath = trimmed.split("/")[0];

  // Reject ports
  if (withoutPath.includes(":")) {
    throw new InvalidDomainError(raw);
  }

  // Must be a valid hostname: labels of 1-63 chars, only a-z0-9 and hyphens,
  // not starting or ending with a hyphen, at least two labels (TLD required).
  const hostnameRegex =
    /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

  if (!hostnameRegex.test(withoutPath)) {
    throw new InvalidDomainError(raw);
  }

  // Reject localhost variants
  if (withoutPath === "localhost" || withoutPath.endsWith(".localhost")) {
    throw new InvalidDomainError(raw);
  }

  // Reject plain IP addresses (v4)
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(withoutPath)) {
    throw new InvalidDomainError(raw);
  }

  return withoutPath;
}
