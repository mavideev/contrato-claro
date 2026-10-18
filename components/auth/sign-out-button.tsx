"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="ghost"
      className="self-start"
      onClick={async () => {
        await authClient.signOut();
        router.push("/ingresar");
      }}
    >
      Cerrar sesión
    </Button>
  );
}
