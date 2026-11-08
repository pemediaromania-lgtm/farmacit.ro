-- Toate pozele produsului din feed (prima = imageUrl), pentru galeria de pe pagina produsului.
-- IF NOT EXISTS: coloana poate fi creată deja la pornirea serverului (src/lib/db/ensureSchema.ts).
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "images" TEXT[] DEFAULT ARRAY[]::TEXT[];
