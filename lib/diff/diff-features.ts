import type { PageFeatures } from "./extract-features";

export interface FeatureDiff {
  fromYear: number;
  toYear: number;
  titleChanged: boolean;
  fromTitle: string;
  toTitle: string;
  addedHeadings: string[];
  removedHeadings: string[];
  addedNavLinks: string[];
  removedNavLinks: string[];
  addedTech: string[];
  removedTech: string[];
  flashDied: boolean;
  flashBorn: boolean;
  metaDescriptionChanged: boolean;
  fromMetaDescription: string;
  toMetaDescription: string;
  imageCountDelta: number;
  linkCountDelta: number;
  addedImageAlts: string[];
  removedImageAlts: string[];
  addedMainCopy: string[];
  removedMainCopy: string[];
}

/**
 * Compute a structured diff between two sets of page features.
 * This is the input to the AI narrator — never raw HTML.
 */
export function diffFeatures(
  from: PageFeatures,
  fromYear: number,
  to: PageFeatures,
  toYear: number
): FeatureDiff {
  return {
    fromYear,
    toYear,
    titleChanged: from.title !== to.title,
    fromTitle: from.title,
    toTitle: to.title,
    addedHeadings: setDiff(to.headings, from.headings),
    removedHeadings: setDiff(from.headings, to.headings),
    addedNavLinks: setDiff(to.navLinks, from.navLinks),
    removedNavLinks: setDiff(from.navLinks, to.navLinks),
    addedTech: setDiff(to.techHints, from.techHints),
    removedTech: setDiff(from.techHints, to.techHints),
    flashDied: from.hasFlash && !to.hasFlash,
    flashBorn: !from.hasFlash && to.hasFlash,
    metaDescriptionChanged: from.metaDescription !== to.metaDescription,
    fromMetaDescription: from.metaDescription,
    toMetaDescription: to.metaDescription,
    imageCountDelta: to.imageCount - from.imageCount,
    linkCountDelta: to.linkCount - from.linkCount,
    addedImageAlts: setDiff(to.imageAlts, from.imageAlts),
    removedImageAlts: setDiff(from.imageAlts, to.imageAlts),
    addedMainCopy: setDiff(to.mainCopy, from.mainCopy),
    removedMainCopy: setDiff(from.mainCopy, to.mainCopy),
  };
}

/** Items in `a` that are not in `b`. */
function setDiff(a: string[], b: string[]): string[] {
  const setB = new Set(b);
  return a.filter((x) => !setB.has(x));
}
