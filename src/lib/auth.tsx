"use client";

/**
 * auth.tsx — Session utilisateur.
 *
 * Deux modes, transparents pour le reste de l'application :
 *   - Supabase configuré : véritable authentification par e-mail ;
 *   - sinon : mode local, sans compte, les données restant sur l'appareil.
 *
 * Le second n'est pas un pis-aller : c'est le mode par défaut, qui permet
 * d'utiliser l'application immédiatement, sans inscription ni serveur.
 */

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { stockageDistant, supabase } from "./stockage";

interface EtatAuth {
  /** Utilisateur connecté, ou null en mode local. */
  utilisateur: User | null;
  session: Session | null;
  chargement: boolean;
  /** true si Supabase est configuré : conditionne l'affichage des écrans de compte. */
  authDisponible: boolean;
  connexion: (email: string, motDePasse: string) => Promise<{ erreur?: string }>;
  inscription: (email: string, motDePasse: string) => Promise<{ erreur?: string; confirmation?: boolean }>;
  lienMagique: (email: string) => Promise<{ erreur?: string }>;
  deconnexion: () => Promise<void>;
  motDePasseOublie: (email: string) => Promise<{ erreur?: string }>;
  changerMotDePasse: (nouveau: string) => Promise<{ erreur?: string }>;
}

const ContexteAuth = createContext<EtatAuth | null>(null);

/** Traduit les messages d'erreur de Supabase, qui sont en anglais. */
function traduire(message: string): string {
  const table: Record<string, string> = {
    "Invalid login credentials": "Adresse e-mail ou mot de passe incorrect.",
    "Email not confirmed": "Adresse e-mail non confirmée : vérifiez votre boîte de réception.",
    "User already registered": "Un compte existe déjà avec cette adresse.",
    "Password should be at least 6 characters":
      "Le mot de passe doit contenir au moins 6 caractères.",
    "Unable to validate email address: invalid format":
      "Le format de l'adresse e-mail est invalide.",
    "For security purposes, you can only request this after 60 seconds":
      "Pour des raisons de sécurité, patientez une minute avant de réessayer.",
  };
  return table[message] ?? message;
}

export function FournisseurAuth({ children }: { children: React.ReactNode }) {
  const authDisponible = stockageDistant();
  const [session, setSession] = useState<Session | null>(null);
  // En mode local, il n'y a aucune session à récupérer : l'état initial est
  // déjà définitif, inutile de passer par un état « en chargement ».
  const [chargement, setChargement] = useState(authDisponible);

  useEffect(() => {
    const sb = supabase();
    if (!sb) return;

    let annule = false;
    sb.auth.getSession().then(({ data }) => {
      if (annule) return;
      setSession(data.session);
      setChargement(false);
    });

    // Supabase peut invoquer ce rappel de façon synchrone pendant l'effet.
    // On diffère la mise à jour d'un tick pour éviter un rendu en cascade.
    const { data: abonnement } = sb.auth.onAuthStateChange((_evenement, s) => {
      queueMicrotask(() => {
        if (annule) return;
        setSession(s);
        setChargement(false);
      });
    });

    return () => {
      annule = true;
      abonnement.subscription.unsubscribe();
    };
  }, []);

  const connexion = useCallback(async (email: string, motDePasse: string) => {
    const sb = supabase();
    if (!sb) return { erreur: "Authentification indisponible en mode local." };
    const { error } = await sb.auth.signInWithPassword({ email, password: motDePasse });
    return error ? { erreur: traduire(error.message) } : {};
  }, []);

  const inscription = useCallback(async (email: string, motDePasse: string) => {
    const sb = supabase();
    if (!sb) return { erreur: "Authentification indisponible en mode local." };
    const { data, error } = await sb.auth.signUp({
      email,
      password: motDePasse,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    if (error) return { erreur: traduire(error.message) };
    // Session absente : le projet exige une confirmation par e-mail.
    return { confirmation: !data.session };
  }, []);

  const lienMagique = useCallback(async (email: string) => {
    const sb = supabase();
    if (!sb) return { erreur: "Authentification indisponible en mode local." };
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    return error ? { erreur: traduire(error.message) } : {};
  }, []);

  const deconnexion = useCallback(async () => {
    const sb = supabase();
    if (sb) await sb.auth.signOut();
    setSession(null);
  }, []);

  const motDePasseOublie = useCallback(async (email: string) => {
    const sb = supabase();
    if (!sb) return { erreur: "Authentification indisponible en mode local." };
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/compte`,
    });
    return error ? { erreur: traduire(error.message) } : {};
  }, []);

  const changerMotDePasse = useCallback(async (nouveau: string) => {
    const sb = supabase();
    if (!sb) return { erreur: "Authentification indisponible en mode local." };
    const { error } = await sb.auth.updateUser({ password: nouveau });
    return error ? { erreur: traduire(error.message) } : {};
  }, []);

  const valeur = useMemo<EtatAuth>(
    () => ({
      utilisateur: session?.user ?? null,
      session,
      chargement,
      authDisponible,
      connexion,
      inscription,
      lienMagique,
      deconnexion,
      motDePasseOublie,
      changerMotDePasse,
    }),
    [session, chargement, authDisponible, connexion, inscription, lienMagique,
      deconnexion, motDePasseOublie, changerMotDePasse],
  );

  return <ContexteAuth.Provider value={valeur}>{children}</ContexteAuth.Provider>;
}

export function useAuth(): EtatAuth {
  const ctx = useContext(ContexteAuth);
  if (!ctx) throw new Error("useAuth doit être utilisé dans un FournisseurAuth.");
  return ctx;
}
