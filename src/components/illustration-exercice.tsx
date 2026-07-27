"use client";

/**
 * illustration-exercice.tsx — Rendu d'un schéma d'exécution.
 *
 * Composant volontairement silencieux : si l'exercice n'a pas de schéma, il ne
 * rend rien du tout (pas de cadre vide, pas d'avertissement en console). La
 * recherche passe par l'index normalisé de `src/lib/donnees/illustrations.tsx`,
 * ce qui tolère les différences d'accents, de casse et d'espaces.
 */

import { trouverIllustration } from "@/lib/donnees/illustrations";
import { cx } from "@/components/ui";

export function IllustrationExercice({
  nom,
  className,
}: {
  nom: string;
  className?: string;
}) {
  const illustration = trouverIllustration(nom);
  if (!illustration) return null;

  return (
    <div className={cx("rounded-2xl bg-[var(--surface-2)] p-4 text-ink", className)}>
      {/* Le SVG hérite de la largeur du conteneur : viewBox 240×120, donc une
          hauteur automatique et un rendu net à n'importe quelle taille. */}
      <div className="mx-auto h-auto w-full max-w-[240px] [&>svg]:block [&>svg]:h-auto [&>svg]:w-full">
        {illustration.svg}
      </div>

      <ul className="mt-3 space-y-1.5 text-left">
        {illustration.points.map((point) => (
          <li key={point} className="flex gap-2 text-xs text-muted text-pretty">
            <span
              aria-hidden
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]"
            />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
