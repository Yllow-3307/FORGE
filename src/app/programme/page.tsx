"use client";

/**
 * programme/page.tsx — Écran Programme.
 *
 * Position dans le cycle, découpage en phases, calendrier semaine par semaine
 * et compte à rebours jusqu'au prochain objectif.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Bouton, Carte, Encart, Pastille, Vide, cx } from "@/components/ui";
import { useApp } from "@/lib/useApp";
import { cap } from "@/lib/moteur/noyau";
import { JOURS } from "@/lib/moteur/types";

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
  const [semaineVue, setSemaineVue] = useState<number | null>(null);

  const phases = useMemo(
    () => (programme ? decouperPhases(programme.cycle.map((c) => c.type)) : []),
    [programme],
  );

  if (chargement) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
      </div>
    );
  }

  if (!fiche || !programme) {
    return (
      <Carte>
        <Vide
          icone="📆" titre="Aucun programme"
          texte="Créez votre profil pour générer un cycle complet."
          action={<Link href="/profil"><Bouton>Créer mon profil</Bouton></Link>}
        />
      </Carte>
    );
  }

  const total = programme.meta.dureeCycle;
  const restantes = Math.max(0, total - semaine);
  const pct = Math.round((semaine / total) * 100);
  const vue = semaineVue ?? semaine;
  const donneesSemaine = programme.cycle[vue - 1] ?? programme.semaineType;

  return (
    <div className="space-y-5">
      {/* ------------------------- Position cycle ------------------------- */}
      <Carte className="p-6 sm:p-8">
        <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-faint">
          Tu en es là
        </p>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-4xl font-bold tnum">
            {semaine}<span className="text-xl font-normal text-muted"> / {total}</span>
          </p>
          <p className="text-sm text-muted">semaines réalisées</p>
        </div>

        <div className="mt-4 h-3 overflow-hidden rounded-pill bg-[var(--surface-2)]">
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
      <Carte className="p-6">
        <h2 className="font-bold">
          Tu as {phases.length} phase{phases.length > 1 ? "s" : ""}
        </h2>
        <p className="mt-1 text-sm text-muted">
          Chaque phase monte en volume puis se termine par une semaine de décharge,
          pendant laquelle les progrès se consolident.
        </p>
        <div className="mt-4 space-y-2.5">
          {phases.map((p, i) => {
            const enCours = semaine >= p.debut && semaine <= p.fin;
            const passee = semaine > p.fin;
            return (
              <div
                key={i}
                className={cx(
                  "flex items-center gap-4 rounded-2xl px-4 py-3",
                  enCours ? "bg-[var(--accent-soft)]" : "bg-[var(--surface-2)]",
                )}
              >
                <span
                  className={cx(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold",
                    enCours ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                      : passee ? "bg-[var(--accent)]/40 text-[var(--accent-contrast)]"
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
      <Carte className="p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold">Calendrier du programme</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSemaineVue(Math.max(1, vue - 1))}
              disabled={vue <= 1}
              aria-label="Semaine précédente"
              className="grid h-8 w-8 place-items-center rounded-full bg-[var(--surface-2)] disabled:opacity-30"
            >
              ←
            </button>
            <span className="min-w-24 text-center text-sm font-medium tnum">
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
        <div className="mb-5 flex flex-wrap gap-1.5">
          {programme.cycle.map((c) => (
            <button
              key={c.semaine}
              onClick={() => setSemaineVue(c.semaine)}
              aria-label={`Semaine ${c.semaine}`}
              className={cx(
                "h-9 w-9 rounded-xl text-xs font-semibold tnum transition",
                c.semaine === vue
                  ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
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

        {/* Détail de la semaine sélectionnée */}
        <div className="space-y-2">
          {JOURS.map((j) => {
            const jourData = donneesSemaine.jours.find((x) => x.jour === j);
            const seances = jourData?.seances ?? [];
            return (
              <div
                key={j}
                className={cx(
                  "flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl px-4 py-3",
                  seances.length ? "bg-[var(--surface-2)]" : "bg-transparent",
                )}
              >
                <span className="w-24 shrink-0 text-sm font-medium">{cap(j)}</span>
                {seances.length === 0 ? (
                  <span className="text-sm text-faint">Repos</span>
                ) : (
                  <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                    {seances.map((s, i) => (
                      <span
                        key={i}
                        className="flex items-center gap-2 rounded-pill bg-[var(--surface)] px-3 py-1 text-xs"
                      >
                        <span>{s.type === "force" ? "🤸" : "🏃"}</span>
                        <span className="font-medium">{s.nom}</span>
                        <span className="tnum text-muted">{s.debut} · {s.dureeMin} min</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {vue === semaine && (
          <Link href="/seance" className="mt-5 block">
            <Bouton pleineLargeur>Voir la séance du jour</Bouton>
          </Link>
        )}
      </Carte>

      {/* --------------------------- Ajustements -------------------------- */}
      {donneesSemaine.alertes.length > 0 && (
        <Carte className="p-6">
          <h2 className="mb-3 font-bold">Arbitrages du moteur</h2>
          <ul className="space-y-2">
            {donneesSemaine.alertes.map((a, i) => (
              <li key={i} className="text-sm leading-relaxed text-muted text-pretty">
                • {a}
              </li>
            ))}
          </ul>
        </Carte>
      )}

      <Carte className="p-6">
        <h2 className="mb-3 font-bold">Réglages du cycle</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/profil">
            <Bouton variante="fantome">Modifier mon profil</Bouton>
          </Link>
          <Link href="/parametres">
            <Bouton variante="fantome">Changer de programme</Bouton>
          </Link>
        </div>
      </Carte>
    </div>
  );
}
