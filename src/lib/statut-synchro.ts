"use client";

import { useSyncExternalStore, useEffect, useRef } from "react";
import { useToast } from "@/components/toast";

export type StatutSynchro = "synchronise" | "en-cours" | "hors-ligne" | "en-attente";

export interface EtatSynchro {
  statut: StatutSynchro;
  derniereSynchro: string | null;
  elementsEnAttente: number;
}

const CLE_STATUT_SYNCHRO = "forge:statut-synchro";

const defaut: EtatSynchro = {
  statut: "synchronise",
  derniereSynchro: null,
  elementsEnAttente: 0,
};

function lireEtat(): EtatSynchro {
  if (typeof window === "undefined") return defaut;
  try {
    const s = localStorage.getItem(CLE_STATUT_SYNCHRO);
    const parsing = s ? JSON.parse(s) : {};
    const file = JSON.parse(localStorage.getItem("forge:file-attente") ?? "[]");
    return {
      statut: parsing.statut ?? "synchronise",
      derniereSynchro: parsing.derniereSynchro ?? localStorage.getItem("forge:derniere-synchro") ?? null,
      elementsEnAttente: Array.isArray(file) ? file.length : 0,
    };
  } catch {
    return defaut;
  }
}

export function ecrireEtat(maj: Partial<EtatSynchro>): void {
  if (typeof window === "undefined") return;
  const actuel = {
    statut: "synchronise" as StatutSynchro,
    derniereSynchro: localStorage.getItem("forge:derniere-synchro"),
    elementsEnAttente: 0,
  };
  try {
    const s = localStorage.getItem(CLE_STATUT_SYNCHRO);
    if (s) {
      const parsed = JSON.parse(s);
      actuel.statut = parsed.statut ?? actuel.statut;
    }
  } catch {}

  const file = JSON.parse(localStorage.getItem("forge:file-attente") ?? "[]");
  actuel.elementsEnAttente = Array.isArray(file) ? file.length : 0;

  const suivant = { ...actuel, ...maj };
  localStorage.setItem(CLE_STATUT_SYNCHRO, JSON.stringify(suivant));
  window.dispatchEvent(new CustomEvent("forge:maj-statut"));
}

const abonnes = new Set<() => void>();

function souscrire(callback: () => void) {
  abonnes.add(callback);
  if (abonnes.size === 1 && typeof window !== "undefined") {
    window.addEventListener("forge:maj-statut", notifierTous);
    window.addEventListener("forge:maj-statut-synchro", notifierTous);
  }
  return () => {
    abonnes.delete(callback);
    if (abonnes.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("forge:maj-statut", notifierTous);
      window.removeEventListener("forge:maj-statut-synchro", notifierTous);
    }
  };
}

function notifierTous() {
  abonnes.forEach((cb) => cb());
}

export function useStatutSynchro(): EtatSynchro {
  return useSyncExternalStore(souscrire, lireEtat, () => defaut);
}

export function useSynchronisationNotifier() {
  const { toast } = useToast();
  const { statut, elementsEnAttente } = useStatutSynchro();
  const dernierStatut = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (statut === dernierStatut.current) return;

    if (statut === "synchronise") {
      toast("☁️ Synchronisé", "succes");
    } else if (statut === "en-cours") {
      toast("🔄 Synchronisation en cours…", "info");
    } else if (statut === "hors-ligne") {
      toast("📴 Hors ligne — données enregistrées sur cet appareil", "erreur");
    } else if (statut === "en-attente") {
      if (elementsEnAttente > 0) {
        toast(`🔄 Synchronisation en attente (${elementsEnAttente} éléments)`, "info");
      }
    }

    dernierStatut.current = statut;
  }, [statut, elementsEnAttente, toast]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleConflit = () => {
      toast("⚠️ Données mises à jour depuis un autre appareil", "erreur");
    };

    const handlePromotion = (ev: Event) => {
      const n = (ev as CustomEvent).detail as number;
      toast(`Fusion effectuée : ${n} éléments mis à jour`, "succes");
    };

    window.addEventListener("forge:synchro-conflit", handleConflit);
    window.addEventListener("forge:synchro-promotion", handlePromotion as EventListener);

    return () => {
      window.removeEventListener("forge:synchro-conflit", handleConflit);
      window.removeEventListener("forge:synchro-promotion", handlePromotion as EventListener);
    };
  }, [toast]);
}
