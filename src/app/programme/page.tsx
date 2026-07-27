"use client";

/**
 * programme/page.tsx — Écran Programme.
 *
 * Position dans le cycle, découpage en phases et calendrier réorganisable.
 * Chaque séance est cliquable et mène à son détail.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Moon } from "lucide-react";
import { Bouton, Carte, Encart, GrandChiffre, Pastille, Squelette, Vide, cx } from "@/components/ui";
import { jourSemaineCourant, useApp } from "@/lib/useApp";
import { cap } from "@/lib/moteur/noyau";
import { JOURS, type Jour, type Seance } from "@/lib/moteur/types";
import { deplacerSeance, lirePlanning, reinitialiserPlanning } from "@/lib/suivi";
import { useVersionStockage } from "@/lib/store";

/**
 * Couleurs de bordure du calendrier.
 *
 * `globals.css` pose `* { border-color: var(--border) }` **hors de toute
 * couche**. Or, dans la cascade CSS, une déclaration hors couche l'emporte sur
 * toutes les couches nommées : les utilitaires Tailwind `border-[var(--x)]`,
 * qui vivent dans `@layer utilities`, sont donc systématiquement écrasés.
 * Les épaisseurs et les styles de trait (`border-l-4`, `border-dashed`) ne
 * sont pas concernés — seule la couleur l'est. On la passe donc en style
 * inline, qui prime sur les règles d'auteur, quelle que soit leur couche.
 */
function bordureJour(effort: boolean, cible: boolean): React.CSSProperties {
  return {
    // Contour complet de la cible de dépôt, puis barre latérale de l'état :
    // la longhand `borderLeftColor` est appliquée après, elle l'emporte.
    ...(cible ? { borderColor: "var(--accent)" } : null),
    borderLeftColor: effort ? "var(--accent)" : "var(--trame-repos)",
  };
}

/**
 * Rendu de l'intensité, lu **tel quel** sur `Seance.intensite` (seul champ du
 * moteur qui la porte : deux valeurs, `moderee` et `elevee`). Aucun seuil, ni
 * sur `dureeMin`, ni sur le nombre de blocs, n'est inventé ici : l'échelle
 * affichée est exactement celle des données.
 */
const INTENSITE: Record<Seance["intensite"], { points: string; libelle: string }> = {
  moderee: { points: "●", libelle: "modérée" },
  elevee: { points: "●●", libelle: "élevée" },
};

/** Résumé vocalisé d'une ligne-jour, pour les lecteurs d'écran. */
function etiquetteJour(jour: Jour, seances: Seance[], aujourdhui: boolean): string {
  const tete = aujourdhui ? `${cap(jour)}, aujourd'hui` : cap(jour);
  if (!seances.length) return `${tete}, jour de repos`;
  const n = seances.length;
  return `${tete}, jour d'effort, ${n} séance${n > 1 ? "s" : ""} : `
    + seances.map((s) => s.nom).join(", ");
}

/**
 * Découpe le cycle en phases : chaque bloc d'accumulation suivi de sa semaine
 * de décharge forme une phase. C'est la structure réelle de la progression.
 */
function decouperPhases(types: ("accumulation" | "deload")[]) {
  const phases: { debut: number; fin: number; semaines: number }[] = [];
  let debut = 1;
  types.forEach((t, i) => {
    if (t === "deload" || i === types.length - 1) {
      phases.push({ debut, fin: i + 1, semaines: i + 2 - debut });
      debut = i + 2;
    }
  });
  return phases.filter((p) => p.semaines > 0);
}

export default function PageProgramme() {
  const { chargement, fiche, programme, semaine } = useApp();
  const router = useRouter();
  const version = useVersionStockage();
  const [semaineVue, setSemaineVue] = useState<number | null>(null);
  const [modeEdition, setModeEdition] = useState(false);
  const [seanceDeplacee, setSeanceDeplacee] = useState<string | null>(null);

  const phases = useMemo(
    () => (programme ? decouperPhases(programme.cycle.map((c) => c.type)) : []),
    [programme],
  );

  const vue = semaineVue ?? semaine;
  const donneesSemaine = programme?.cycle[vue - 1] ?? programme?.semaineType;
  // Jour courant fourni par le moteur : aucune date n'est recalculée ici.
  const jourCourant = jourSemaineCourant();

  /**
   * Séances de la semaine, réparties par jour en tenant compte des
   * déplacements manuels enregistrés.
   */
  const parJour = useMemo(() => {
    void version;
    const carte = new Map<Jour, Seance[]>(JOURS.map((j) => [j, []]));
    if (!donneesSemaine) return carte;

    const deplacements = lirePlanning()[String(vue)] ?? {};
    for (const jourData of donneesSemaine.jours) {
      for (const s of jourData.seances) {
        const cible = (deplacements[s.nom] as Jour) ?? jourData.jour;
        const liste = carte.get(cible);
        if (liste) liste.push(s);
      }
    }
    return carte;
  }, [donneesSemaine, vue, version]);

  const aDesDeplacements = useMemo(() => {
    void version;
    return Object.keys(lirePlanning()[String(vue)] ?? {}).length > 0;
  }, [vue, version]);

  if (chargement) {
    return (
      <div role="status" aria-busy="true" className="space-y-4">
        <span className="sr-only">Chargement…</span>
        <Squelette className="h-8 w-2/3" />
        {Array.from({ length: 7 }).map((_, i) => (
          <Squelette key={i} className="h-14" />
        ))}
      </div>
    );
  }

  if (!fiche || !programme || !donneesSemaine) {
    return (
      <Carte>
        <Vide
          icone="📆" titre="Un cycle complet vous attend"
          texte="Quatre à douze semaines structurées : montée en charge, semaine de décharge, pics de forme. Le calendrier s'adapte à vos jours disponibles."
          apercu={
            <div aria-hidden className="grid grid-cols-7 gap-1.5">
              {[
                { jour: "L", effort: true },
                { jour: "M", effort: true },
                { jour: "M", effort: false },
                { jour: "J", effort: true },
                { jour: "V", effort: true },
                { jour: "S", effort: false },
                { jour: "D", effort: false },
              ].map((j, i) => (
                <div
                  key={i}
                  className={cx(
                    "rounded-2xl py-3 text-center text-xs font-medium",
                    j.effort ? "bg-[var(--accent-soft)]" : "bg-[var(--surface-2)]",
                  )}
                >
                  {j.jour}
                </div>
              ))}
            </div>
          }
          action={<Link href="/profil"><Bouton>Créer mon profil</Bouton></Link>}
          secondaire={<Link href="/" className="text-sm text-muted underline underline-offset-4">Retour à l&apos;accueil</Link>}
        />
      </Carte>
    );
  }

  const total = programme.meta.dureeCycle;
  const restantes = Math.max(0, total - semaine);
  const pct = Math.round((semaine / total) * 100);

  /** Déplace la séance sélectionnée vers le jour choisi. */
  const poser = (jour: Jour) => {
    if (!seanceDeplacee) return;
    deplacerSeance(vue, seanceDeplacee, jour);
    setSeanceDeplacee(null);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ------------------------- Position cycle ------------------------- */}
      <Carte className="p-5 sm:p-8">
        <GrandChiffre
          label="Tu en es là"
          valeur={semaine}
          unite={`/ ${total} semaines`}
          taille="lg"
        />

        <div className="mt-4 h-2.5 overflow-hidden rounded-pill bg-[var(--surface-2)]">
          <motion.div
            initial={{ width: 0 }} animate={{ width: `${pct}%` }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="h-full rounded-pill bg-[var(--accent)]"
          />
        </div>

        <p className="mt-3 text-sm text-muted text-pretty">
          {restantes > 0
            ? `Plus que ${restantes} semaine${restantes > 1 ? "s" : ""} avant ton prochain objectif.`
            : "Dernière semaine : c'est le moment de faire le bilan et de relancer un cycle."}
        </p>
      </Carte>

      {/* ------------------------------ Phases ---------------------------- */}
      <Carte className="p-5 sm:p-6">
        <h2 className="font-semibold">
          Tu as {phases.length} phase{phases.length > 1 ? "s" : ""}
        </h2>
        <p className="mt-1 text-sm text-muted text-pretty">
          Chaque phase monte en volume puis se termine par une semaine de décharge,
          pendant laquelle les progrès se consolident.
        </p>
        <div className="mt-4 space-y-2">
          {phases.map((p, i) => {
            const enCours = semaine >= p.debut && semaine <= p.fin;
            const passee = semaine > p.fin;
            return (
              <div
                key={i}
                className={cx(
                  "flex items-center gap-3 rounded-2xl px-4 py-3",
                  enCours ? "bg-[var(--accent-soft)]" : "bg-[var(--surface-2)]",
                )}
              >
                <span
                  className={cx(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold",
                    enCours || passee
                      ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                      : "bg-[var(--surface)] text-muted",
                  )}
                >
                  {passee ? "✓" : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    Phase {i + 1} · semaines {p.debut} à {p.fin}
                  </p>
                  <p className="text-xs text-muted">
                    {p.semaines} semaine{p.semaines > 1 ? "s" : ""}, décharge incluse
                  </p>
                </div>
                {enCours && <Pastille ton="accent">en cours</Pastille>}
              </div>
            );
          })}
        </div>
      </Carte>

      {/* ---------------------------- Calendrier -------------------------- */}
      <Carte className="p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Calendrier</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSemaineVue(Math.max(1, vue - 1))}
              disabled={vue <= 1}
              aria-label="Semaine précédente"
              className="grid h-8 w-8 place-items-center rounded-full bg-[var(--surface-2)] disabled:opacity-30"
            >
              ←
            </button>
            <span className="min-w-20 text-center text-sm font-medium tnum">
              Semaine {vue}
            </span>
            <button
              onClick={() => setSemaineVue(Math.min(total, vue + 1))}
              disabled={vue >= total}
              aria-label="Semaine suivante"
              className="grid h-8 w-8 place-items-center rounded-full bg-[var(--surface-2)] disabled:opacity-30"
            >
              →
            </button>
          </div>
        </div>

        {/* Vue d'ensemble des semaines */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {programme.cycle.map((c) => (
            <button
              key={c.semaine}
              onClick={() => setSemaineVue(c.semaine)}
              aria-label={`Semaine ${c.semaine}`}
              className={cx(
                "h-8 w-8 rounded-xl text-xs tnum transition",
                c.semaine === vue
                  ? "bg-[var(--accent)] font-semibold text-[var(--accent-contrast)]"
                  : c.type === "deload"
                    ? "bg-[var(--warn-soft)] text-[var(--warn)]"
                    : c.semaine < semaine
                      ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "bg-[var(--surface-2)] text-muted",
              )}
            >
              {c.semaine}
            </button>
          ))}
        </div>

        {donneesSemaine.type === "deload" && (
          <div className="mb-4">
            <Encart ton="warn" titre="Semaine de décharge">
              {donneesSemaine.consigne}
            </Encart>
          </div>
        )}

        {/* Barre d'organisation */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted">
            {modeEdition
              ? seanceDeplacee
                ? "Choisissez le jour d'accueil."
                : "Touchez une séance pour la déplacer."
              : "Touchez une séance pour voir son détail."}
          </p>
          <div className="flex gap-2">
            {aDesDeplacements && modeEdition && (
              <Bouton
                variante="fantome" taille="sm"
                onClick={() => { reinitialiserPlanning(vue); setSeanceDeplacee(null); }}
              >
                Réinitialiser
              </Bouton>
            )}
            <Bouton
              variante={modeEdition ? "principal" : "fantome"}
              taille="sm"
              onClick={() => { setModeEdition((m) => !m); setSeanceDeplacee(null); }}
            >
              {modeEdition ? "Terminer" : "Organiser"}
            </Bouton>
          </div>
        </div>

        {/* Jours */}
        <ul className="space-y-2">
          {JOURS.map((j) => {
            const seances = parJour.get(j) ?? [];
            const effort = seances.length > 0;
            const estAujourdhui = vue === semaine && j === jourCourant;
            const cibleActive = modeEdition && seanceDeplacee !== null;
            // Deux valeurs seulement dans le moteur : on affiche celle qui
            // domine la journée, sans jamais la recalculer.
            const intensite = seances.some((s) => s.intensite === "elevee")
              ? INTENSITE.elevee
              : INTENSITE.moderee;
            return (
              <li
                key={j}
                aria-label={etiquetteJour(j, seances, estAujourdhui)}
                style={{
                  ...bordureJour(effort, cibleActive),
                  // La trame du repos reste pointillée même quand la ligne est
                  // une cible de dépôt : distinction non chromatique préservée.
                  borderLeftStyle: effort ? "solid" : "dashed",
                }}
                className={cx(
                  "rounded-2xl border-l-4 transition",
                  // Un seul fond à la fois : `bg-[…]/40` est émis après
                  // `bg-[var(--accent-soft)]` et l'emporterait sinon.
                  cibleActive
                    ? "border-2 border-dashed bg-[var(--accent-soft)]"
                    : effort
                      ? "bg-[var(--accent-soft)]"
                      : "bg-[var(--surface-2)]/40",
                  estAujourdhui
                    && "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--surface)]",
                )}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                  {/* Glyphe d'état, à gauche du nom du jour : pastille
                      d'intensité pour l'effort, lune pour le repos. Purement
                      décoratif — l'aria-label de la ligne porte déjà le sens,
                      et le mot d'intensité reste affiché à côté des séances. */}
                  <span
                    aria-hidden
                    className={cx(
                      "flex w-6 shrink-0 justify-center text-[0.7rem] tracking-tighter",
                      effort ? "text-[var(--accent)]" : "text-muted",
                    )}
                  >
                    {effort ? intensite.points : <Moon size={14} className="shrink-0" />}
                  </span>

                  <span
                    className={cx(
                      "w-20 shrink-0 text-sm",
                      estAujourdhui ? "font-bold" : "font-medium",
                    )}
                  >
                    {cap(j)}
                  </span>

                  {estAujourdhui && <Pastille ton="accent">Aujourd&apos;hui</Pastille>}

                  {seances.length === 0 ? (
                    <span className="text-sm text-muted">Repos — récupération</span>
                  ) : (
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                      {/* Intensité : lue sur `Seance.intensite`, jamais déduite. */}
                      <span className="shrink-0 text-xs text-muted">{intensite.libelle}</span>

                      {seances.map((s, i) => {
                        const selectionnee = seanceDeplacee === s.nom;
                        return (
                          <button
                            key={`${s.nom}-${i}`}
                            onClick={() => {
                              if (modeEdition) {
                                setSeanceDeplacee(selectionnee ? null : s.nom);
                              } else if (vue === semaine) {
                                router.push("/seance");
                              } else {
                                setSemaineVue(semaine);
                              }
                            }}
                            className={cx(
                              "flex items-center gap-2 rounded-pill px-3 py-1.5 text-xs transition",
                              selectionnee
                                ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                                : "bg-[var(--surface)] hover:bg-[var(--accent-soft)]",
                            )}
                          >
                            <span>{s.type === "force" ? "🤸" : "🏃"}</span>
                            <span className="font-medium">{s.nom}</span>
                            <span className="tnum opacity-70">{s.debut}</span>
                            {modeEdition && <span className="opacity-60">⇅</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Zone de dépôt : un vrai bouton, donc accessible au clavier
                    et insensible aux clics interceptés par les enfants. */}
                {cibleActive && (
                  <button
                    type="button"
                    onClick={() => poser(j)}
                    style={{ borderTopColor: "var(--accent)" }}
                    className="w-full rounded-b-2xl border-t border-dashed px-4 py-2 text-xs font-medium text-ink transition hover:bg-[var(--accent-soft)]"
                  >
                    Déplacer ici
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {/* Légende : chaque état se lit aussi sans couleur — trait plein,
            trait pointillé, anneau. */}
        <ul className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden
              style={{ backgroundColor: "var(--accent)" }}
              className="h-3 w-3 shrink-0 rounded-[3px]"
            />
            Effort
          </li>
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden
              style={{ borderColor: "var(--trame-repos)" }}
              className="h-3 w-3 shrink-0 rounded-[3px] border-2 border-dashed"
            />
            Repos
          </li>
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden
              style={{ borderColor: "var(--accent)" }}
              className="h-3 w-3 shrink-0 rounded-full border-2"
            />
            Aujourd&apos;hui
          </li>
        </ul>

        <AnimatePresence>
          {aDesDeplacements && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 overflow-hidden text-xs text-muted text-pretty"
            >
              Cette semaine a été réorganisée manuellement. Le programme sous-jacent
              n&apos;est pas modifié : seuls les jours d&apos;exécution changent.
            </motion.p>
          )}
        </AnimatePresence>

        {vue === semaine && (
          <Link href="/seance" className="mt-4 block">
            <Bouton pleineLargeur>Voir la séance du jour</Bouton>
          </Link>
        )}
      </Carte>

      {/* --------------------------- Réglages ----------------------------- */}
      <Carte className="p-5 sm:p-6">
        <h2 className="mb-3 font-semibold">Réglages du cycle</h2>
        <div className="flex flex-wrap gap-2">
          <Link href="/profil">
            <Bouton variante="fantome" taille="sm">Modifier mon profil</Bouton>
          </Link>
          <Link href="/parametres">
            <Bouton variante="fantome" taille="sm">Changer de programme</Bouton>
          </Link>
        </div>
      </Carte>
    </div>
  );
}
