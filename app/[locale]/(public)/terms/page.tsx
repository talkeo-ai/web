import { LegalDocument } from "@/components/legal/legal-document";
import { getLegalDocument } from "@/lib/legal";

/**
 * Reads nothing that depends on the request, so it prerenders whole.
 */
export default async function TermsPage() {
  return <LegalDocument document={await getLegalDocument("terms")} />;
}
