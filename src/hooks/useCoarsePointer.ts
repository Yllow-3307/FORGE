"use client";

import { useSyncExternalStore } from "react";

/**
 * Détecte si le périphérique d'entrée principal est tactile (pointer: coarse).
 *
 * Utilise `useSyncExternalStore` pour réagir aux changements (ex. passage
 * souris → écran tactile sur un hybride) sans listener manuel.
 */

const mq =
  typeof window !== "undefined"
    ? window.matchMedia("(pointer: coarse)")
    : null;

function subscribe(callback: () => void): () => void {
  mq?.addEventListener("change", callback);
  return () => mq?.removeEventListener("change", callback);
}

function getSnapshot(): boolean {
  return mq?.matches ?? false;
}

/** `true` quand le pointeur principal est grossier (écran tactile). */
export function useCoarsePointer(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/**
 * Renvoie les props d'animation « survol carte » si l'appareil n'est pas
 * tactile, sinon un objet vide (pas de déplacement au survol).
 */
export function useSurvolCarte() {
  const coarse = useCoarsePointer();
  return coarse
    ? {}
    : {
        whileHover: { y: -2 },
        transition: { type: "spring" as const, stiffness: 400, damping: 30 },
      };
}
