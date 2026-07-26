"use client";

/**
 * minuteur.tsx — Compte à rebours circulaire pour le lecteur de séance.
 *
 * Un `setInterval` dérive sur de longues durées : on calcule donc le temps
 * restant à partir d'un horodatage de fin, ce qui reste juste même si
 * l'onglet est mis en veille par le navigateur.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

export interface UseMinuteur {
  restant: number;
  actif: boolean;
  termine: boolean;
  demarrer: () => void;
  pause: () => void;
  reinitialiser: (secondes?: number) => void;
  ajouter: (secondes: number) => void;
}

export function useMinuteur(dureeInitiale: number, onFin?: () => void): UseMinuteur {
  const [restant, setRestant] = useState(dureeInitiale);
  const [actif, setActif] = useState(false);
  // Quand la durée demandée change, on réinitialise pendant le rendu plutôt
  // que dans un effet : c'est le motif React recommandé pour dériver un état
  // d'une prop, et il évite un rendu intermédiaire avec l'ancienne valeur.
  const [dureeVue, setDureeVue] = useState(dureeInitiale);
  const finRef = useRef<number | null>(null);
  const onFinRef = useRef(onFin);

  if (dureeVue !== dureeInitiale) {
    setDureeVue(dureeInitiale);
    setRestant(dureeInitiale);
    setActif(false);
    // `finRef` n'est pas touché ici : une ref ne s'écrit pas pendant le rendu.
    // Le passage à `actif = false` arrête le tick, et `demarrer()` recalcule
    // l'horodatage de fin à partir du temps restant.
  }

  // L'écriture d'une ref appartient à un effet, jamais au corps du rendu.
  useEffect(() => {
    onFinRef.current = onFin;
  });

  useEffect(() => {
    if (!actif) return;

    // On vise un horodatage de fin plutôt que de décrémenter un compteur :
    // un `setInterval` dérive et se fige quand l'onglet passe en arrière-plan.
    const tick = () => {
      if (finRef.current === null) return;   // minuteur remis à zéro entre-temps
      const reste = Math.max(0, Math.ceil((finRef.current - Date.now()) / 1000));
      setRestant(reste);
      if (reste <= 0) {
        finRef.current = null;
        setActif(false);
        onFinRef.current?.();
      }
    };

    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [actif]);

  const demarrer = useCallback(() => {
    // La mise à jour fonctionnelle donne accès au temps restant réel, y
    // compris juste après une réinitialisation.
    setRestant((r) => {
      finRef.current = Date.now() + r * 1000;
      return r;
    });
    setActif(true);
  }, []);

  const pause = useCallback(() => {
    finRef.current = null;
    setActif(false);
  }, []);

  const reinitialiser = useCallback((secondes?: number) => {
    finRef.current = null;
    setActif(false);
    setRestant(secondes ?? dureeInitiale);
  }, [dureeInitiale]);

  const ajouter = useCallback((secondes: number) => {
    setRestant((r) => {
      const suivant = Math.max(0, r + secondes);
      if (finRef.current !== null) finRef.current = Date.now() + suivant * 1000;
      return suivant;
    });
  }, []);

  return { restant, actif, termine: restant === 0, demarrer, pause, reinitialiser, ajouter };
}

export function formatChrono(secondes: number): string {
  const m = Math.floor(secondes / 60);
  const s = secondes % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function CercleMinuteur({
  restant, total, taille = 260, couleur = "var(--accent)", libelle,
}: {
  restant: number; total: number; taille?: number; couleur?: string; libelle?: string;
}) {
  const epaisseur = 12;
  const r = (taille - epaisseur) / 2;
  const circonference = 2 * Math.PI * r;
  const progression = total > 0 ? restant / total : 0;

  return (
    <div className="relative grid place-items-center" style={{ width: taille, height: taille }}>
      <svg width={taille} height={taille} className="-rotate-90">
        <circle
          cx={taille / 2} cy={taille / 2} r={r} fill="none"
          stroke="var(--surface-2)" strokeWidth={epaisseur}
        />
        <circle
          cx={taille / 2} cy={taille / 2} r={r} fill="none"
          stroke={couleur} strokeWidth={epaisseur} strokeLinecap="round"
          strokeDasharray={circonference}
          strokeDashoffset={circonference * (1 - progression)}
          style={{ transition: "stroke-dashoffset 0.3s linear" }}
        />
      </svg>
      <div className="absolute text-center">
        <motion.p
          key={restant}
          initial={{ scale: restant <= 3 && restant > 0 ? 1.15 : 1 }}
          animate={{ scale: 1 }}
          className="text-5xl font-bold tnum tabular-nums"
        >
          {formatChrono(restant)}
        </motion.p>
        {libelle && <p className="mt-1 text-sm text-muted">{libelle}</p>}
      </div>
    </div>
  );
}
