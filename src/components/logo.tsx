/**
 * logo.tsx — Marque FORGE.
 *
 * Enclume vectorielle : le nom évoque le travail du corps comme on forge le
 * métal. En SVG plutôt qu'en image, pour rester net à toute taille et suivre
 * automatiquement la couleur d'accent du thème actif.
 */

export function LogoForge({
  taille = 32,
  className = "",
}: {
  taille?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-xl bg-[var(--accent)] ${className}`}
      style={{ width: taille, height: taille }}
    >
      <svg
        width={taille * 0.62}
        height={taille * 0.62}
        viewBox="0 0 100 100"
        fill="none"
        role="presentation"
      >
        {/* Table de l'enclume */}
        <path
          d="M8 34 H92 L80 56 H20 Z"
          fill="var(--accent-contrast)"
        />
        {/* Corne */}
        <path
          d="M8 34 L0 45 L20 41 Z"
          fill="var(--accent-contrast)"
          opacity="0.72"
        />
        {/* Colonne */}
        <rect x="36" y="56" width="28" height="22" fill="var(--accent-contrast)" />
        {/* Socle */}
        <rect
          x="18" y="78" width="64" height="14" rx="3"
          fill="var(--accent-contrast)" opacity="0.72"
        />
        {/* Étincelle */}
        <path
          d="M78 8 L82 16 L78 24 L74 16 Z"
          fill="var(--accent-contrast)"
          opacity="0.9"
        />
      </svg>
    </span>
  );
}

/** Logo accompagné du nom, pour les en-têtes. */
export function MarqueForge({ taille = 32 }: { taille?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoForge taille={taille} />
      <span className="text-[0.95rem] font-bold tracking-[0.14em]">FORGE</span>
    </span>
  );
}
