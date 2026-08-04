# Farmatic.ro

Blog + magazin afiliat (2Performant) despre produse farmaceutice și naturiste. Importă produse
dintr-un feed XML sau CSV, generează automat articole (text cu Claude, imagine de copertă cu
DALL·E 3) și oferă un panou de admin care contorizează toată activitatea din site.

Testat cu feed-ul real 2Performant/Springfarma (14.230 produse, format CSV) — vezi notele din
secțiunea „Cum funcționează" de mai jos.

## Stack

Next.js 16 (App Router, TypeScript) · Prisma · NextAuth (Auth.js) v5 · Tailwind CSS v4 ·
Anthropic SDK (Claude) · OpenAI SDK (DALL·E 3) · fast-xml-parser + papaparse.

## Pornire locală

```bash
npm install
cp .env.example .env   # completează cheile (vezi mai jos)
npx prisma migrate dev
npm run db:seed        # creează primul admin, din SEED_ADMIN_EMAIL/PASSWORD din .env
npm run dev
```

Deschide [http://localhost:3000](http://localhost:3000) pentru site și
[http://localhost:3000/admin](http://localhost:3000/admin) pentru admin (login cu contul creat de seed).

### Variabile de mediu (`.env`)

| Variabilă | Descriere |
|---|---|
| `DATABASE_URL` | Implicit SQLite local (`file:./dev.db`), zero setup. Pentru producție vezi secțiunea Deploy. |
| `NEXTAUTH_SECRET` | Secret pentru sesiuni admin — generează cu `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. |
| `NEXTAUTH_URL` | URL-ul complet al site-ului (`http://localhost:3000` local). |
| `ANTHROPIC_API_KEY` | Cheia Claude — folosită pentru generarea textului articolelor. |
| `OPENAI_API_KEY` | Cheia OpenAI — folosită pentru generarea imaginilor de copertă (DALL·E 3). |
| `CRON_SECRET` | Secret pentru endpoint-ul de sincronizare periodică a feed-urilor. |
| `SEED_ADMIN_EMAIL/PASSWORD/NAME` | Contul primului admin, folosit doar de `npm run db:seed`. |

**Niciodată nu pune cheile reale în cod sau în commituri** — `.env` este ignorat de git.

## Cum funcționează

1. **Feed-uri** (`/admin/feeds`): adaugi un feed cu nume + URL public (XML sau CSV — formatul e
   detectat automat). La sincronizare (manual din admin sau automat prin cron), produsele sunt
   importate/actualizate în loturi (`src/lib/feed/importFeed.ts`), nu unul câte unul — un feed cu
   14.000+ produse se importă în sub o secundă. Parser-ul tolerant e în
   `src/lib/feed/parse2performant.ts`.
2. **Generare automată de articole**: importul unui feed NU generează articole — doar produse.
   Generarea (Claude pentru text, DALL·E 3 pentru imaginea de copertă, salvată în
   `public/uploads/articles`) se face separat, treptat, plafonată la **3 articole/săptămână în
   total**, indiferent câte produse noi vin dintr-un import (`generateWeeklyArticles`, apelată la
   fiecare rulare de cron — dacă plafonul e deja atins în ultimele 7 zile, cron-ul nu mai generează
   nimic până trec cele 7 zile). Cele mai vechi produse fără articol sunt luate primele. Din
   `/admin/products` mai există și butonul „Generează 10 articole lipsă" pentru recuperare manuală
   pe loc (ocolește plafonul săptămânal), plus „Generează articol" per produs individual.
   Articolele sunt create ca **ciornă** — trebuie publicate manual din `/admin/articles`, pentru
   control uman asupra conținutului farma.
3. **Activitate** (`/admin/activity`): jurnal — feed-uri adăugate/sincronizate (cu numărul de
   produse create/actualizate), articole generate/publicate, click-uri pe linkuri de afiliere. La
   import în masă se loghează un singur eveniment de sumar per sincronizare, nu unul per produs
   (altfel jurnalul ar exploda la feed-uri cu zeci de mii de rânduri).
4. **Site public**: `/blog` (articole publicate), `/produse` (catalog, filtrabil pe categorie),
   `/go/[slug]` (redirect către link-ul de afiliere 2Performant, cu contorizare de click-uri).

Notă despre parser-ul de feed: 2Performant/partenerii pot folosi nume de câmpuri diferite. Feed-ul
CSV real testat (Springfarma) are coloanele `title,aff_code,price,campaign_name,image_urls,description`
— fără id explicit, deci id-ul stabil de produs se extrage din query-ul `unique=` al URL-ului din
`aff_code`. Parser-ul încearcă mai multe variante uzuale de nume de coloane/câmpuri (vezi
`CSV_FIELD_CANDIDATES` / `XML_FIELD_CANDIDATES` din `parse2performant.ts`); pentru un feed nou cu
alte nume, se adaugă ușor acolo.

**Imagini de produs blocate de partener**: unele magazine (ex. springfarma.com, în spatele
Cloudflare) trimit header-ul `Cross-Origin-Resource-Policy: same-origin` pe imaginile lor, care
blochează afișarea lor pe alt domeniu — inclusiv dintr-un proxy server-to-server, care e respins de
protecția anti-bot Cloudflare. Nu există o soluție simplă/etică pentru asta (ar necesita ocolirea
protecției anti-bot a partenerului). Componenta `src/components/site/ProductImage.tsx` detectează
eșecul de încărcare și arată automat un placeholder pe tema verde/alb, în loc de imagine spartă.

## Deploy pe Railway

1. Creează un proiect Railway, adaugă addon-ul **PostgreSQL**.
2. În `prisma/schema.prisma`, schimbă `provider = "sqlite"` în `provider = "postgresql"`.
3. Local, pune temporar `DATABASE_URL` din Railway în `.env` și rulează
   `npx prisma migrate dev --name init_postgres` (creează migrarea validă pentru Postgres, o
   singură dată).
4. Configurează în Railway variabilele de mediu: `DATABASE_URL` (Postgres-ul din Railway),
   `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (domeniul live), `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`,
   `CRON_SECRET`.
5. Adaugă un **Volume** Railway montat pe `public/uploads`, ca imaginile generate (coperți de
   articole) să persiste între deploy-uri.
6. Rulează `npm run db:seed` o dată (prin Railway shell/CLI) ca să creezi primul admin în producție.
7. Configurează un **Railway Cron Job** care face `POST` periodic (ex: la 6 ore) către
   `https://<domeniul-tau>/api/cron/sync-feeds` cu header `Authorization: Bearer <CRON_SECRET>`.

## Cron local (dev, înainte de deploy)

Cât timp proiectul rulează doar local (SQLite, fără server public de lovit cu `POST`),
sincronizarea periodică se face direct în baza de date, prin `scripts/syncAllFeeds.ts`
(aceeași logică ca endpoint-ul `/api/cron/sync-feeds`, dar apelată direct — nu are nevoie
de `npm run dev` pornit sau de `CRON_SECRET`).

E înregistrată ca task Windows Task Scheduler ("Farmatic.ro - Sync Feed-uri"), rulează
`scripts\sync-cron.bat` la fiecare 2 zile, cu `StartWhenAvailable` — dacă PC-ul e oprit la
ora programată, rulează la următoarea pornire. Loguri în `logs/cron-sync.log`.

- Rulare manuală: `npx tsx scripts/syncAllFeeds.ts`
- Verifică/editează task-ul: `taskschd.msc` → "Farmatic.ro - Sync Feed-uri"
- Șterge task-ul: `Unregister-ScheduledTask -TaskName "Farmatic.ro - Sync Feed-uri"` (PowerShell)

După deploy pe Railway, task-ul local ăsta devine redundant — folosește Railway Cron Job-ul
de mai sus în loc (sau pe lângă, dacă tot mai rulezi și local).

## Lucruri lăsate intenționat pentru mai târziu

- Coș de cumpărături + plată directă pe farmatic.ro pentru produse proprii (câmpul
  `Product.type` are deja valorile `affiliate` / `own` pregătite pentru asta, dar checkout-ul,
  facturarea și TVA nu sunt implementate — necesită alegerea unui procesator de plată).
- Migrare stocare imagini de la volume Railway la un serviciu S3-compatible (ex. Cloudflare R2),
  utilă dacă traficul/numărul de imagini crește mult.
