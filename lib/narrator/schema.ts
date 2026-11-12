import { z } from "zod";
import { validateDomain } from "@/lib/validation/domain";

/** Max lengths to prevent prompt injection / credit drain */
const MAX_STRING = 200;
const MAX_ARRAY = 20;

const cappedString = z.string().max(MAX_STRING);
const cappedStringArray = z.array(cappedString).max(MAX_ARRAY);

/** Mirrors FeatureDiff — all string fields capped, arrays capped. */
const featureDiffSchema = z.object({
  fromYear: z.number().int().min(1990).max(2100),
  toYear: z.number().int().min(1990).max(2100),
  titleChanged: z.boolean(),
  fromTitle: cappedString,
  toTitle: cappedString,
  addedHeadings: cappedStringArray,
  removedHeadings: cappedStringArray,
  addedNavLinks: cappedStringArray,
  removedNavLinks: cappedStringArray,
  addedTech: cappedStringArray,
  removedTech: cappedStringArray,
  flashDied: z.boolean(),
  flashBorn: z.boolean(),
  metaDescriptionChanged: z.boolean(),
  fromMetaDescription: cappedString,
  toMetaDescription: cappedString,
  imageCountDelta: z.number().int(),
  linkCountDelta: z.number().int(),
  addedImageAlts: cappedStringArray,
  removedImageAlts: cappedStringArray,
  addedMainCopy: cappedStringArray,
  removedMainCopy: cappedStringArray,
});

export const narrateBodySchema = z.object({
  domain: z.string().max(253).refine(
    (d) => {
      try { validateDomain(d); return true; } catch { return false; }
    },
    { message: "domain must be a valid hostname" }
  ),
  diff: featureDiffSchema,
});

export type NarrateBody = z.infer<typeof narrateBodySchema>;
