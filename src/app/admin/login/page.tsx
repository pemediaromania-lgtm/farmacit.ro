"use client";

import { useState } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", { email, password, redirect: false });

    if (result?.error) {
      setError("Email sau parolă greșită.");
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-50 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl bg-white border border-brand-100 shadow-sm p-8">
        <div className="text-center mb-6">
          <Image src="/logo.png" alt="Farmatic.ro" width={992} height={240} className="h-9 w-auto mx-auto" />
          <h1 className="mt-3 text-xl font-bold text-brand-900">Admin Farmatic.ro</h1>
        </div>

        <label className="block text-sm font-medium text-brand-900 mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-brand-200 px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-brand-400"
        />

        <label className="block text-sm font-medium text-brand-900 mb-1">Parolă</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-brand-200 px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-brand-400"
        />

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-brand-600 text-white font-medium py-2.5 hover:bg-brand-700 transition-colors disabled:opacity-60"
        >
          {loading ? "Se conectează..." : "Autentificare"}
        </button>
      </form>
    </div>
  );
}
