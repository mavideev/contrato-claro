"use client";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
      onClick={async () => {
        await authClient.signOut();
        router.push("/ingresar");
      }}
    >
      Cerrar sesión
    </button>
  );
}
