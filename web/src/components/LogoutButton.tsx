"use client";

import { useRouter } from "next/navigation";
import { logout } from "@/actions/auth";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await logout();
        router.push("/login");
        router.refresh();
      }}
      className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50"
    >
      Salir
    </button>
  );
}
