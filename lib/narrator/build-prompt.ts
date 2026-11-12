import type { FeatureDiff } from "@/lib/diff/diff-features";

/**
 * Build the system + user prompt for the spooky narrator.
 * Input is the structured diff — never raw HTML.
 */
export function buildNarratorPrompt(diff: FeatureDiff, domain: string): string {
  const changes = summariseChanges(diff);

  return `You are a spooky Halloween narrator describing changes to a website across time.
Domain: ${domain}
Years: ${diff.fromYear} → ${diff.toYear}

You have been given a structured list of changes observed between two archived snapshots of the site.
Only describe changes that are present in the list below — do NOT invent or hallucinate additional changes.
Write 3–5 sentences in a dramatic, slightly spooky voice, as if narrating a ghost story.
Reference specific details from the diff (titles, features, links) to make it feel grounded and real.

CHANGES DETECTED:
${changes.length > 0 ? changes.map((c) => `- ${c}`).join("\n") : "- No significant changes detected."}`;
}

function summariseChanges(diff: FeatureDiff): string[] {
  const lines: string[] = [];

  if (diff.titleChanged) {
    lines.push(`Title changed from "${diff.fromTitle}" to "${diff.toTitle}"`);
  }

  if (diff.flashDied) {
    lines.push("Flash content vanished — the era of .swf files ended");
  }

  if (diff.flashBorn) {
    lines.push("Flash content appeared on the site");
  }

  if (diff.removedTech.length > 0) {
    lines.push(`Technologies removed: ${diff.removedTech.join(", ")}`);
  }

  if (diff.addedTech.length > 0) {
    lines.push(`New technologies adopted: ${diff.addedTech.join(", ")}`);
  }

  if (diff.removedHeadings.length > 0) {
    lines.push(`Headings that disappeared: ${diff.removedHeadings.slice(0, 5).map((h) => `"${h}"`).join(", ")}`);
  }

  if (diff.addedHeadings.length > 0) {
    lines.push(`New headings appeared: ${diff.addedHeadings.slice(0, 5).map((h) => `"${h}"`).join(", ")}`);
  }

  if (diff.removedNavLinks.length > 0) {
    lines.push(`Navigation links removed: ${diff.removedNavLinks.slice(0, 5).map((l) => `"${l}"`).join(", ")}`);
  }

  if (diff.addedNavLinks.length > 0) {
    lines.push(`Navigation links added: ${diff.addedNavLinks.slice(0, 5).map((l) => `"${l}"`).join(", ")}`);
  }

  if (diff.metaDescriptionChanged) {
    if (diff.fromMetaDescription && !diff.toMetaDescription) {
      lines.push("The site's meta description was removed");
    } else if (!diff.fromMetaDescription && diff.toMetaDescription) {
      lines.push(`A meta description appeared: "${diff.toMetaDescription.slice(0, 100)}"`);
    } else {
      lines.push("The site's self-description changed");
    }
  }

  if (Math.abs(diff.imageCountDelta) > 2) {
    lines.push(
      diff.imageCountDelta > 0
        ? `${diff.imageCountDelta} more images appeared`
        : `${Math.abs(diff.imageCountDelta)} images vanished`
    );
  }

  if (diff.removedImageAlts.length > 0) {
    lines.push(
      `Images lost: ${diff.removedImageAlts.slice(0, 3).map((a) => `"${a}"`).join(", ")}`
    );
  }

  return lines;
}
