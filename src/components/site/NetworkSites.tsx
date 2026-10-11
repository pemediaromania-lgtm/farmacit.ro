import Image from "next/image";

/**
 * Rețeaua TIC în footer: site-urile de familie se leagă între ele cu logo-ul și numele brandului
 * (fără ancore cu cuvinte-cheie, ca să nu arate a schemă de linkuri). Aceeași componentă există în
 * farmatic, libratic și jucatic — o schimbare aici se face în toate trei.
 *
 * intimatic.ro (produse pentru adulți) rămâne intenționat în afara rețelei: nu apare pe site-urile
 * de familie, mai ales pe jucatic.ro (jucării pentru copii), și nici nu trimite spre ele.
 */
const NETWORK = [
  { key: "farmatic", name: "Farmatic.ro", url: "https://www.farmatic.ro", about: "sănătate și natură", width: 459, className: "h-8" },
  { key: "libratic", name: "Libratic.ro", url: "https://www.libratic.ro", about: "cărți", width: 530, className: "h-8" },
  { key: "jucatic", name: "jucatic.ro", url: "https://jucatic.ro", about: "jucării pentru copii", width: 155, className: "h-12" },
] as const;

export type NetworkSiteKey = (typeof NETWORK)[number]["key"];

export function NetworkSites({ current }: { current: NetworkSiteKey }) {
  return (
    <div className="border-t border-brand-100 pt-4">
      <p className="text-xs font-medium uppercase tracking-wide text-brand-700/80 text-center sm:text-left">
        Din aceeași familie
      </p>
      <ul className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-x-8 gap-y-3">
        {NETWORK.filter((site) => site.key !== current).map((site) => (
          <li key={site.key}>
            <a
              href={site.url}
              target="_blank"
              rel="noopener"
              title={`${site.name} — ${site.about}`}
              className="block opacity-90 transition-opacity hover:opacity-100"
            >
              <Image
                src={`/retea/${site.key}.png`}
                alt={`${site.name} — ${site.about}`}
                width={site.width}
                height={96}
                sizes="200px"
                className={`${site.className} w-auto`}
              />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
