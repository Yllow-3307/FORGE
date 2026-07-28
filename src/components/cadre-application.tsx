"use client";

/**
 * Cadre commun des pages de l'application.
 *
 * La connexion est volontairement isolée de la navigation : elle garde une
 * vraie sensation de point d'entrée, sans empêcher les autres routes de
 * continuer à fonctionner en mode invité.
 */

import { usePathname } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { GestionPWA } from "@/components/pwa";
import { useSynchronisationNotifier } from "@/lib/statut-synchro";

export function CadreApplication({ children }: { children: React.ReactNode }) {
  const chemin = usePathname();
  useSynchronisationNotifier();

  if (chemin === "/connexion") {
    return <main className="min-h-[100dvh] w-full">{children}</main>;
  }

  return (
    <>
      <Navigation />
      {/* pb-28 : dégage la barre de navigation mobile fixée en bas.
          Les marges « safe-area » évitent l'encoche et la barre gestuelle
          sur iPhone en mode installé. */}
      <main
        className="mx-auto w-full max-w-6xl px-3 pb-24 pt-3 sm:px-6 sm:pt-6 md:pb-16"
        style={{
          paddingLeft: "max(0.75rem, env(safe-area-inset-left))",
          paddingRight: "max(0.75rem, env(safe-area-inset-right))",
        }}
      >
        {children}
      </main>
      <GestionPWA />
    </>
  );
}
