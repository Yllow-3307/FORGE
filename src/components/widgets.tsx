"use client";

/**
 * widgets.tsx — Tuiles du tableau de bord.
 *
 * Trois formats, calqués sur une grille de 4 colonnes (2 sur mobile) :
 *   - petit      : 1 colonne, carré
 *   - grand      : 2 colonnes, carré
 *   - rectangle  : toute la largeur, hauteur réduite
 *
 * Chaque widget se suffit à lui-même : il lit l'état via `useApp` et reste
 * lisible même sans données.
 */

import Link from "next/link";
import { motion } from "framer-motion";
import { Carte, GrandChiffre, cx } from "./ui";
import { Bouteille } from "./bouteille";
import { useApp } from "@/lib/useApp";
import { libelleSeance } from "@/lib/useApp";
import { ajouterEau, type JournalJour, type TailleWidget, type TypeWidget } from "@/lib/suivi";
import { listerPoids, type MesurePoids } from "@/lib/stockage";
import { useStockageLocal } from "@/lib/store";
import { useEffect, useState } from "react";

/**
 * Formats de la grille (4 colonnes sur écran large, 2 sur mobile).
 * Les hauteurs sont fixées en rangées plutôt qu'en `aspect-square` : sur deux
 * colonnes, un carré deviendrait démesurément haut et laisserait un grand vide.
 */
export const CLASSES_TAILLE: Record<TailleWidget, string> = {
  petit: "col-span-1 row-span-1",
  grand: "col-span-2 row-span-1",
  rectangle: "col-span-2 sm:col-span-4 row-span-1",
};

export const CATALOGUE_WIDGETS: {
  type: TypeWidget; nom: string; emoji: string; tailles: TailleWidget[];
}[] = [
  { type: "lancer_seance", nom: "Lance ta séance", emoji: "🔥", tailles: ["rectangle", "grand"] },
  { type: "hydratation", nom: "Hydratation", emoji: "💧", tailles: ["petit", "grand", "rectangle"] },
  { type: "macros", nom: "Suivi macros", emoji: "🥗", tailles: ["grand", "rectangle"] },
  { type: "reussites", nom: "Réussites", emoji: "🏆", tailles: ["petit", "grand"] },
  { type: "poids", nom: "Évolution poids", emoji: "⚖️", tailles: ["grand", "rectangle"] },
  { type: "progression", nom: "Progression programme", emoji: "📊", tailles: ["rectangle", "grand"] },
];

/* ---------------------------------------------------------------- Anneau */

function Anneau({
  pourcentage, taille = 84, epaisseur = 8, couleur = "var(--accent)", children,
}: {
  pourcentage: number; taille?: number; epaisseur?: number;
  couleur?: string; children?: React.ReactNode;
}) {
  const r = (taille - epaisseur) / 2;
  const circonference = 2 * Math.PI * r;
  const rempli = Math.min(100, Math.max(0, pourcentage));

  return (
    <div className="relative grid place-items-center" style={{ width: taille, height: taille }}>
      <svg width={taille} height={taille} className="-rotate-90">
        <circle
          cx={taille / 2} cy={taille / 2} r={r} fill="none"
          stroke="var(--surface-2)" strokeWidth={epaisseur}
        />
        <motion.circle
          cx={taille / 2} cy={taille / 2} r={r} fill="none"
          stroke={couleur} strokeWidth={epaisseur} strokeLinecap="round"
          strokeDasharray={circonference}
          initial={{ strokeDashoffset: circonference }}
          animate={{ strokeDashoffset: circonference * (1 - rempli / 100) }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute grid place-items-center text-center">{children}</div>
    </div>
  );
}

/* ---------------------------------------------------------- Lancer séance */

function WidgetLancerSeance({ taille }: { taille: TailleWidget }) {
  const { seancesDuJour, serie } = useApp();
  const repos = seancesDuJour.length === 0;
  const duree = seancesDuJour.reduce((a, s) => a + s.dureeMin, 0);

  return (
    <Link href={repos ? "/programme" : "/seance"} className="block h-full">
      <Carte
        whileHover={{ y: -3 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className={cx(
          "flex h-full items-center gap-4 p-5",
          taille === "grand" && "flex-col items-start justify-between",
        )}
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-2xl">
          {repos ? "🌙" : "🔥"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="etiquette">
            {repos ? "Aujourd'hui" : "Séance du jour"}
          </p>
          <p className="font-bold leading-tight text-balance">{libelleSeance(seancesDuJour)}</p>
          {!repos && (
            <p className="mt-0.5 text-xs text-muted">
              {duree} min · {serie > 0 ? `série de ${serie}` : "on démarre"}
            </p>
          )}
          {repos && <p className="mt-0.5 text-xs text-muted">Récupération programmée</p>}
        </div>
        {!repos && (
          <span className="shrink-0 rounded-pill bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)]">
            Lancer
          </span>
        )}
      </Carte>
    </Link>
  );
}

/* ------------------------------------------------------------ Hydratation */

function WidgetHydratation({ taille }: { taille: TailleWidget }) {
  const { jour, cibleHydratation, scores, rafraichir } = useApp();
  const litres = (jour.hydratationMl / 1000).toFixed(1);
  const cible = (cibleHydratation / 1000).toFixed(1);

  const boire = (ml: number) => {
    ajouterEau(jour.date, ml);
    rafraichir();
  };

  if (taille === "petit") {
    return (
      <Carte className="flex h-full flex-col items-center justify-center gap-1.5 p-3">
        <Bouteille pourcentage={scores.hydratation} hauteur={78} afficherValeur={false} />
        <p className="chiffre text-base leading-none">{litres} L</p>
        <button
          onClick={() => boire(250)}
          className="rounded-pill bg-[var(--surface-2)] px-2.5 py-1 text-[0.62rem] font-medium transition hover:bg-[var(--accent-soft)]"
        >
          +25 cl
        </button>
      </Carte>
    );
  }

  return (
    <Carte className="flex h-full items-center gap-4 p-5">
      <Bouteille
        pourcentage={scores.hydratation}
        hauteur={taille === "grand" ? 118 : 96}
        afficherValeur={false}
      />
      <div className="min-w-0 flex-1">
        <p className="etiquette">Hydratation</p>
        <p className="mt-1 chiffre text-3xl leading-none">
          {litres}
          <span className="ml-1 text-[0.34em] font-normal uppercase tracking-widest text-muted">
            / {cible} L
          </span>
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[250, 500, 750].map((ml) => (
            <button
              key={ml}
              onClick={() => boire(ml)}
              className="rounded-pill bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
            >
              +{ml / 10} cl
            </button>
          ))}
        </div>
      </div>
    </Carte>
  );
}

/* ----------------------------------------------------------------- Macros */

function WidgetMacros() {
  const { programme, totaux, scores } = useApp();
  if (!programme) return null;

  const n = programme.nutrition;
  const lignes = [
    { nom: "Protéines", val: Math.round(totaux.proteines), cible: n.proteinesG, couleur: "var(--accent)" },
    { nom: "Glucides", val: Math.round(totaux.glucides), cible: n.glucidesG, couleur: "#7fb3c8" },
    { nom: "Lipides", val: Math.round(totaux.lipides), cible: n.lipidesG, couleur: "var(--color-peach)" },
  ];

  return (
    <Link href="/nutrition" className="block h-full">
      <Carte
        whileHover={{ y: -3 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className="flex h-full flex-col justify-between gap-3 p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <GrandChiffre
            label="Score bouffe"
            valeur={Math.round(totaux.kcal)}
            unite={`/ ${n.kcal} kcal`}
            taille="sm"
          />
          <Anneau pourcentage={scores.nutrition} taille={58} epaisseur={6}>
            <span className="chiffre text-xs">{scores.nutrition}%</span>
          </Anneau>
        </div>

        <div className="space-y-2">
          {lignes.map((l) => (
            <div key={l.nom}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-muted">{l.nom}</span>
                <span className="tnum font-medium">{l.val} / {l.cible} g</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-pill bg-[var(--surface-2)]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (l.val / l.cible) * 100)}%` }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full rounded-pill"
                  style={{ background: l.couleur }}
                />
              </div>
            </div>
          ))}
        </div>
      </Carte>
    </Link>
  );
}

/* -------------------------------------------------------------- Réussites */

function WidgetReussites({ taille }: { taille: TailleWidget }) {
  const { serie } = useApp();
  const journal = useStockageLocal<JournalJour[]>("forge:journal", []);
  const total = journal.filter((j) => j.seanceFaite).length;

  if (taille === "petit") {
    return (
      <Carte className="flex h-full flex-col items-center justify-center gap-0.5 p-3">
        <span className="text-2xl">🔥</span>
        <p className="chiffre text-3xl leading-none">{serie}</p>
        <p className="text-center text-[0.65rem] leading-tight text-muted">
          {`séance${serie > 1 ? "s" : ""} d'affilée`}
        </p>
      </Carte>
    );
  }

  return (
    <Carte className="flex h-full flex-col justify-between p-5">
      <p className="etiquette">Réussites</p>
      <div className="flex items-center gap-4">
        <span className="text-4xl">🔥</span>
        <div>
          <p className="text-3xl font-bold tnum leading-none">{serie}</p>
          <p className="text-xs text-muted">séances d&apos;affilée</p>
        </div>
      </div>
      <p className="text-xs text-muted">{total} séance{total > 1 ? "s" : ""} au total</p>
    </Carte>
  );
}

/* ------------------------------------------------------------------ Poids */

function WidgetPoids({ taille }: { taille: TailleWidget }) {
  const { fiche, profil } = useApp();
  const [mesures, setMesures] = useState<MesurePoids[]>([]);

  useEffect(() => {
    if (fiche) listerPoids(fiche.id).then(setMesures).catch(() => setMesures([]));
  }, [fiche]);

  const dernier = mesures.at(-1)?.poids ?? profil?.poids ?? 0;
  const premier = mesures[0]?.poids ?? profil?.poids ?? 0;
  const delta = Math.round((dernier - premier) * 10) / 10;

  // Mini-courbe : les 12 dernières mesures normalisées
  const points = mesures.slice(-12);
  const min = Math.min(...points.map((m) => m.poids), dernier);
  const max = Math.max(...points.map((m) => m.poids), dernier);
  const amplitude = max - min || 1;
  const chemin = points.length > 1
    ? points.map((m, i) => {
      const x = (i / (points.length - 1)) * 100;
      const y = 100 - ((m.poids - min) / amplitude) * 100;
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    }).join(" ")
    : "";

  return (
    <Link href="/mesures" className="block h-full">
      <Carte
        whileHover={{ y: -3 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className={cx("flex h-full flex-col p-5", taille === "grand" && "justify-between")}
      >
        <div className="flex items-start justify-between">
          <GrandChiffre label="Poids" valeur={dernier} unite="kg" taille="sm" />
          {mesures.length > 1 && (
            <span
              className={cx(
                "rounded-pill px-2.5 py-1 text-xs font-semibold tnum",
                delta < 0 ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : delta > 0 ? "bg-[var(--warn-soft)] text-[var(--warn)]"
                    : "bg-[var(--surface-2)] text-muted",
              )}
            >
              {delta > 0 ? "+" : ""}{delta} kg
            </span>
          )}
        </div>

        {chemin ? (
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="mt-3 h-16 w-full">
            <motion.path
              d={chemin} fill="none" stroke="var(--accent)" strokeWidth={3}
              strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </svg>
        ) : (
          <p className="mt-3 text-xs text-muted">
            Enregistrez une pesée pour voir la courbe apparaître.
          </p>
        )}
      </Carte>
    </Link>
  );
}

/* ------------------------------------------------------------ Progression */

function WidgetProgression({ taille }: { taille: TailleWidget }) {
  const { programme, semaine } = useApp();
  if (!programme) return null;

  const total = programme.meta.dureeCycle;
  const pct = Math.round((semaine / total) * 100);
  const restantes = Math.max(0, total - semaine);

  return (
    <Link href="/programme" className="block h-full">
      <Carte
        whileHover={{ y: -3 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className={cx("flex h-full p-5", taille === "grand" ? "flex-col justify-between" : "items-center gap-5")}
      >
        <div className="min-w-0 flex-1">
          <p className="etiquette">
            Progression du programme
          </p>
          <p className="mt-1 font-bold">
            Semaine {semaine} <span className="font-normal text-muted">sur {total}</span>
          </p>
          <div className="mt-2.5 h-2 overflow-hidden rounded-pill bg-[var(--surface-2)]">
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="h-full rounded-pill bg-[var(--accent)]"
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            {restantes > 0
              ? `Plus que ${restantes} semaine${restantes > 1 ? "s" : ""} avant le prochain objectif`
              : "Dernière semaine du cycle : bilan à faire"}
          </p>
        </div>
        {taille === "rectangle" && (
          <span className="shrink-0 text-3xl font-bold tnum text-[var(--accent)]">{pct}%</span>
        )}
      </Carte>
    </Link>
  );
}

/* ------------------------------------------------------------ Répartiteur */

export function RendreWidget({ type, taille }: { type: TypeWidget; taille: TailleWidget }) {
  switch (type) {
    case "lancer_seance": return <WidgetLancerSeance taille={taille} />;
    case "hydratation": return <WidgetHydratation taille={taille} />;
    case "macros": return <WidgetMacros />;
    case "reussites": return <WidgetReussites taille={taille} />;
    case "poids": return <WidgetPoids taille={taille} />;
    case "progression": return <WidgetProgression taille={taille} />;
    default: return null;
  }
}

export { Anneau };
