import { stripDiacritics } from "@/lib/productCategory";

/**
 * Produse apicole (miere, propolis, polen, lăptișor de matcă etc.) — nu au o
 * subcategorie proprie în taxonomie (propolisul cade în "Suplimente și vitamine",
 * mierea simplă în "Diverse"), deci se recunosc după nume. Folosit ca să afișăm
 * bannerul Apiland.ro doar publicului care chiar caută produse apicole.
 *
 * "polen" singur NU e cuvânt-cheie — ar prinde "spray pentru alergia la polen";
 * "polen de albine" e prins oricum de "albine".
 */
const BEE_KEYWORDS = [
  "propolis",
  "miere",
  "albine",
  "laptisor de matca",
  "pastura",
  "apilarnil",
  "apicol",
  "fagure",
  "faguri",
  "polen poliflor",
  "polen crud",
  "polen uscat",
  "polen proaspat",
  "honig",
  "gelee royale",
  "blutenpollen",
  "bienen",
].map(stripDiacritics);

const MANUKA_CATEGORY = "Miere de Manuka";

/**
 * Mierea de Manuka are deja promoția ei (ManukaShop.ro) — exclusă explicit, ca
 * să nu trimitem acel public spre alt magazin. Verificat și pe categorie, nu
 * doar pe nume: unele produse Manuka apar doar ca "Miere MGO 400+".
 */
export function isBeeProduct(text: string, category?: string | null): boolean {
  if (category === MANUKA_CATEGORY) return false;
  const normalized = stripDiacritics(text.toLowerCase());
  if (normalized.includes("manuka")) return false;
  return BEE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}
