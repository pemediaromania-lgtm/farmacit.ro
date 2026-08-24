import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #f0fdf4 0%, #ffffff 60%)",
        }}
      >
        <svg width="180" height="180" viewBox="0 0 32 32" style={{ marginBottom: 32 }}>
          <defs>
            <linearGradient id="leaf" x1="6" y1="26" x2="26" y2="6" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#16a34a" />
              <stop offset="1" stopColor="#4ade80" />
            </linearGradient>
          </defs>
          <path d="M26 6C14 6 6 14 6 26c12 0 20-8 20-20Z" fill="url(#leaf)" />
          <path
            d="M9 23C13 15 18 10 25 7"
            fill="none"
            stroke="#14532d"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
        <div
          style={{
            fontSize: 84,
            fontWeight: 700,
            color: "#14532d",
            letterSpacing: -2,
            display: "flex",
          }}
        >
          farmatic.ro
        </div>
        <div style={{ fontSize: 32, color: "#166534", marginTop: 16, display: "flex" }}>
          Sănătate și naturețe, pe înțelesul tuturor
        </div>
      </div>
    ),
    { ...size }
  );
}
