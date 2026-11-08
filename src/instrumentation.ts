// Rulează o dată la pornirea serverului, înainte să primească vizitatori (vezi docs Next.js: instrumentation).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureSchema } = await import("@/lib/db/ensureSchema");
    await ensureSchema();
  }
}
