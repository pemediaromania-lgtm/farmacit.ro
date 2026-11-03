import { isBlackFridayProduct, type BlackFridayProduct } from "@/lib/blackFriday";

const SIZES = {
  sm: "rounded px-1.5 py-0.5 text-[10px]",
  md: "rounded-md px-2 py-0.5 text-[11px]",
  lg: "rounded-lg px-3 py-1 text-sm",
};

/**
 * Sigla „Black Friday” pusă peste poza produselor din campaniile partenerilor (vezi lib/blackFriday).
 * Poziția o dă pagina prin `className` (pe carduri, reducerea ocupă deja colțul din stânga).
 */
export function BlackFridayBadge({
  product,
  size = "md",
  className = "",
}: {
  product: BlackFridayProduct;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  if (!isBlackFridayProduct(product)) return null;
  return (
    <span className={`z-10 bg-black font-extrabold uppercase tracking-wide text-white shadow ${SIZES[size]} ${className}`}>
      Black <span className="text-amber-400">Friday</span>
    </span>
  );
}
