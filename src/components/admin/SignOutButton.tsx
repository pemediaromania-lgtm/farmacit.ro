"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/admin/login" })}
      className="text-sm text-brand-700 hover:text-brand-900 font-medium"
    >
      Deconectare
    </button>
  );
}
