"use client";

/**
 * bouteille.tsx — Jauge d'hydratation en forme de bouteille.
 *
 * Remplace l'anneau de progression : une bouteille qui se remplit est lue
 * d'un coup d'œil, sans avoir à interpréter un pourcentage.
 *
 * Le niveau est animé, avec une surface ondulante pour évoquer le liquide.
 */

import { motion } from "framer-motion";

export function Bouteille({
  pourcentage,
  hauteur = 120,
  afficherValeur = true,
  valeur,
}: {
  pourcentage: number;
  hauteur?: number;
  afficherValeur?: boolean;
  valeur?: string;
}) {
  const rempli = Math.max(0, Math.min(100, pourcentage));
  const largeur = hauteur * 0.52;

  // Repère du dessin : 100 × 190 unités, le liquide monte de 178 à 28.
  const niveauY = 178 - (rempli / 100) * 150;   // du fond (178) au goulot (28)

  return (
    <div className="relative" style={{ width: largeur, height: hauteur }}>
      <svg viewBox="0 0 100 190" width={largeur} height={hauteur} fill="none">
        <defs>
          {/* Le liquide ne déborde jamais du contour de la bouteille */}
          <clipPath id="forme-bouteille">
            <path d="M35 8 h30 v22 c0 6 3 9 7 13 l6 6 c5 5 8 12 8 19 v106 c0 8-6 14-14 14 H28
                     c-8 0-14-6-14-14 V68 c0-7 3-14 8-19 l6-6 c4-4 7-7 7-13 V8 Z" />
          </clipPath>

          {/* Contrepoint froid : l'eau prend le cyan doux, le corail reste
              réservé aux actions et à l'effort. */}
          <linearGradient id="degrade-eau" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--eau-clair)" stopOpacity="0.72" />
            <stop offset="100%" stopColor="var(--eau)" stopOpacity="0.88" />
          </linearGradient>
        </defs>

        {/* Intérieur translucide */}
        <path
          d="M35 8 h30 v22 c0 6 3 9 7 13 l6 6 c5 5 8 12 8 19 v106 c0 8-6 14-14 14 H28
             c-8 0-14-6-14-14 V68 c0-7 3-14 8-19 l6-6 c4-4 7-7 7-13 V8 Z"
          fill="var(--surface-2)"
        />

        {/* Liquide */}
        <g clipPath="url(#forme-bouteille)">
          <motion.g
            initial={{ y: 150 }}
            animate={{ y: niveauY - 28 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Surface ondulante : deux crêtes qui glissent lentement */}
            <motion.path
              d="M-20 28 q15 -6 30 0 t30 0 t30 0 t30 0 t30 0 v170 H-20 Z"
              fill="url(#degrade-eau)"
              animate={{ x: [0, -60, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.g>
        </g>

        {/* Contour */}
        <path
          d="M35 8 h30 v22 c0 6 3 9 7 13 l6 6 c5 5 8 12 8 19 v106 c0 8-6 14-14 14 H28
             c-8 0-14-6-14-14 V68 c0-7 3-14 8-19 l6-6 c4-4 7-7 7-13 V8 Z"
          stroke="var(--border-strong)"
          strokeWidth="1.75"
        />

        {/* Bouchon */}
        <rect
          x="33" y="0" width="34" height="10" rx="4"
          fill="var(--eau)" opacity="0.45"
        />

        {/* Graduations discrètes */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1="68" y1={178 - f * 150} x2="80" y2={178 - f * 150}
            stroke="var(--border-strong)" strokeWidth="1.25" opacity="0.5"
            strokeLinecap="round"
          />
        ))}
      </svg>

      {afficherValeur && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <p className="chiffre text-lg leading-none">{rempli}%</p>
            {valeur && <p className="mt-0.5 text-[0.6rem] text-muted">{valeur}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
