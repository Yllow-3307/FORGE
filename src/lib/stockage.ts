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

/* ------------------------------------------------------- Utilitaires locaux */

function lireLocal<T>(cle: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(cle) ?? "[]") as T[];
  } catch {
    return [];
  }
}

function ecrireLocal<T>(cle: string, valeur: T[]): void {
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

async function avecDelai<T>(promesse: PromiseLike<T>, secours: T): Promise<T> {
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
    // En cas d'erreur réseau, on retombe sur le cache local plutôt que d'échouer.
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
  const fiche: FicheClient = {
    id: id ?? identifiant(),
    nom: profil.nom || "Client",
    profil,
    creeLe: maintenant,
    majLe: maintenant,
  };

  const sb = supabase();
  if (sb) {
    const { data: session } = await avecDelai(
      sb.auth.getUser(),
      { data: { user: null } } as never,
    );
    const { error } = await avecDelai(sb.from("fiches").upsert({
      id: fiche.id,
      nom: fiche.nom,
      profil: fiche.profil,
      cree_le: fiche.creeLe,
      maj_le: fiche.majLe,
      utilisateur_id: session.user?.id ?? null,
    }), { error: new Error("délai dépassé") } as never);
    if (!error) return fiche;
  }

  const locales = lireLocal<FicheClient>(CLE_FICHES);
  const i = locales.findIndex((f) => f.id === fiche.id);
  if (i >= 0) locales[i] = { ...fiche, creeLe: locales[i].creeLe };
  else locales.push(fiche);
  ecrireLocal(CLE_FICHES, locales);
  return fiche;
}

export async function supprimerFiche(id: string): Promise<void> {
  const sb = supabase();
  if (sb) {
    const { error } = await sb.from("fiches").delete().eq("id", id);
    if (!error) return;
  }
  ecrireLocal(CLE_FICHES, lireLocal<FicheClient>(CLE_FICHES).filter((f) => f.id !== id));
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
  const sb = supabase();
  if (sb) {
    const { error } = await sb.from("seances_realisees").insert({
      id: complete.id, fiche_id: complete.ficheId, date: complete.date,
      nom_seance: complete.nomSeance, ressenti: complete.ressenti,
      commentaire: complete.commentaire ?? null,
    });
    if (!error) return complete;
  }
  const locales = lireLocal<SeanceRealisee>(CLE_SEANCES);
  locales.push(complete);
  ecrireLocal(CLE_SEANCES, locales);
  return complete;
}

export async function supprimerSeance(id: string): Promise<void> {
  const sb = supabase();
  if (sb) {
    const { error } = await sb.from("seances_realisees").delete().eq("id", id);
    if (!error) return;
  }
  ecrireLocal(CLE_SEANCES, lireLocal<SeanceRealisee>(CLE_SEANCES).filter((s) => s.id !== id));
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
  const sb = supabase();
  if (sb) {
    const { error } = await sb.from("mesures_poids").insert({
      id: complete.id, fiche_id: complete.ficheId, date: complete.date, poids: complete.poids,
    });
    if (!error) return complete;
  }
  const locales = lireLocal<MesurePoids>(CLE_POIDS);
  // Une seule pesée par jour : la plus récente remplace la précédente.
  const i = locales.findIndex((x) => x.ficheId === m.ficheId && x.date === m.date);
  if (i >= 0) locales[i] = complete;
  else locales.push(complete);
  ecrireLocal(CLE_POIDS, locales);
  return complete;
}

export async function supprimerPoids(id: string): Promise<void> {
  const sb = supabase();
  if (sb) {
    const { error } = await avecDelai(
      sb.from("mesures_poids").delete().eq("id", id),
      { error: new Error("délai dépassé") } as never,
    );
    if (!error) return;
  }
  ecrireLocal(CLE_POIDS, lireLocal<MesurePoids>(CLE_POIDS).filter((m) => m.id !== id));
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
    },
    null, 2,
  );
}

export function importerTout(json: string): { fiches: number; seances: number; poids: number } {
  const data = JSON.parse(json);
  if (data.fiches) ecrireLocal(CLE_FICHES, data.fiches);
  if (data.seances) ecrireLocal(CLE_SEANCES, data.seances);
  if (data.poids) ecrireLocal(CLE_POIDS, data.poids);
  return {
    fiches: data.fiches?.length ?? 0,
    seances: data.seances?.length ?? 0,
    poids: data.poids?.length ?? 0,
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
