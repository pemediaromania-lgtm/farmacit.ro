import { XMLParser } from "fast-xml-parser";
import Papa from "papaparse";

export interface RawFeedProduct {
  externalId: string | null;
  name: string;
  description: string | null;
  price: number | null;
  oldPrice: number | null;
  currency: string | null;
  category: string | null;
  brand: string | null;
  merchant: string | null;
  imageUrl: string | null;
  affiliateUrl: string | null;
  availability: string | null;
  gtin: string | null;
}

const HTML_ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&lt;": "<",
  "&gt;": ">",
};

function decodeHtmlEntities(text: string | null): string | null {
  if (!text) return text;
  return text.replace(/&nbsp;|&amp;|&quot;|&#39;|&apos;|&lt;|&gt;/g, (m) => HTML_ENTITIES[m] ?? m).trim();
}

function toNumber(raw: unknown): number | null {
  if (raw === undefined || raw === null) return null;
  const str = String(raw).trim();
  if (!str) return null;
  const cleaned = str.replace(/[^0-9.,-]/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : null;
}

/**
 * Unele feed-uri (ex: cele generate din Shopify) pun mai multe URL-uri de imagine
 * separate prin virgulă în același câmp `image_urls` — produsul are un singur
 * `imageUrl` în schema noastră, deci păstrăm doar primul.
 */
function firstImageUrl(raw: string | null): string | null {
  if (!raw) return null;
  const first = raw.split(",")[0]?.trim();
  return first || null;
}

/**
 * 2Performant pune un identificator stabil de produs în query-ul `unique=` al
 * link-ului de afiliere. Valoarea poate conține `_` și `-` (ex: "b_kQIKB89D6B"),
 * deci se citește tot ce urmează până la următorul `&` sau finalul string-ului —
 * NU doar caractere alfanumerice, ca să nu trunchiem id-uri diferite la aceeași valoare.
 */
function extractUniqueFromUrl(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/[?&]unique=([^&]+)/);
  return match ? match[1] : null;
}

// ---------- CSV (format real 2Performant: title,aff_code,price,campaign_name,image_urls,description) ----------

const CSV_FIELD_CANDIDATES = {
  name: ["title", "name", "product_name"],
  price: ["price"],
  merchant: ["campaign_name", "merchant", "store"],
  imageUrl: ["image_urls", "image_url", "image"],
  description: ["description", "desc"],
  affiliateUrl: ["aff_code", "url", "link", "affiliate_url"],
  category: ["category_name", "category"],
  brand: ["brand", "manufacturer"],
  oldPrice: ["old_price", "oldprice"],
  currency: ["currency"],
  availability: ["availability", "stock"],
  id: ["unique_id", "id", "sku", "product_id"],
  gtin: ["gtin", "ean", "barcode"],
} as const;

function pickCsv(row: Record<string, string>, candidates: readonly string[]): string | null {
  for (const key of candidates) {
    const value = row[key];
    if (value !== undefined && value.trim().length > 0) return value.trim();
  }
  return null;
}

function parseCsvFeed(csvText: string): RawFeedProduct[] {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  return parsed.data.map((row) => {
    const normalizedRow: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      normalizedRow[key.trim().toLowerCase()] = typeof value === "string" ? value : String(value ?? "");
    }

    const affiliateUrl = pickCsv(normalizedRow, CSV_FIELD_CANDIDATES.affiliateUrl);
    const explicitId = pickCsv(normalizedRow, CSV_FIELD_CANDIDATES.id);

    return {
      externalId: explicitId ?? extractUniqueFromUrl(affiliateUrl),
      name: pickCsv(normalizedRow, CSV_FIELD_CANDIDATES.name) ?? "Produs fără nume",
      description: decodeHtmlEntities(pickCsv(normalizedRow, CSV_FIELD_CANDIDATES.description)),
      price: toNumber(pickCsv(normalizedRow, CSV_FIELD_CANDIDATES.price)),
      oldPrice: toNumber(pickCsv(normalizedRow, CSV_FIELD_CANDIDATES.oldPrice)),
      currency: pickCsv(normalizedRow, CSV_FIELD_CANDIDATES.currency),
      category: pickCsv(normalizedRow, CSV_FIELD_CANDIDATES.category),
      brand: pickCsv(normalizedRow, CSV_FIELD_CANDIDATES.brand),
      merchant: pickCsv(normalizedRow, CSV_FIELD_CANDIDATES.merchant),
      imageUrl: firstImageUrl(pickCsv(normalizedRow, CSV_FIELD_CANDIDATES.imageUrl)),
      affiliateUrl,
      availability: pickCsv(normalizedRow, CSV_FIELD_CANDIDATES.availability),
      gtin: pickCsv(normalizedRow, CSV_FIELD_CANDIDATES.gtin),
    };
  });
}

// ---------- XML (alte feed-uri posibile: Google Shopping style, YML, 2Performant XML) ----------

const XML_FIELD_CANDIDATES: Record<keyof Omit<RawFeedProduct, "externalId" | "merchant">, string[]> = {
  name: ["name", "title", "product_name", "productname"],
  description: ["description", "desc", "short_description"],
  price: ["price", "sale_price", "price_ron"],
  oldPrice: ["old_price", "oldprice", "regular_price", "list_price"],
  currency: ["currency", "currency_id"],
  category: ["category_name", "category", "product_type", "google_product_category"],
  brand: ["brand", "manufacturer", "vendor"],
  imageUrl: ["image_urls", "image_url", "image", "image_link", "main_image", "imageurl"],
  affiliateUrl: ["aff_code", "url", "link", "affiliate_url", "deeplink", "producturl"],
  availability: ["availability", "stock", "in_stock", "instock"],
  gtin: ["gtin", "ean", "barcode"],
};

const XML_ID_CANDIDATES = ["unique_id", "id", "sku", "product_id", "uniqueid"];
const XML_MERCHANT_CANDIDATES = ["campaign_name", "merchant", "store", "advertiser"];

function normalizeXmlKeys(node: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    out[key.toLowerCase().replace(/^g:/, "")] = value;
  }
  return out;
}

function pickXml(node: Record<string, unknown>, candidates: string[]): string | null {
  for (const key of candidates) {
    const value = node[key];
    if (value === undefined || value === null) continue;
    if (typeof value === "object") continue;
    const str = String(value).trim();
    if (str.length > 0) return str;
  }
  return null;
}

function findProductArray(root: unknown): Record<string, unknown>[] {
  if (!root || typeof root !== "object") return [];
  const candidates: string[][] = [
    ["products", "product"],
    ["rss", "channel", "item"],
    ["channel", "item"],
    ["items", "item"],
    ["SHOP", "SHOPITEM"],
    ["shop", "shopitem"],
    ["yml_catalog", "shop", "offers", "offer"],
  ];

  for (const path of candidates) {
    let node: unknown = root;
    for (const segment of path) {
      if (!node || typeof node !== "object") {
        node = undefined;
        break;
      }
      node = (node as Record<string, unknown>)[segment];
    }
    if (node) return Array.isArray(node) ? (node as Record<string, unknown>[]) : [node as Record<string, unknown>];
  }

  return [];
}

function parseXmlFeed(xml: string): RawFeedProduct[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    removeNSPrefix: true,
    trimValues: true,
  });

  const parsed = parser.parse(xml);
  const items = findProductArray(parsed);

  return items.map((rawItem) => {
    const item = normalizeXmlKeys(rawItem);
    const affiliateUrl = pickXml(item, XML_FIELD_CANDIDATES.affiliateUrl);
    return {
      externalId: pickXml(item, XML_ID_CANDIDATES) ?? extractUniqueFromUrl(affiliateUrl),
      name: pickXml(item, XML_FIELD_CANDIDATES.name) ?? "Produs fără nume",
      description: decodeHtmlEntities(pickXml(item, XML_FIELD_CANDIDATES.description)),
      price: toNumber(pickXml(item, XML_FIELD_CANDIDATES.price)),
      oldPrice: toNumber(pickXml(item, XML_FIELD_CANDIDATES.oldPrice)),
      currency: pickXml(item, XML_FIELD_CANDIDATES.currency),
      category: pickXml(item, XML_FIELD_CANDIDATES.category),
      brand: pickXml(item, XML_FIELD_CANDIDATES.brand),
      merchant: pickXml(item, XML_MERCHANT_CANDIDATES),
      imageUrl: firstImageUrl(pickXml(item, XML_FIELD_CANDIDATES.imageUrl)),
      affiliateUrl,
      availability: pickXml(item, XML_FIELD_CANDIDATES.availability),
      gtin: pickXml(item, XML_FIELD_CANDIDATES.gtin),
    };
  });
}

/** Detectează formatul (XML sau CSV) și parsează feed-ul într-o listă normalizată de produse. */
export function parse2performantFeed(rawText: string): RawFeedProduct[] {
  const trimmed = rawText.trimStart();
  if (trimmed.startsWith("<")) return parseXmlFeed(rawText);
  return parseCsvFeed(rawText);
}
