import Link from "next/link";
import {
  DEFAULT_SORT,
  FILTER_LABELS,
  PRICE_PRESETS,
  SORT_OPTIONS,
  formatPrice,
  presetLabel,
  productsHref,
  type FacetOption,
  type ProductFacets,
  type ProductFilters,
} from "@/lib/productFilters";
import { FilterFormEnhancer } from "./FilterFormEnhancer";

export const FILTER_FORM_ID = "filtre-produse";

/** Câte opțiuni (cele mai frecvente) apar direct; restul, în ordine alfabetică, sub „Arată toate”. */
const VISIBLE_OPTIONS = 8;

function sameValue(a: string, b: string) {
  return a.toLocaleLowerCase("ro") === b.toLocaleLowerCase("ro");
}

function CheckboxOption({ name, option, checked }: { name: string; option: FacetOption; checked: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 py-1 text-sm text-brand-900 hover:text-brand-700">
      <input
        type="checkbox"
        name={name}
        value={option.value}
        defaultChecked={checked}
        className="h-4 w-4 shrink-0 rounded border-brand-300 accent-brand-600"
      />
      <span className="min-w-0 flex-1 truncate">{option.value}</span>
      <span className="text-xs text-brand-800/50">{option.count.toLocaleString("ro-RO")}</span>
    </label>
  );
}

function FacetSection({
  title,
  name,
  options,
  selected,
}: {
  title: string;
  name: string;
  options: FacetOption[];
  selected: string[];
}) {
  // Valorile bifate rămân mereu vizibile, chiar dacă nu sunt printre cele mai frecvente.
  const isSelected = (o: FacetOption) => selected.some((s) => sameValue(s, o.value));
  const top = options.slice(0, VISIBLE_OPTIONS);
  const rest = options.slice(VISIBLE_OPTIONS);
  const visible = [...top, ...rest.filter(isSelected)];
  const hidden = rest.filter((o) => !isSelected(o)).sort((a, b) => a.value.localeCompare(b.value, "ro"));
  // Un brand bifat dintr-un link vechi poate să nu mai aibă produse în lista curentă — îl arătăm ca să poată fi debifat.
  const orphans = selected.filter((s) => !options.some((o) => sameValue(s, o.value))).map((value) => ({ value, count: 0 }));

  return (
    <fieldset className="border-t border-brand-100 pt-4">
      <legend className="float-left mb-2 w-full text-sm font-semibold text-brand-900">{title}</legend>
      <div className="clear-left">
        {[...orphans, ...visible].map((option) => (
          <CheckboxOption key={option.value} name={name} option={option} checked={orphans.includes(option) || isSelected(option)} />
        ))}
      </div>
      {hidden.length > 0 && (
        <details className="mt-1">
          <summary className="cursor-pointer text-sm font-medium text-brand-600 hover:text-brand-700">
            Arată toate ({options.length})
          </summary>
          <div className="mt-2 max-h-64 overflow-y-auto pr-1">
            {hidden.map((option) => (
              <CheckboxOption key={option.value} name={name} option={option} checked={false} />
            ))}
          </div>
        </details>
      )}
    </fieldset>
  );
}

export function activeFilterCount(f: ProductFilters): number {
  return (f.pretMin != null || f.pretMax != null ? 1 : 0) + f.branduri.length + f.magazine.length + (f.reducere ? 1 : 0);
}

/** Panoul de filtre: pe desktop coloană laterală, pe mobil ascuns după butonul „Filtre”. */
export function ProductFiltersPanel({ filters, facets }: { filters: ProductFilters; facets: ProductFacets }) {
  const active = activeFilterCount(filters);
  const scope = { grup: filters.grup, categorie: filters.categorie, q: filters.q };
  const showBrands = facets.brands.length >= 2 || filters.branduri.length > 0;
  const showMerchants = facets.merchants.length >= 2 || filters.magazine.length > 0;
  const showDiscount = facets.discountCount > 0 || filters.reducere;
  const showPrice = facets.priceMin != null && facets.priceMax != null && facets.priceMax > facets.priceMin;

  return (
    <aside className="mb-6 lg:mb-0">
      <input type="checkbox" id="filtre-deschise" className="peer sr-only" />
      <label
        htmlFor="filtre-deschise"
        className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-brand-200 px-4 py-2 text-sm font-medium text-brand-800 hover:bg-brand-50 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400 lg:hidden"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden>
          <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
        </svg>
        Filtre{active > 0 ? ` (${active})` : ""}
      </label>

      {/* `key` după URL: după fiecare navigare formularul se remontează, ca bifele să urmeze
          filtrele reale (căsuțele necontrolate nu-și resetează starea la un nou defaultChecked). */}
      <form
        key={productsHref(filters)}
        id={FILTER_FORM_ID}
        action="/produse"
        method="get"
        className="mt-4 hidden space-y-4 rounded-2xl border border-brand-100 bg-white p-4 peer-checked:block lg:mt-0 lg:block"
      >
        {filters.grup && <input type="hidden" name="grup" value={filters.grup} />}
        {filters.categorie && <input type="hidden" name="categorie" value={filters.categorie} />}
        {filters.q && <input type="hidden" name="q" value={filters.q} />}

        <p className="text-base font-bold text-brand-900">Filtre</p>

        {showPrice && (
          <fieldset className="border-t border-brand-100 pt-4">
            <legend className="float-left mb-2 w-full text-sm font-semibold text-brand-900">Preț (lei)</legend>
            <div className="clear-left flex items-center gap-2">
              <input
                type="number"
                name="pret_min"
                min={0}
                step="any"
                inputMode="decimal"
                aria-label="Preț minim"
                placeholder={`min ${Math.floor(facets.priceMin!)}`}
                defaultValue={filters.pretMin}
                className="w-full min-w-0 rounded-lg border border-brand-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              <span className="text-brand-800/50">–</span>
              <input
                type="number"
                name="pret_max"
                min={0}
                step="any"
                inputMode="decimal"
                aria-label="Preț maxim"
                placeholder={`max ${Math.ceil(facets.priceMax!)}`}
                defaultValue={filters.pretMax}
                className="w-full min-w-0 rounded-lg border border-brand-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {PRICE_PRESETS.map((preset) => {
                const current = filters.pretMin === preset.min && filters.pretMax === preset.max;
                return (
                  <Link
                    key={presetLabel(preset)}
                    href={productsHref({ ...filters, pretMin: preset.min, pretMax: preset.max, page: 1 })}
                    prefetch={false}
                    rel="nofollow"
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                      current ? "border-brand-600 bg-brand-600 text-white" : "border-brand-200 text-brand-700 hover:bg-brand-50"
                    }`}
                  >
                    {presetLabel(preset)}
                  </Link>
                );
              })}
            </div>
          </fieldset>
        )}

        {showDiscount && (
          <fieldset className="border-t border-brand-100 pt-4">
            <legend className="sr-only">Reduceri</legend>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-brand-900">
              <input type="checkbox" name="reducere" value="1" defaultChecked={filters.reducere} className="h-4 w-4 accent-brand-600" />
              <span className="flex-1">Doar produse la reducere</span>
              <span className="text-xs font-normal text-brand-800/50">{facets.discountCount.toLocaleString("ro-RO")}</span>
            </label>
          </fieldset>
        )}

        {showBrands && <FacetSection title={FILTER_LABELS.brand} name="brand" options={facets.brands} selected={filters.branduri} />}

        {showMerchants && (
          <FacetSection title={FILTER_LABELS.merchant} name="magazin" options={facets.merchants} selected={filters.magazine} />
        )}

        <div className="flex items-center gap-3 border-t border-brand-100 pt-4">
          <button
            type="submit"
            className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Aplică filtrele
          </button>
          {active > 0 && (
            <Link
              href={productsHref({ ...scope, sortare: filters.sortare })}
              prefetch={false}
              className="text-sm font-medium text-brand-700 hover:underline"
            >
              Resetează
            </Link>
          )}
        </div>
      </form>

      <FilterFormEnhancer formId={FILTER_FORM_ID} defaultSort={DEFAULT_SORT} />
    </aside>
  );
}

/** Sortarea stă deasupra listei, dar face parte din formularul de filtre (atributul `form`). */
export function ProductSortSelect({ sortare }: { sortare: string }) {
  return (
    <label className="flex items-center gap-2 text-sm text-brand-800/70">
      <span className="hidden sm:inline">Sortează:</span>
      <select
        key={sortare}
        name="sortare"
        form={FILTER_FORM_ID}
        defaultValue={sortare}
        aria-label="Sortează produsele"
        className="rounded-full border border-brand-200 bg-white px-3 py-1.5 text-sm font-medium text-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-400"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Pastilele cu filtrele active; fiecare scoate doar filtrul ei. */
export function ActiveFilterChips({ filters }: { filters: ProductFilters }) {
  const base = { ...filters, page: 1 };
  const chips: { label: string; href: string }[] = [];
  if (filters.pretMin != null || filters.pretMax != null) {
    chips.push({
      label:
        filters.pretMin != null && filters.pretMax != null
          ? `${formatPrice(filters.pretMin)}–${formatPrice(filters.pretMax)} lei`
          : filters.pretMin != null
            ? `Peste ${formatPrice(filters.pretMin)} lei`
            : `Sub ${formatPrice(filters.pretMax!)} lei`,
      href: productsHref({ ...base, pretMin: undefined, pretMax: undefined }),
    });
  }
  if (filters.reducere) chips.push({ label: "La reducere", href: productsHref({ ...base, reducere: false }) });
  for (const b of filters.branduri) {
    chips.push({ label: b, href: productsHref({ ...base, branduri: filters.branduri.filter((x) => x !== b) }) });
  }
  for (const m of filters.magazine) {
    chips.push({ label: m, href: productsHref({ ...base, magazine: filters.magazine.filter((x) => x !== m) }) });
  }
  if (chips.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Link
          key={chip.label}
          href={chip.href}
          prefetch={false}
          rel="nofollow"
          aria-label={`Scoate filtrul ${chip.label}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-800 hover:bg-brand-200"
        >
          {chip.label}
          <span aria-hidden className="text-brand-600">
            ×
          </span>
        </Link>
      ))}
      {chips.length > 1 && (
        <Link
          href={productsHref({ grup: filters.grup, categorie: filters.categorie, q: filters.q, sortare: filters.sortare })}
          prefetch={false}
          rel="nofollow"
          className="text-xs font-medium text-brand-700 hover:underline"
        >
          Șterge toate
        </Link>
      )}
    </div>
  );
}
