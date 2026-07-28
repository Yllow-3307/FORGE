/**
 * stockage.ts — Persistance des profils, programmes et suivi.
 *
 * Deux implémentations derrière une même interface :
 *  - Supabase, si les variables d'environnement sont renseignées ;
 *  - localStorage sinon, pour que l'application reste utilisable
 *    immédiatement, sans compte ni configuration (budget 0 €).
 *
 * Le basculement est automatique : `stockageDistant()` indique le mode actif.
 */

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profil, Programme } from "./moteur/types";
import type { EntreeCharge } from "./suivi";

const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CLE_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function stockageDistant(): boolean {
  return Boolean(URL_SUPABASE && CLE_SUPABASE);
}

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient | null {
  if (!stockageDistant()) return null;
  if (!client) client = createBrowserClient(URL_SUPABASE!, CLE_SUPABASE!);
  return client;
}

/* ------------------------------------------------------------------ Modèles */

export interface FicheClient {
  id: string;
  nom: string;
  profil: Profil;
  creeLe: string;
  majLe: string;
}

/** Une séance cochée par le client, pour le suivi d'observance. */
export interface SeanceRealisee {
  id: string;
  ficheId: string;
  date: string;         // AAAA-MM-JJ
  nomSeance: string;
  ressenti: 1 | 2 | 3 | 4 | 5;
  commentaire?: string;
}

export interface MesurePoids {
  id: string;
  ficheId: string;
  date: string;
  poids: number;
}

const CLE_FICHES = "forge:fiches";
const CLE_SEANCES = "forge:seances";
const CLE_POIDS = "forge:poids";
const CLE_CHARGES = "forge:charges";
const CLE_FILE_ATTENTE = "forge:file-attente";

/* ------------------------------------------------------- Utilitaires locaux */

export function lireLocal<T>(cle: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(cle) ?? "[]") as T[];
  } catch {
    return [];
  }
}

export function ecrireLocal<T>(cle: string, valeur: T[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(cle, JSON.stringify(valeur));
}

/**
 * Borne le temps d'attente d'une requête distante.
 *
 * Un projet Supabase gratuit est mis en pause après une semaine d'inactivité
 * et met plusieurs secondes à se réveiller ; le réseau peut aussi être
 * défaillant. Sans délai maximal, l'interface resterait bloquée sur son
 * indicateur de chargement. On bascule alors sur le cache local, qui contient
 * déjà les données de l'utilisateur.
 */
const DELAI_RESEAU_MS = 2500;

export async function avecDelai<T>(promesse: PromiseLike<T>, secours: T): Promise<T> {
  let minuteur: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promesse,
      new Promise<T>((resoudre) => {
        minuteur = setTimeout(() => resoudre(secours), DELAI_RESEAU_MS);
      }),
    ]);
  } catch {
    return secours;
  } finally {
    if (minuteur) clearTimeout(minuteur);
  }
}

export function identifiant(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function obtenirUtilisateurId(): Promise<string | null> {
  const sb = supabase();
  if (!sb) return null;
  try {
    const { data } = await sb.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------- File d'attente */

export interface ActionAttente {
  id: string;
  type: "fiches" | "seances" | "poids" | "charges";
  action: "enregistrer" | "supprimer";
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  payload: any;
}

export function lireFileAttente(): ActionAttente[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(CLE_FILE_ATTENTE) ?? "[]") as ActionAttente[];
  } catch {
    return [];
  }
}

export function ecrireFileAttente(actions: ActionAttente[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CLE_FILE_ATTENTE, JSON.stringify(actions));
  window.dispatchEvent(new CustomEvent("forge:maj-statut-synchro"));
}

function ajouterAFileAttente(
  type: "fiches" | "seances" | "poids" | "charges",
  action: "enregistrer" | "supprimer",
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  payload: any,
) {
  const file = lireFileAttente();
  const existe = file.some(
    (a) => a.type === type && a.action === action && JSON.stringify(a.payload) === JSON.stringify(payload)
  );
  if (!existe) {
    file.push({
      id: identifiant(),
      type,
      action,
      payload,
    });
    ecrireFileAttente(file);
  }

  const horsLigne = typeof navigator !== "undefined" && !navigator.onLine;
  import("./statut-synchro").then(({ ecrireEtat }) => {
    ecrireEtat({
      statut: horsLigne ? "hors-ligne" : "en-attente",
      elementsEnAttente: file.length,
    });
  }).catch(() => {});

  planifierTraitementFile();
}

let minuteurFile: ReturnType<typeof setTimeout> | null = null;

export function planifierTraitementFile() {
  if (typeof window === "undefined") return;
  if (minuteurFile) clearTimeout(minuteurFile);
  minuteurFile = setTimeout(() => {
    import("./synchro").then(({ declencherSynchroAutomatique }) => {
      void declencherSynchroAutomatique();
    }).catch(() => {});
  }, 3000);
}

export async function tenterEcritureDistant(
  type: "fiches" | "seances" | "poids" | "charges",
  action: "enregistrer" | "supprimer",
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  payload: any,
): Promise<void> {
  const sb = supabase();
  if (!sb) {
    ajouterAFileAttente(type, action, payload);
    return;
  }

  let succes = false;
  try {
    if (action === "enregistrer") {
      if (type === "fiches") {
        const { error } = await avecDelai(
          sb.from("fiches").upsert({
            id: payload.id,
            nom: payload.nom,
            profil: payload.profil,
            cree_le: payload.creeLe,
            maj_le: payload.majLe,
          }),
          { error: new Error("délai dépassé") } as never,
        );
        succes = !error;
      } else if (type === "seances") {
        const { error } = await avecDelai(
          sb.from("seances_realisees").upsert({
            id: payload.id,
            fiche_id: payload.ficheId,
            date: payload.date,
            nom_seance: payload.nomSeance,
            ressenti: payload.ressenti,
            commentaire: payload.commentaire ?? null,
          }),
          { error: new Error("délai dépassé") } as never,
        );
        succes = !error;
      } else if (type === "poids") {
        const { error } = await avecDelai(
          sb.from("mesures_poids").upsert({
            id: payload.id,
            fiche_id: payload.ficheId,
            date: payload.date,
            poids: payload.poids,
          }),
          { error: new Error("délai dépassé") } as never,
        );
        succes = !error;
      } else if (type === "charges") {
        const { error } = await avecDelai(
          sb.from("historique_charges").upsert({
            id: payload.id,
            fiche_id: payload.ficheId,
            exercice: payload.exercice,
            charge: payload.charge,
            reps: payload.reps,
            sets: payload.series ?? null,
            date: payload.date,
            maj_le: payload.majLe ?? new Date().toISOString(),
          }),
          { error: new Error("délai dépassé") } as never,
        );
        succes = !error;
      }
    } else if (action === "supprimer") {
      if (type === "fiches") {
        const { error } = await avecDelai(
          sb.from("fiches").delete().eq("id", payload),
          { error: new Error("délai dépassé") } as never,
        );
        succes = !error;
      } else if (type === "seances") {
        const { error } = await avecDelai(
          sb.from("seances_realisees").delete().eq("id", payload),
          { error: new Error("délai dépassé") } as never,
        );
        succes = !error;
      } else if (type === "poids") {
        const { error } = await avecDelai(
          sb.from("mesures_poids").delete().eq("id", payload),
          { error: new Error("délai dépassé") } as never,
        );
        succes = !error;
      } else if (type === "charges") {
        const { error } = await avecDelai(
          sb.from("historique_charges").delete().eq("id", payload),
          { error: new Error("délai dépassé") } as never,
        );
        succes = !error;
      }
    }
  } catch {
    succes = false;
  }

  if (!succes) {
    ajouterAFileAttente(type, action, payload);
  }
}

export async function viderFileAttente(): Promise<void> {
  const sb = supabase();
  if (!sb) return;

  const session = await sb.auth.getSession();
  if (!session.data.session?.user) return;

  const actions = lireFileAttente();
  if (actions.length === 0) return;

  const restent: ActionAttente[] = [];

  for (const action of actions) {
    let succes = false;
    try {
      if (action.action === "enregistrer") {
        if (action.type === "fiches") {
          const { error } = await avecDelai(
            sb.from("fiches").upsert({
              id: action.payload.id,
              nom: action.payload.nom,
              profil: action.payload.profil,
              cree_le: action.payload.creeLe,
              maj_le: action.payload.majLe,
            }),
            { error: new Error("délai dépassé") } as never,
          );
          succes = !error;
        } else if (action.type === "seances") {
          const { error } = await avecDelai(
            sb.from("seances_realisees").upsert({
              id: action.payload.id,
              fiche_id: action.payload.ficheId,
              date: action.payload.date,
              nom_seance: action.payload.nomSeance,
              ressenti: action.payload.ressenti,
              commentaire: action.payload.commentaire ?? null,
            }),
            { error: new Error("délai dépassé") } as never,
          );
          succes = !error;
        } else if (action.type === "poids") {
          const { error } = await avecDelai(
            sb.from("mesures_poids").upsert({
              id: action.payload.id,
              fiche_id: action.payload.ficheId,
              date: action.payload.date,
              poids: action.payload.poids,
            }),
            { error: new Error("délai dépassé") } as never,
          );
          succes = !error;
        } else if (action.type === "charges") {
          const { error } = await avecDelai(
            sb.from("historique_charges").upsert({
              id: action.payload.id,
              fiche_id: action.payload.ficheId,
              exercice: action.payload.exercice,
              charge: action.payload.charge,
              reps: action.payload.reps,
              sets: action.payload.series ?? null,
              date: action.payload.date,
              maj_le: action.payload.majLe ?? new Date().toISOString(),
            }),
            { error: new Error("délai dépassé") } as never,
          );
          succes = !error;
        }
      } else if (action.action === "supprimer") {
        if (action.type === "fiches") {
          const { error } = await avecDelai(
            sb.from("fiches").delete().eq("id", action.payload),
            { error: new Error("délai dépassé") } as never,
          );
          succes = !error;
        } else if (action.type === "seances") {
          const { error } = await avecDelai(
            sb.from("seances_realisees").delete().eq("id", action.payload),
            { error: new Error("délai dépassé") } as never,
          );
          succes = !error;
        } else if (action.type === "poids") {
          const { error } = await avecDelai(
            sb.from("mesures_poids").delete().eq("id", action.payload),
            { error: new Error("délai dépassé") } as never,
          );
          succes = !error;
        } else if (action.type === "charges") {
          const { error } = await avecDelai(
            sb.from("historique_charges").delete().eq("id", action.payload),
            { error: new Error("délai dépassé") } as never,
          );
          succes = !error;
        }
      }
    } catch {
      succes = false;
    }

    if (!succes) {
      restent.push(action);
    }
  }

  ecrireFileAttente(restent);
}

/* ------------------------------------------------------------------ Fiches */

export async function listerFiches(): Promise<FicheClient[]> {
  const sb = supabase();
  if (sb) {
    const { data, error } = await avecDelai(
      sb.from("fiches").select("*").order("maj_le", { ascending: false }),
      { data: null, error: new Error("délai dépassé") } as never,
    );
    if (!error && data) {
      return data.map((r) => ({
        id: r.id, nom: r.nom, profil: r.profil as Profil,
        creeLe: r.cree_le, majLe: r.maj_le,
      }));
    }
  }
  return lireLocal<FicheClient>(CLE_FICHES)
    .sort((a, b) => (a.majLe < b.majLe ? 1 : -1));
}

export async function lireFiche(id: string): Promise<FicheClient | null> {
  const fiches = await listerFiches();
  return fiches.find((f) => f.id === id) ?? null;
}

export async function enregistrerFiche(profil: Profil, id?: string): Promise<FicheClient> {
  const maintenant = new Date().toISOString();
  const locales = lireLocal<FicheClient>(CLE_FICHES);
  const ficheId = id ?? identifiant();
  const existante = locales.find((f) => f.id === ficheId);
  const fiche: FicheClient = {
    id: ficheId,
    nom: profil.nom || "Client",
    profil,
    creeLe: existante?.creeLe ?? maintenant,
    majLe: maintenant,
  };

  // 1. Écrire localement
  const i = locales.findIndex((f) => f.id === fiche.id);
  if (i >= 0) locales[i] = fiche;
  else locales.push(fiche);
  ecrireLocal(CLE_FICHES, locales);
  window.dispatchEvent(new CustomEvent("forge:maj", { detail: CLE_FICHES }));

  // 2. Écrire distant (fire-and-forget)
  obtenirUtilisateurId().then((userId) => {
    if (userId) {
      void tenterEcritureDistant("fiches", "enregistrer", fiche);
    }
  });

  return fiche;
}

export async function supprimerFiche(id: string): Promise<void> {
  // 1. Écrire localement
  const locales = lireLocal<FicheClient>(CLE_FICHES).filter((f) => f.id !== id);
  ecrireLocal(CLE_FICHES, locales);
  window.dispatchEvent(new CustomEvent("forge:maj", { detail: CLE_FICHES }));

  // 2. Écrire distant (fire-and-forget)
  obtenirUtilisateurId().then((userId) => {
    if (userId) {
      void tenterEcritureDistant("fiches", "supprimer", id);
    }
  });
}

/* ------------------------------------------------------------------ Suivi */

export async function listerSeances(ficheId: string): Promise<SeanceRealisee[]> {
  const sb = supabase();
  if (sb) {
    const { data, error } = await avecDelai(
      sb.from("seances_realisees").select("*").eq("fiche_id", ficheId)
        .order("date", { ascending: false }),
      { data: null, error: new Error("délai dépassé") } as never,
    );
    if (!error && data) {
      return data.map((r) => ({
        id: r.id, ficheId: r.fiche_id, date: r.date,
        nomSeance: r.nom_seance, ressenti: r.ressenti, commentaire: r.commentaire,
      }));
    }
  }
  return lireLocal<SeanceRealisee>(CLE_SEANCES)
    .filter((s) => s.ficheId === ficheId)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function enregistrerSeance(s: Omit<SeanceRealisee, "id">): Promise<SeanceRealisee> {
  const complete: SeanceRealisee = { ...s, id: identifiant() };

  // 1. Écrire localement
  const locales = lireLocal<SeanceRealisee>(CLE_SEANCES);
  locales.push(complete);
  ecrireLocal(CLE_SEANCES, locales);
  window.dispatchEvent(new CustomEvent("forge:maj", { detail: CLE_SEANCES }));

  // 2. Écrire distant (fire-and-forget)
  obtenirUtilisateurId().then((userId) => {
    if (userId) {
      void tenterEcritureDistant("seances", "enregistrer", complete);
    }
  });

  return complete;
}

export async function supprimerSeance(id: string): Promise<void> {
  // 1. Écrire localement
  const locales = lireLocal<SeanceRealisee>(CLE_SEANCES).filter((s) => s.id !== id);
  ecrireLocal(CLE_SEANCES, locales);
  window.dispatchEvent(new CustomEvent("forge:maj", { detail: CLE_SEANCES }));

  // 2. Écrire distant (fire-and-forget)
  obtenirUtilisateurId().then((userId) => {
    if (userId) {
      void tenterEcritureDistant("seances", "supprimer", id);
    }
  });
}

export async function listerPoids(ficheId: string): Promise<MesurePoids[]> {
  const sb = supabase();
  if (sb) {
    const { data, error } = await avecDelai(
      sb.from("mesures_poids").select("*").eq("fiche_id", ficheId)
        .order("date", { ascending: true }),
      { data: null, error: new Error("délai dépassé") } as never,
    );
    if (!error && data) {
      return data.map((r) => ({ id: r.id, ficheId: r.fiche_id, date: r.date, poids: r.poids }));
    }
  }
  return lireLocal<MesurePoids>(CLE_POIDS)
    .filter((m) => m.ficheId === ficheId)
    .sort((a, b) => (a.date > b.date ? 1 : -1));
}

export async function enregistrerPoids(m: Omit<MesurePoids, "id">): Promise<MesurePoids> {
  const complete: MesurePoids = { ...m, id: identifiant() };

  // 1. Écrire localement
  const locales = lireLocal<MesurePoids>(CLE_POIDS);
  const i = locales.findIndex((x) => x.ficheId === m.ficheId && x.date === m.date);
  if (i >= 0) locales[i] = complete;
  else locales.push(complete);
  ecrireLocal(CLE_POIDS, locales);
  window.dispatchEvent(new CustomEvent("forge:maj", { detail: CLE_POIDS }));

  // 2. Écrire distant (fire-and-forget)
  obtenirUtilisateurId().then((userId) => {
    if (userId) {
      void tenterEcritureDistant("poids", "enregistrer", complete);
    }
  });

  return complete;
}

export async function supprimerPoids(id: string): Promise<void> {
  // 1. Écrire localement
  const locales = lireLocal<MesurePoids>(CLE_POIDS).filter((m) => m.id !== id);
  ecrireLocal(CLE_POIDS, locales);
  window.dispatchEvent(new CustomEvent("forge:maj", { detail: CLE_POIDS }));

  // 2. Écrire distant (fire-and-forget)
  obtenirUtilisateurId().then((userId) => {
    if (userId) {
      void tenterEcritureDistant("poids", "supprimer", id);
    }
  });
}

/* ------------------------------------------------------------- Charges */

export async function listerCharges(ficheId: string): Promise<EntreeCharge[]> {
  const sb = supabase();
  if (sb) {
    const { data, error } = await avecDelai(
      sb.from("historique_charges").select("*").eq("fiche_id", ficheId)
        .order("date", { ascending: false }),
      { data: null, error: new Error("délai dépassé") } as never,
    );
    if (!error && data) {
      return data.map((r) => ({
        id: r.id,
        ficheId: r.fiche_id,
        date: r.date,
        exercice: r.exercice,
        charge: Number(r.charge),
        reps: r.reps,
        series: r.sets ?? undefined,
        majLe: r.maj_le,
      }));
    }
  }
  return lireLocal<EntreeCharge>(CLE_CHARGES)
    .filter((c) => !c.ficheId || c.ficheId === ficheId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function enregistrerCharge(e: Omit<EntreeCharge, "id"> & { ficheId: string }): Promise<EntreeCharge> {
  const complete: EntreeCharge = {
    ...e,
    id: identifiant(),
    majLe: new Date().toISOString(),
  };

  const locales = lireLocal<EntreeCharge>(CLE_CHARGES);
  const i = locales.findIndex((x) => x.ficheId === complete.ficheId && x.exercice === complete.exercice && x.date === complete.date);
  if (i >= 0) locales[i] = complete;
  else locales.push(complete);
  ecrireLocal(CLE_CHARGES, locales);

  window.dispatchEvent(new CustomEvent("forge:maj", { detail: CLE_CHARGES }));

  obtenirUtilisateurId().then((userId) => {
    if (userId) {
      void tenterEcritureDistant("charges", "enregistrer", complete);
    }
  });

  return complete;
}

export async function supprimerCharge(id: string): Promise<void> {
  const locales = lireLocal<EntreeCharge>(CLE_CHARGES).filter((c) => c.id !== id);
  ecrireLocal(CLE_CHARGES, locales);

  window.dispatchEvent(new CustomEvent("forge:maj", { detail: CLE_CHARGES }));

  obtenirUtilisateurId().then((userId) => {
    if (userId) {
      void tenterEcritureDistant("charges", "supprimer", id);
    }
  });
}

/* ------------------------------------------------------- Export et import */

export function exporterTout(): string {
  return JSON.stringify(
    {
      version: 1,
      exporteLe: new Date().toISOString(),
      fiches: lireLocal<FicheClient>(CLE_FICHES),
      seances: lireLocal<SeanceRealisee>(CLE_SEANCES),
      poids: lireLocal<MesurePoids>(CLE_POIDS),
      charges: lireLocal<EntreeCharge>(CLE_CHARGES),
    },
    null, 2,
  );
}

export function importerTout(json: string): { fiches: number; seances: number; poids: number; charges: number } {
  const data = JSON.parse(json);
  if (data.fiches) ecrireLocal(CLE_FICHES, data.fiches);
  if (data.seances) ecrireLocal(CLE_SEANCES, data.seances);
  if (data.poids) ecrireLocal(CLE_POIDS, data.poids);
  if (data.charges) ecrireLocal(CLE_CHARGES, data.charges);
  return {
    fiches: data.fiches?.length ?? 0,
    seances: data.seances?.length ?? 0,
    poids: data.poids?.length ?? 0,
    charges: data.charges?.length ?? 0,
  };
}

/** Télécharge un contenu texte côté navigateur. */
export function telecharger(contenu: string, nomFichier: string, type = "application/json") {
  const blob = new Blob([contenu], { type: `${type};charset=utf-8` });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nomFichier;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 200);
}

export function slugNom(n: string): string {
  return String(n)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "client";
}

/** Programme complet exporté au format JSON lisible. */
export function exporterProgramme(prog: Programme): void {
  telecharger(
    JSON.stringify(prog, null, 2),
    `programme-${slugNom(prog.profil.nom)}.json`,
  );
}
