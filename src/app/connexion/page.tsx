"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BlocAuthentification } from "@/components/authentification";
import { Carte } from "@/components/ui";
import { useAuth } from "@/lib/auth";

/** Point d'entrée de compte, volontairement séparé de l'application métier. */
export default function PageConnexion() {
  const router = useRouter();
  const { statutConnexion } = useAuth();
  const [connexionDemarreeIci, setConnexionDemarreeIci] = useState(false);

  useEffect(() => {
    // Une personne qui arrive déjà connectée n'a rien à faire ici. Une session
    // lancée par le formulaire garde, elle, le temps de jouer son fondu.
    if (statutConnexion === "connecte" && !connexionDemarreeIci) {
      router.replace("/");
    }
  }, [connexionDemarreeIci, router, statutConnexion]);

  if (
    statutConnexion === "inconnu"
    || (statutConnexion === "connecte" && !connexionDemarreeIci)
  ) {
    return (
      <section className="flex min-h-[100dvh] items-center justify-center px-4" aria-live="polite">
        <Carte fort className="w-full max-w-[26.25rem] p-6 text-center">
          <p className="text-sm text-muted">Vérification de ta session…</p>
        </Carte>
      </section>
    );
  }

  return <BlocAuthentification onConnexionDemarree={() => setConnexionDemarreeIci(true)} />;
}
