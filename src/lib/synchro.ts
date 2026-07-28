"use client";

/**
 * synchro.ts — Synchronisation du journal, des skills et des charges avec Supabase.
 *
 * Principe : le stockage local reste la source d'écriture immédiate — c'est
 * lui qui rend l'application utilisable hors connexion et sans compte. La
 * synchronisation vient ensuite, en arrière-plan.
 *
 * Résolution des conflits :
 *  - Journal : fusion champ par champ sur repas, hydratationMl et seanceFaite.
 *    Arbitrage basé sur les cotes de mise à jour locales (cotes_maj) vs le timestamp de
 *    la version distante (maj_le). Choix technique documenté : dernier écrivain par champ,
 *    ce qui évite de perdre des saisies sur des appareils différents pour une même journée.
 *  - Skills : l'étape la plus avancée l'emporte toujours.
 *  - Charges : contrainte UNIQUE(fiche_id, exercice, date) -> upsert, le maj_le le plus récent l'emporte.
 *
 * Promotion invité -> compte : au moment de la création d'un compte, toutes les données
 * locales sont poussées vers le cloud avant le premier tirage cloud pour éviter toute écrasement.
 */

import { supabase, type FicheClient, type SeanceRealisee, type MesurePoids } from "./stockage";
import {
  lireJournal, lireSkills, lireCharges, type JournalJour, type ProgresSkill, type EntreeCharge, activeFicheId
} from "./suivi";

const CLE_JOURNAL = "forge:journal";
const CLE_SKILLS = "forge:skills";
const CLE_CHARGES = "forge:charges";
const CLE_DERNIERE_SYNCHRO = "forge:derniere-synchro";

/** Horodatage local d'une journée, pour arbitrer les conflits. */
interface JourHorodate extends JournalJour {
  majLe?: string;
  cotes_maj?: {
    repas?: string;
    hydratationMl?: string;
    seanceFaite?: string;
  };
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
  chargesEnvoyees?: number;
  chargesRecues?: number;
}

/**
 * Réalise une fusion champ par champ pour une journée donnée.
 */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
function mergeJour(local: JourHorodate, distant: any): { merged: JourHorodate; localModifie: boolean; distantModifie: boolean } {
  const majDistante = distant.maj_le ? new Date(distant.maj_le).getTime() : 0;
  const majLocale = local.majLe ? new Date(local.majLe).getTime() : 0;

  const cotes_maj = local.cotes_maj ?? {};
  const tRepasL = cotes_maj.repas ? new Date(cotes_maj.repas).getTime() : majLocale;
  const tHydraL = cotes_maj.hydratationMl ? new Date(cotes_maj.hydratationMl).getTime() : majLocale;
  const tSeanceL = cotes_maj.seanceFaite ? new Date(cotes_maj.seanceFaite).getTime() : majLocale;

  const repasNouveauD = majDistante > tRepasL;
  const hydraNouveauD = majDistante > tHydraL;
  const seanceNouveauD = majDistante > tSeanceL;

  let localModifie = false;
  let distantModifie = false;

  const mergedRepas = repasNouveauD ? (distant.repas ?? []) : local.repas;
  if (repasNouveauD) localModifie = true;
  else if (tRepasL > majDistante) distantModifie = true;

  const mergedHydra = hydraNouveauD ? (distant.hydratation_ml ?? 0) : local.hydratationMl;
  if (hydraNouveauD) localModifie = true;
  else if (tHydraL > majDistante) distantModifie = true;

  const mergedSeance = seanceNouveauD ? (distant.seance_faite ?? false) : local.seanceFaite;
  if (seanceNouveauD) localModifie = true;
  else if (tSeanceL > majDistante) distantModifie = true;

  const otherNouveauD = majDistante > majLocale;
  if (otherNouveauD) localModifie = true;
  else if (majLocale > majDistante) distantModifie = true;

  const mergedSeanceNom = otherNouveauD ? (distant.seance_nom ?? undefined) : local.seanceNom;
  const mergedAccomplissement = otherNouveauD ? (distant.accomplissement ?? undefined) : local.accomplissement;
  const mergedRessenti = otherNouveauD ? (distant.ressenti ?? undefined) : local.ressenti;
  const mergedEnergie = otherNouveauD ? (distant.energie ?? undefined) : local.energie;

  const nvMajLe = new Date(Math.max(majLocale, majDistante, tRepasL, tHydraL, tSeanceL)).toISOString();

  const nvCotesRepas = repasNouveauD ? distant.maj_le : (cotes_maj.repas ?? local.majLe ?? nvMajLe);
  const nvCotesHydra = hydraNouveauD ? distant.maj_le : (cotes_maj.hydratationMl ?? local.majLe ?? nvMajLe);
  const nvCotesSeance = seanceNouveauD ? distant.maj_le : (cotes_maj.seanceFaite ?? local.majLe ?? nvMajLe);

  const merged: JourHorodate = {
    date: local.date,
    repas: mergedRepas,
    hydratationMl: mergedHydra,
    seanceFaite: mergedSeance,
    seanceNom: mergedSeanceNom,
    accomplissement: mergedAccomplissement,
    ressenti: mergedRessenti,
    energie: mergedEnergie,
    majLe: nvMajLe,
    cotes_maj: {
      repas: nvCotesRepas,
      hydratationMl: nvCotesHydra,
      seanceFaite: nvCotesSeance,
    },
  };

  return { merged, localModifie, distantModifie };
}

/**
 * Pousse TOUTES les données locales d'invité vers le cloud avant le premier tirage cloud (fusion de promotion).
 */
export async function fusionnerPromotion(ficheId: string): Promise<number> {
  const sb = supabase();
  if (!sb) return 0;

  const { data: session } = await sb.auth.getUser();
  if (!session?.user) return 0;

  let totalElements = 0;

  try {
    // 1. Fiches
    const fiches = JSON.parse(localStorage.getItem("forge:fiches") ?? "[]") as FicheClient[];
    if (fiches.length) {
      const { error } = await sb.from("fiches").upsert(
        fiches.map((f) => ({
          id: f.id,
          nom: f.nom,
          profil: f.profil,
          cree_le: f.creeLe,
          maj_le: f.majLe,
          utilisateur_id: session.user.id,
        }))
      );
      if (!error) totalElements += fiches.length;
    }

    // 2. Séances
    const seances = JSON.parse(localStorage.getItem("forge:seances") ?? "[]") as SeanceRealisee[];
    if (seances.length) {
      const { error } = await sb.from("seances_realisees").upsert(
        seances.map((s) => ({
          id: s.id,
          fiche_id: s.ficheId,
          date: s.date,
          nom_seance: s.nomSeance,
          ressenti: s.ressenti,
          commentaire: s.commentaire ?? null,
        }))
      );
      if (!error) totalElements += seances.length;
    }

    // 3. Poids
    const poids = JSON.parse(localStorage.getItem("forge:poids") ?? "[]") as MesurePoids[];
    if (poids.length) {
      const { error } = await sb.from("mesures_poids").upsert(
        poids.map((p) => ({
          id: p.id,
          fiche_id: p.ficheId,
          date: p.date,
          poids: p.poids,
        }))
      );
      if (!error) totalElements += poids.length;
    }

    // 4. Journal
    const journal = lireJournal();
    if (journal.length) {
      const { error } = await sb.from("journal").upsert(
        journal.map((j) => ({
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
        }))
      );
      if (!error) totalElements += journal.length;
    }

    // 5. Skills
    const skills = lireSkills();
    if (skills.length) {
      const { error } = await sb.from("progres_skills").upsert(
        skills.map((s) => ({
          fiche_id: ficheId,
          skill_id: s.skillId,
          etape: s.etape,
          actif: s.actif,
          validee_le: s.valideeLe ?? null,
        }))
      );
      if (!error) totalElements += skills.length;
    }

    // 6. Charges
    const charges = lireCharges();
    if (charges.length) {
      const { error } = await sb.from("historique_charges").upsert(
        charges.map((c) => ({
          id: c.id,
          fiche_id: ficheId,
          exercice: c.exercice,
          charge: c.charge,
          reps: c.reps,
          sets: c.series ?? null,
          date: c.date,
          maj_le: c.majLe ?? new Date().toISOString(),
        }))
      );
      if (!error) totalElements += charges.length;
    }

    return totalElements;
  } catch {
    return 0;
  }
}

/**
 * Déclenche une synchronisation automatique complète de l'application.
 */
export async function declencherSynchroAutomatique(): Promise<void> {
  const fId = activeFicheId();
  if (fId) {
    await synchroniser(fId);
  }
}

/**
 * Synchronise dans les deux sens le journal, les skills et les charges d'une fiche.
 * Sans compte ou hors connexion, la fonction ne fait rien et le signale.
 */
export async function synchroniser(ficheId: string): Promise<ResultatSynchro> {
  const vide: ResultatSynchro = {
    ok: false, message: "", joursEnvoyes: 0, joursRecus: 0, skillsSynchronises: 0, chargesEnvoyees: 0, chargesRecues: 0,
  };

  const sb = supabase();
  if (!sb) {
    return { ...vide, message: "Synchronisation indisponible : aucun compte configuré." };
  }

  const horsLigne = typeof navigator !== "undefined" && !navigator.onLine;
  if (horsLigne) {
    import("./statut-synchro").then(({ ecrireEtat }) => {
      ecrireEtat({ statut: "hors-ligne" });
    }).catch(() => {});
    return { ...vide, message: "Hors connexion — vos données restent enregistrées sur cet appareil." };
  }

  const { data: session } = await sb.auth.getUser();
  if (!session?.user) {
    return { ...vide, message: "Connectez-vous pour synchroniser vos données." };
  }

  // Marquer statut comme en cours
  import("./statut-synchro").then(({ ecrireEtat }) => {
    ecrireEtat({ statut: "en-cours" });
  }).catch(() => {});

  try {
    let conflitDetecte = false;
    const dSynchro = derniereSynchro();
    const lastSynchro = dSynchro ? dSynchro.getTime() : 0;

    // --- PROMOTION DES INVITÉS ---
    const estPremierSync = !localStorage.getItem(CLE_DERNIERE_SYNCHRO);
    if (estPremierSync) {
      const n = await fusionnerPromotion(ficheId);
      if (n > 0) {
        window.dispatchEvent(new CustomEvent("forge:synchro-promotion", { detail: n }));
      }
    }

    // ---------------------------------------------------------- Journal
    const localJournal = lireJournal() as JourHorodate[];
    const { data: distantJournal, error: erreurLecture } = await sb
      .from("journal")
      .select("*")
      .eq("fiche_id", ficheId);

    if (erreurLecture) throw erreurLecture;

    const parDate = new Map<string, JourHorodate>();
    for (const j of localJournal) parDate.set(j.date, j);

    let recus = 0;
    let localModifieJournal = false;

    for (const d of distantJournal ?? []) {
      const localJour = parDate.get(d.date);

      if (!localJour) {
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
          cotes_maj: {
            repas: d.maj_le,
            hydratationMl: d.maj_le,
            seanceFaite: d.maj_le,
          },
        });
        recus += 1;
        localModifieJournal = true;
      } else {
        const { merged, localModifie } = mergeJour(localJour, d);
        if (localModifie) {
          parDate.set(d.date, merged);
          localModifieJournal = true;
          recus += 1;

          // Détection d'un vrai conflit (modifications simultanées)
          const majDistante = d.maj_le ? new Date(d.maj_le).getTime() : 0;
          const cotes = localJour.cotes_maj ?? {};
          const tRepasL = cotes.repas ? new Date(cotes.repas).getTime() : (localJour.majLe ? new Date(localJour.majLe).getTime() : 0);
          const tHydraL = cotes.hydratationMl ? new Date(cotes.hydratationMl).getTime() : (localJour.majLe ? new Date(localJour.majLe).getTime() : 0);
          const tSeanceL = cotes.seanceFaite ? new Date(cotes.seanceFaite).getTime() : (localJour.majLe ? new Date(localJour.majLe).getTime() : 0);

          if (
            (tRepasL > lastSynchro && majDistante > tRepasL && JSON.stringify(localJour.repas) !== JSON.stringify(d.repas)) ||
            (tHydraL > lastSynchro && majDistante > tHydraL && localJour.hydratationMl !== d.hydratation_ml) ||
            (tSeanceL > lastSynchro && majDistante > tSeanceL && localJour.seanceFaite !== d.seance_faite)
          ) {
            conflitDetecte = true;
          }
        }
      }
    }

    const fusionneJournal = [...parDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
    if (localModifieJournal) {
      ecrireLocal(CLE_JOURNAL, fusionneJournal);
    }

    const distantParDate = new Map((distantJournal ?? []).map((d) => [d.date, d]));
    const aEnvoyer = fusionneJournal.filter((j) => {
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

    let localModifieSkills = false;
    for (const d of skillsDistants ?? []) {
      const localSkill = parSkill.get(d.skill_id);
      if (!localSkill || d.etape > localSkill.etape) {
        parSkill.set(d.skill_id, {
          skillId: d.skill_id,
          etape: d.etape,
          actif: d.actif ?? localSkill?.actif ?? false,
          valideeLe: d.validee_le ?? undefined,
          auto: localSkill?.auto,
        });
        localModifieSkills = true;
      }
    }

    const skillsFusionnes = [...parSkill.values()];
    if (localModifieSkills) {
      ecrireLocal(CLE_SKILLS, skillsFusionnes);
    }

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

    // ----------------------------------------------------------- Charges
    const localCharges = lireCharges();
    const { data: distantCharges, error: erreurCharges } = await sb
      .from("historique_charges")
      .select("*")
      .eq("fiche_id", ficheId);

    if (erreurCharges) throw erreurCharges;

    const parExoDate = new Map<string, EntreeCharge>();
    for (const c of localCharges) {
      if (!c.ficheId || c.ficheId === ficheId) {
        parExoDate.set(`${c.exercice}|${c.date}`, c);
      }
    }

    let chargesRecuesCount = 0;
    let localModifieCharges = false;

    for (const d of distantCharges ?? []) {
      const cle = `${d.exercice}|${d.date}`;
      const localCharge = parExoDate.get(cle);
      const majDistante = d.maj_le ? new Date(d.maj_le).getTime() : 0;
      const majLocale = localCharge?.majLe ? new Date(localCharge.majLe).getTime() : 0;

      if (!localCharge || majDistante > majLocale) {
        if (localCharge && majLocale > lastSynchro) {
          conflitDetecte = true;
        }
        parExoDate.set(cle, {
          id: d.id,
          ficheId: ficheId,
          date: d.date,
          exercice: d.exercice,
          charge: Number(d.charge),
          reps: d.reps,
          series: d.sets ?? undefined,
          majLe: d.maj_le,
        });
        chargesRecuesCount += 1;
        localModifieCharges = true;
      }
    }

    const chargesAutresFiches = localCharges.filter((c) => c.ficheId && c.ficheId !== ficheId);
    const chargesFusionnees = [...chargesAutresFiches, ...parExoDate.values()];
    if (localModifieCharges) {
      ecrireLocal(CLE_CHARGES, chargesFusionnees);
    }

    const distantParExoDate = new Map((distantCharges ?? []).map((d) => [`${d.exercice}|${d.date}`, d]));
    const chargesAEnvoyer = [...parExoDate.values()].filter((c) => {
      const d = distantParExoDate.get(`${c.exercice}|${c.date}`);
      if (!d) return true;
      const majD = d.maj_le ? new Date(d.maj_le).getTime() : 0;
      const majL = c.majLe ? new Date(c.majLe).getTime() : 0;
      return majL > majD;
    });

    if (chargesAEnvoyer.length) {
      const { error } = await sb.from("historique_charges").upsert(
        chargesAEnvoyer.map((c) => ({
          id: c.id,
          fiche_id: ficheId,
          exercice: c.exercice,
          charge: c.charge,
          reps: c.reps,
          sets: c.series ?? null,
          date: c.date,
          maj_le: c.majLe ?? new Date().toISOString(),
        })),
        { onConflict: "fiche_id,exercice,date" },
      );
      if (error) throw error;
    }

    localStorage.setItem(CLE_DERNIERE_SYNCHRO, new Date().toISOString());

    if (conflitDetecte) {
      window.dispatchEvent(new CustomEvent("forge:synchro-conflit"));
    }

    // Rattrapage de la file d'attente
    const { viderFileAttente, lireFileAttente } = await import("./stockage");
    await viderFileAttente();
    const file = lireFileAttente();

    import("./statut-synchro").then(({ ecrireEtat }) => {
      ecrireEtat({
        statut: file.length > 0 ? "en-attente" : "synchronise",
        derniereSynchro: new Date().toISOString(),
        elementsEnAttente: file.length,
      });
    }).catch(() => {});

    return {
      ok: true,
      message: recus || aEnvoyer.length || chargesAEnvoyer.length || chargesRecuesCount
        ? `Synchronisé.`
        : "Tout est déjà à jour.",
      joursEnvoyes: aEnvoyer.length,
      joursRecus: recus,
      skillsSynchronises: skillsFusionnes.length,
      chargesEnvoyees: chargesAEnvoyer.length,
      chargesRecues: chargesRecuesCount,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erreur inconnue";

    const { lireFileAttente } = await import("./stockage");
    const file = lireFileAttente();

    import("./statut-synchro").then(({ ecrireEtat }) => {
      ecrireEtat({
        statut: "en-attente",
        elementsEnAttente: file.length,
      });
    }).catch(() => {});

    return {
      ...vide,
      message: `Synchronisation impossible : ${msg}. Vos données restent enregistrées sur cet appareil.`,
    };
  }
}
