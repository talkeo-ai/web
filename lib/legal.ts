import { getTranslations } from "next-intl/server";

export type LegalSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type LegalDocument = {
  title: string;
  updated: string;
  sections: LegalSection[];
};

export const LEGAL_DOCUMENTS = ["terms", "privacy", "refunds"] as const;

export type LegalDocumentName = (typeof LEGAL_DOCUMENTS)[number];

/**
 * The reference locale for legal text.
 *
 * These documents are kept in one language on purpose. Three translations of a
 * contract drift apart the moment one of them is edited, and the version a
 * reader happens to land on would decide what the terms say. Translating them
 * is a legal review, not a copy task — until that happens there is a single
 * text, and the interface around it is what follows the reader's locale.
 */
const REFERENCE_LOCALE = "en";

export async function getLegalDocument(
  name: LegalDocumentName,
): Promise<LegalDocument> {
  const t = await getTranslations({
    locale: REFERENCE_LOCALE,
    namespace: `legal.${name}`,
  });

  return {
    title: t("title"),
    updated: t("updated"),
    // `raw` because the sections are structured content rather than a message:
    // there is nothing to interpolate and the shape is what matters.
    sections: t.raw("sections") as LegalSection[],
  };
}
