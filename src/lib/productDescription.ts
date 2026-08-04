import sanitizeHtml from "sanitize-html";

// Multe feed-uri (ex: e-potion.ro, vedrashop.ro) trimit descrieri cu HTML real
// (<ul>, <li>, <strong> etc.), nu text simplu — se randează ca atare pentru SEO
// (structură semantică), nu ca text brut cu tag-uri vizibile.
const ALLOWED_TAGS = ["p", "ul", "ol", "li", "strong", "b", "em", "i", "br", "h2", "h3", "h4", "table", "thead", "tbody", "tr", "td", "th"];

export function descriptionHasHtml(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

/** Curăță descrierea de feed pentru afișare — păstrează doar structura semantică, fără atribute (href, style, onclick etc.). */
export function sanitizeProductDescription(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {},
    disallowedTagsMode: "discard",
  });
}

/** Text simplu, fără niciun tag — pentru <meta description> și JSON-LD, unde HTML brut ar strica rezultatul din Google. */
export function stripHtmlToText(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
}
