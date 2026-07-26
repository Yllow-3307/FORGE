"use client";

/**
 * synchro.ts — Synchronisation du journal et des skills avec Supabase.
 *
 * Principe : le stockage local reste la source d'écriture immédiate — c'est
 * lui qui rend l'application utilisable hors connexion et sans compte. La
 * synchronisation vient ensuite, en arrière-plan.
 *
 * Résolution des conflits : la valeur la plus récente gagne, journée par
 * journée. Un jour modifié sur deux appareils n'est pas fusionné champ par
 * champ — ce serait fragile pour un gain nul en usage réel, où l'on saisit
 * ses repas depuis un seul téléphone.
 */

import { supabase } from "./stockage";
import {
  lireJournal, lireSkills, type JournalJour, type ProgresSkill,
} from "./suivi";

const CLE_JOURNAL = "forge:journal";
const CLE_SKILLS = "forge:skills";
const CLE_DERNIERE_SYNCHRO = "forge:derniere-synchro";

/** Horodatage local d'une journée, pour arbitrer les conflits. */
interface JourHorodate extends JournalJour {
  majLe?: string;
}

function ecrireLocal<T>(cle: string, valeur: T): void {
  try {
    localStorage.setItem(cle, JSON.stringify(valeur));
    window.dispatchEvent(new CustomEvent("forge:maj", { detail: cle }));
  } catch {
    // Quota dépassé : la synchronisation distante reste la copie de secours.
  }
}

export function derniereSynchro(): Date | null {
  try {
    const v = localStorage.getItem(CLE_DERNIERE_SYNCHRO);
    return v ? new Date(v) : null;
  } catch {
    return null;
  }
}

export interface ResultatSynchro {
  ok: boolean;
  message: string;
  joursEnvoyes: number;
  joursRecus: number;
  skillsSynchronises: number;
}

/**
 * Synchronise dans les deux sens le journal et les skills d'une fiche.
 * Sans compte ou hors connexion, la fonction ne fait rien et le signale.
 */
export async function synchroniser(ficheId: string): Promise<ResultatSynchro> {
  const vide: ResultatSynchro = {
    ok: false, message: "", joursEnvoyes: 0, joursRecus: 0, skillsSynchronises: 0,
  };

  const sb = supabase();
  if (!sb) {
    return { ...vide, message: "Synchronisation indisponible : aucun compte configuré." };
  }

  const { data: session } = await sb.auth.getUser();
  if (!session.user) {
    return { ...vide, message: "Connectez-vous pour synchroniser vos données." };
  }

  try {
    // ---------------------------------------------------------- Journal
    const local = lireJournal() as JourHorodate[];
    const { data: distant, error: erreurLecture } = await sb
      .from("journal")
      .select("*")
      .eq("fiche_id", ficheId);

    if (erreurLecture) throw erreurLecture;

    const parDate = new Map<string, JourHorodate>();
    for (const j of local) parDate.set(j.date, j);

    let recus = 0;
    for (const d of distant ?? []) {
      const localJour = parDate.get(d.date);
      const majDistante = d.maj_le ? new Date(d.maj_le).getTime() : 0;
      const majLocale = localJour?.majLe ? new Date(localJour.majLe).getTime() : 0;

      // La version distante l'emporte si elle est plus récente, ou si la
      // journée est absente en local (nouvel appareil).
      if (!localJour || majDistante > majLocale) {
        parDate.set(d.date, {
          date: d.date,
          repas: d.repas ?? [],
          hydratationMl: d.hydratation_ml ?? 0,
          seanceFaite: d.seance_faite ?? false,
          seanceNom: d.seance_nom ?? undefined,
          accomplissement: d.accomplissement ?? undefined,
          ressenti: d.ressenti ?? undefined,
          energie: d.energie ?? undefined,
          majLe: d.maj_le,
        });
        recus += 1;
      }
    }

    const fusionne = [...parDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
    ecrireLocal(CLE_JOURNAL, fusionne);

    // Envoi des journées locales plus récentes que le distant
    const distantParDate = new Map((distant ?? []).map((d) => [d.date, d]));
    const aEnvoyer = fusionne.filter((j) => {
      const d = distantParDate.get(j.date);
      if (!d) return true;
      const majD = d.maj_le ? new Date(d.maj_le).getTime() : 0;
      const majL = j.majLe ? new Date(j.majLe).getTime() : 0;
      return majL > majD;
    });

    if (aEnvoyer.length) {
      const { error } = await sb.from("journal").upsert(
        aEnvoyer.map((j) => ({
          fiche_id: ficheId,
          date: j.date,
          repas: j.repas,
          hydratation_ml: j.hydratationMl,
          seance_faite: j.seanceFaite,
          seance_nom: j.seanceNom ?? null,
          accomplissement: j.accomplissement ?? null,
          ressenti: j.ressenti ?? null,
          energie: j.energie ?? null,
          maj_le: j.majLe ?? new Date().toISOString(),
        })),
        { onConflict: "fiche_id,date" },
      );
      if (error) throw error;
    }

    // ----------------------------------------------------------- Skills
    const skillsLocaux = lireSkills();
    const { data: skillsDistants, error: erreurSkills } = await sb
      .from("progres_skills")
      .select("*")
      .eq("fiche_id", ficheId);
    if (erreurSkills) throw erreurSkills;

    const parSkill = new Map<string, ProgresSkill>();
    for (const s of skillsLocaux) parSkill.set(s.skillId, s);

    for (const d of skillsDistants ?? []) {
      const localSkill = parSkill.get(d.skill_id);
      // Pour un skill, l'étape la plus avancée fait foi : on ne perd jamais
      // une progression validée sur un autre appareil.
      if (!localSkill || d.etape > localSkill.etape) {
        parSkill.set(d.skill_id, {
          skillId: d.skill_id,
          etape: d.etape,
          actif: d.actif ?? localSkill?.actif ?? false,
          valideeLe: d.validee_le ?? undefined,
          auto: localSkill?.auto,
        });
      }
    }

    const skillsFusionnes = [...parSkill.values()];
    ecrireLocal(CLE_SKILLS, skillsFusionnes);

    if (skillsFusionnes.length) {
      const { error } = await sb.from("progres_skills").upsert(
        skillsFusionnes.map((s) => ({
          fiche_id: ficheId,
          skill_id: s.skillId,
          etape: s.etape,
          actif: s.actif,
          validee_le: s.valideeLe ?? null,
        })),
        { onConflict: "fiche_id,skill_id" },
      );
      if (error) throw error;
    }

    localStorage.setItem(CLE_DERNIERE_SYNCHRO, new Date().toISOString());

    return {
      ok: true,
      message: recus || aEnvoyer.length
        ? `Synchronisé : ${aEnvoyer.length} journée(s) envoyée(s), ${recus} reçue(s).`
        : "Tout est déjà à jour.",
      joursEnvoyes: aEnvoyer.length,
      joursRecus: recus,
      skillsSynchronises: skillsFusionnes.length,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erreur inconnue";
    return {
      ...vide,
      message: `Synchronisation impossible : ${msg}. Vos données restent enregistrées sur cet appareil.`,
    };
  }
}
