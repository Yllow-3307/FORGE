"use client";

/**
 * pwa.tsx — Installation sur l'écran d'accueil et mode hors connexion.
 *
 * Trois responsabilités :
 *   - enregistrer le service worker ;
 *   - proposer l'installation au bon moment (et pas à la première seconde) ;
 *   - signaler la perte de connexion, puisque l'application reste utilisable.
 */

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bouton } from "./ui";
import { LogoForge } from "./logo";
import { useApp } from "@/lib/useApp";
import { demarrerRappels, rappelsDuJour } from "@/lib/notifications";

/** Événement non standard, encore absent des types du DOM. */
interface EvenementInstallation extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const CLE_REFUS = "forge:installation-refusee";

export function GestionPWA() {
  const { programme, reglages, semaine } = useApp();
  const [invite, setInvite] = useState<EvenementInstallation | null>(null);
  const [visible, setVisible] = useState(false);
  const [horsLigne, setHorsLigne] = useState(false);
  const [majDisponible, setMajDisponible] = useState<ServiceWorker | null>(null);

  // --- Enregistrement du service worker ---
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;

    let annule = false;
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        if (annule) return;
        // Une nouvelle version est prête : on propose de recharger plutôt
        // que de rafraîchir de force pendant une séance en cours.
        registration.addEventListener("updatefound", () => {
          const nouveau = registration.installing;
          if (!nouveau) return;
          nouveau.addEventListener("statechange", () => {
            if (nouveau.state === "installed" && navigator.serviceWorker.controller) {
              setMajDisponible(nouveau);
            }
          });
        });
      })
      .catch(() => {
        // Enregistrement impossible (contexte non sécurisé, navigateur ancien) :
        // l'application fonctionne normalement, sans mode hors ligne.
      });

    return () => { annule = true; };
  }, []);

  // --- Invite d'installation ---
  useEffect(() => {
    const onInvite = (e: Event) => {
      e.preventDefault();
      setInvite(e as EvenementInstallation);
      // On laisse l'utilisateur découvrir l'app avant de proposer : une
      // bannière immédiate est presque toujours rejetée.
      if (!localStorage.getItem(CLE_REFUS)) {
        window.setTimeout(() => setVisible(true), 25_000);
      }
    };
    const onInstalle = () => {
      setVisible(false);
      setInvite(null);
    };

    window.addEventListener("beforeinstallprompt", onInvite);
    window.addEventListener("appinstalled", onInstalle);
    return () => {
      window.removeEventListener("beforeinstallprompt", onInvite);
      window.removeEventListener("appinstalled", onInstalle);
    };
  }, []);

  // --- État de la connexion ---
  useEffect(() => {
    const maj = () => setHorsLigne(!navigator.onLine);
    maj();
    window.addEventListener("online", maj);
    window.addEventListener("offline", maj);
    return () => {
      window.removeEventListener("online", maj);
      window.removeEventListener("offline", maj);
    };
  }, []);

  // --- Rappels locaux ---
  // La liste est recalculée à chaque vérification : si le programme change en
  // cours de journée, les rappels suivent sans redémarrer la surveillance.
  useEffect(() => {
    if (!programme) return;
    return demarrerRappels(() =>
      rappelsDuJour(programme, reglages.notifications, semaine),
    );
  }, [programme, reglages.notifications, semaine]);

  const installer = useCallback(async () => {
    if (!invite) return;
    await invite.prompt();
    const { outcome } = await invite.userChoice;
    if (outcome === "dismissed") localStorage.setItem(CLE_REFUS, "1");
    setVisible(false);
    setInvite(null);
  }, [invite]);

  const refuser = useCallback(() => {
    localStorage.setItem(CLE_REFUS, "1");
    setVisible(false);
  }, []);

  return (
    <>
      {/* Bandeau hors connexion */}
      <AnimatePresence>
        {horsLigne && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            role="status"
            className="fixed inset-x-0 top-0 z-[60] bg-[var(--warn)] px-4 py-2 text-center text-sm font-medium text-[#1b2727]"
          >
            Hors connexion — vos données restent enregistrées sur cet appareil.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mise à jour disponible */}
      <AnimatePresence>
        {majDisponible && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            className="glass-strong fixed inset-x-3 bottom-24 z-[60] flex flex-wrap items-center gap-3 rounded-xl2 p-4 md:bottom-4 md:left-auto md:right-4 md:max-w-sm"
          >
            <p className="min-w-0 flex-1 text-sm">
              Une nouvelle version est disponible.
            </p>
            <Bouton
              taille="sm"
              onClick={() => {
                majDisponible.postMessage("SKIP_WAITING");
                window.location.reload();
              }}
            >
              Recharger
            </Bouton>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invite d'installation */}
      <AnimatePresence>
        {visible && invite && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="glass-strong fixed inset-x-3 bottom-24 z-[60] rounded-xl2 p-5 md:bottom-4 md:left-auto md:right-4 md:max-w-sm"
          >
            <div className="flex items-start gap-3">
              <LogoForge taille={44} className="rounded-2xl" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Installer FORGE</p>
                <p className="mt-0.5 text-sm text-muted text-pretty">
                  Ajoutez l&apos;application à votre écran d&apos;accueil : elle
                  s&apos;ouvre en plein écran et fonctionne sans connexion.
                </p>
                <div className="mt-3 flex gap-2">
                  <Bouton taille="sm" onClick={installer}>Installer</Bouton>
                  <Bouton taille="sm" variante="fantome" onClick={refuser}>
                    Plus tard
                  </Bouton>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * Indique si l'application tourne en mode installé (écran d'accueil).
 * Sert à masquer les éléments propres au navigateur.
 */
export function useModeInstalle(): boolean {
  const [installe, setInstalle] = useState(false);
  useEffect(() => {
    const verifier = () =>
      setInstalle(
        window.matchMedia("(display-mode: standalone)").matches ||
        // Safari iOS n'implémente pas display-mode : propriété propriétaire.
        (window.navigator as unknown as { standalone?: boolean }).standalone === true,
      );
    verifier();
    const mq = window.matchMedia("(display-mode: standalone)");
    mq.addEventListener("change", verifier);
    return () => mq.removeEventListener("change", verifier);
  }, []);
  return installe;
}
