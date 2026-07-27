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
import { useSurvolCarte } from "@/hooks/useCoarsePointer";
import { Bouteille } from "./bouteille";
import { useApp } from "@/lib/useApp";
import { libelleSeance } from "@/lib/useApp";
import { ajouterEau, type JournalJour, type TailleWidget, type TypeWidget } from "@/lib/suivi";
import { useToast } from "@/components/toast";
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
  pourcentage, taille = 84, epaisseur = 8, couleur = "var(--accent-vif)", children,
}: {
  pourcentage: number; taille?: number; epaisseur?: number;
  couleur?: string; children?: React.ReactNode;
}) {
  // Trait affiné : l'arc reste précis et léger, dans l'esprit du reste de l'UI.
  const trait = Math.max(3, epaisseur * 0.55);
  const r = (taille - trait) / 2;
  const circonference = 2 * Math.PI * r;
  const rempli = Math.min(100, Math.max(0, pourcentage));

  // Point lumineux posé en bout d'arc : repère de la valeur atteinte.
  const angle = (rempli / 100) * 2 * Math.PI - Math.PI / 2;
  const cx = taille / 2 + r * Math.cos(angle);
  const cy = taille / 2 + r * Math.sin(angle);

  return (
    <div className="relative grid place-items-center" style={{ width: taille, height: taille }}>
      <svg width={taille} height={taille} className="overflow-visible">
        <g className="origin-center -rotate-90" style={{ transformOrigin: "center" }}>
          <circle
            cx={taille / 2} cy={taille / 2} r={r} fill="none"
            stroke="var(--surface-2)" strokeWidth={trait}
          />
          <motion.circle
            cx={taille / 2} cy={taille / 2} r={r} fill="none"
            stroke={couleur} strokeWidth={trait} strokeLinecap="round"
            strokeDasharray={circonference}
            initial={{ strokeDashoffset: circonference }}
            animate={{ strokeDashoffset: circonference * (1 - rempli / 100) }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          />
        </g>
        {rempli > 2 && (
          <motion.circle
            cx={cx} cy={cy} r={trait * 0.62}
            fill="var(--marqueur)"
            stroke="var(--marqueur-halo)" strokeWidth={trait * 0.9}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />
        )}
      </svg>
      <div className="absolute grid place-items-center text-center">{children}</div>
    </div>
  );
}

/* ---------------------------------------------------------- Lancer séance */

function WidgetLancerSeance({ taille }: { taille: TailleWidget }) {
  const { seancesDuJour, serie } = useApp();
  const survolCarte = useSurvolCarte();
  const repos = seancesDuJour.length === 0;
  const duree = seancesDuJour.reduce((a, s) => a + s.dureeMin, 0);

  return (
    <Link href={repos ? "/programme" : "/seance"} className="block h-full">
      <Carte
        {...survolCarte}
        className={cx(
          "flex h-full items-center gap-4 p-5",
          taille === "grand" && "flex-col items-start justify-between",
        )}
      >
        <div
          className={cx(
            "grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl",
            repos ? "panneau-froid" : "panneau-chaud",
          )}
        >
          {repos ? "🌙" : "🔥"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="etiquette">
            {repos ? "Aujourd'hui" : "Séance du jour"}
          </p>
          <p className="mt-0.5 text-[1.05rem] font-medium leading-tight text-balance">
            {libelleSeance(seancesDuJour)}
          </p>
          {!repos && (
            <p className="mt-1 text-xs text-muted">
              {duree} min · {serie > 0 ? `série de ${serie}` : "on démarre"}
            </p>
          )}
          {repos && <p className="mt-1 text-xs text-muted">Récupération programmée</p>}
        </div>
        {!repos && (
          <span className="shrink-0 rounded-pill bg-[image:var(--accent-degrade)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] shadow-soft">
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
  const { toast } = useToast();
  const litres = (jour.hydratationMl / 1000).toFixed(1);
  const cible = (cibleHydratation / 1000).toFixed(1);

  const boire = (ml: number) => {
    ajouterEau(jour.date, ml);
    rafraichir();
    toast("Verre ajouté", "succes");
  };

  if (taille === "petit") {
    return (
      <Carte className="flex h-full flex-col items-center justify-center gap-1.5 p-3">
        <Bouteille pourcentage={scores.hydratation} hauteur={78} afficherValeur={false} />
        <p className="chiffre text-base leading-none">
          {litres}<span className="unite ml-1 text-[0.5rem]">L</span>
        </p>
        <button
          onClick={() => boire(250)}
          className="rounded-pill bg-[var(--eau-soft)] px-3 py-1.5 text-[0.62rem] font-medium
                     transition-colors duration-200 hover:bg-[var(--accent-soft)]"
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
        <p className="mt-1.5 chiffre valeur-sm leading-none">
          {litres}
          <span className="unite ml-1.5 text-[0.3em]">/ {cible} L</span>
        </p>
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {[250, 500, 750].map((ml) => (
            <button
              key={ml}
              onClick={() => boire(ml)}
              className="rounded-pill bg-[var(--eau-soft)] px-3 py-2 text-xs font-medium
                         transition-colors duration-200
                         hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
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
  const survolCarte = useSurvolCarte();
  if (!programme) return null;

  const n = programme.nutrition;
  const lignes = [
    { nom: "Protéines", val: Math.round(totaux.proteines), cible: n.proteinesG, couleur: "var(--data-proteines)" },
    { nom: "Glucides", val: Math.round(totaux.glucides), cible: n.glucidesG, couleur: "var(--data-glucides)" },
    { nom: "Lipides", val: Math.round(totaux.lipides), cible: n.lipidesG, couleur: "var(--data-lipides)" },
  ];

  return (
    <Link href="/nutrition" className="block h-full">
      <Carte
        {...survolCarte}
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

        <div className="space-y-2.5">
          {lignes.map((l) => (
            <div key={l.nom}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-muted">{l.nom}</span>
                <span className="tnum font-medium">
                  {l.val} <span className="text-faint">/ {l.cible} g</span>
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-pill bg-[var(--surface-2)]">
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
      <Carte className="flex h-full flex-col items-center justify-center gap-1 p-3">
        <span className="text-2xl">🔥</span>
        <p className="chiffre valeur-sm leading-none">{serie}</p>
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
          <p className="chiffre valeur-md leading-none">{serie}</p>
          <p className="mt-1 text-xs text-muted">séances d&apos;affilée</p>
        </div>
      </div>
      <p className="text-xs text-faint">{total} séance{total > 1 ? "s" : ""} au total</p>
    </Carte>
  );
}

/* ------------------------------------------------------------------ Poids */

function WidgetPoids({ taille }: { taille: TailleWidget }) {
  const { fiche, profil } = useApp();
  const survolCarte = useSurvolCarte();
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
        {...survolCarte}
        className={cx("flex h-full flex-col p-5", taille === "grand" && "justify-between")}
      >
        <div className="flex items-start justify-between">
          <GrandChiffre label="Poids" valeur={dernier} unite="kg" taille="sm" />
          {mesures.length > 1 && (
            <span
              className={cx(
                "shrink-0 rounded-pill px-2.5 py-1 text-xs font-semibold tnum",
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
          <div className="relative mt-3 h-16 w-full">
            <svg
              viewBox="0 0 100 100" preserveAspectRatio="none"
              className="h-full w-full overflow-visible"
            >
              <defs>
                {/* Aplat dégradé sous la courbe : donne du volume sans bruit. */}
                <linearGradient id="degrade-poids" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-clair)" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="var(--accent-clair)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <motion.path
                d={`${chemin} L100,110 L0,110 Z`} fill="url(#degrade-poids)" stroke="none"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.35 }}
              />
              <motion.path
                d={chemin} fill="none" stroke="var(--accent-vif)" strokeWidth={2}
                strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </svg>
            {/* Marqueur de la dernière pesée : point jaune pâle, hors du SVG
                pour rester parfaitement rond malgré `preserveAspectRatio`. */}
            <motion.span
              aria-hidden
              className="marqueur-actif pointer-events-none absolute h-2 w-2 rounded-full"
              style={{
                left: "100%",
                top: `${100 - ((dernier - min) / amplitude) * 100}%`,
                translate: "-100% -50%",
              }}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
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
  const survolCarte = useSurvolCarte();
  if (!programme) return null;

  const total = programme.meta.dureeCycle;
  const pct = Math.round((semaine / total) * 100);
  const restantes = Math.max(0, total - semaine);

  return (
    <Link href="/programme" className="block h-full">
      <Carte
        {...survolCarte}
        className={cx("flex h-full p-5", taille === "grand" ? "flex-col justify-between" : "items-center gap-5")}
      >
        <div className="min-w-0 flex-1">
          <p className="etiquette">
            Progression du programme
          </p>
          <p className="mt-1 text-[1.05rem] font-medium">
            Semaine {semaine} <span className="font-normal text-muted">sur {total}</span>
          </p>
          <div className="relative mt-3 h-1.5 rounded-pill bg-[var(--surface-2)]">
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="h-full rounded-pill bg-[image:var(--accent-degrade)]"
            />
            {/* Repère de la semaine en cours, seul point jaune de la carte. */}
            <motion.span
              aria-hidden
              className="marqueur-actif absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full"
              initial={{ opacity: 0, left: 0 }}
              animate={{ opacity: 1, left: `calc(${pct}% - 4px)` }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <p className="mt-3 text-xs text-muted">
            {restantes > 0
              ? `Plus que ${restantes} semaine${restantes > 1 ? "s" : ""} avant le prochain objectif`
              : "Dernière semaine du cycle : bilan à faire"}
          </p>
        </div>
        {taille === "rectangle" && (
          <span className="chiffre shrink-0 valeur-sm text-[var(--accent)]">{pct}%</span>
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
