import Script from "next/script";

/**
 * Google Analytics 4 — nu randează nimic dacă NEXT_PUBLIC_GA_MEASUREMENT_ID nu e setat,
 * ca să nu trebuiască nicio schimbare de cod când adaugi ID-ul (doar variabila de mediu).
 */
export function Analytics() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!measurementId) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}');
        `}
      </Script>
    </>
  );
}
