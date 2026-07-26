"use client";

/**
 * store.ts — Abonnement réactif au stockage local.
 *
 * `useSyncExternalStore` est la primitive prévue pour lire une source externe
 * pendant le rendu : elle évite le motif « useEffect + setState » qui déclenche
 * un rendu en cascade et un flash de contenu vide.
 *
 * Les instantanés sont mis en cache par clé : `getSnapshot` doit renvoyer une
 * référence stable tant que la donnée n'a pas changé, sinon React boucle.
 */

import { useSyncExternalStore } from "react";

const abonnes = new Set<() => void>();
const cache = new Map<string, { brut: string | null; valeur: unknown }>();

function souscrire(callback: () => void) {
  abonnes.add(callback);
  if (abonnes.size === 1 && typeof window !== "undefined") {
    window.addEventListener("forge:maj", notifierTous);
    window.addEventListener("storage", notifierTous);
  }
  return () => {
    abonnes.delete(callback);
    if (abonnes.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("forge:maj", notifierTous);
      window.removeEventListener("storage", notifierTous);
    }
  };
}

function notifierTous() {
  cache.clear();
  abonnes.forEach((cb) => cb());
}

/** Force la relecture et prévient tous les abonnés. */
export function invalider() {
  if (typeof window === "undefined") return;
  cache.clear();
  window.dispatchEvent(new CustomEvent("forge:maj"));
}

/**
 * Lit une valeur JSON du localStorage en s'y abonnant.
 * Le composant se met à jour automatiquement à chaque écriture.
 */
export function useStockageLocal<T>(cle: string, defaut: T): T {
  const snapshot = () => {
    const brut = typeof window === "undefined" ? null : localStorage.getItem(cle);
    const enCache = cache.get(cle);
    if (enCache && enCache.brut === brut) return enCache.valeur as T;

    let valeur: T = defaut;
    if (brut) {
      try {
        valeur = JSON.parse(brut) as T;
      } catch {
        valeur = defaut;
      }
    }
    cache.set(cle, { brut, valeur });
    return valeur;
  };

  return useSyncExternalStore(souscrire, snapshot, () => defaut);
}

/** Version « compteur » : sert à re-déclencher un calcul après écriture. */
export function useVersionStockage(): number {
  return useSyncExternalStore(
    souscrire,
    () => versionCourante,
    () => 0,
  );
}

let versionCourante = 0;
if (typeof window !== "undefined") {
  window.addEventListener("forge:maj", () => { versionCourante += 1; });
  window.addEventListener("storage", () => { versionCourante += 1; });
}
