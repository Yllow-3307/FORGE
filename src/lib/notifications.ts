/**
 * notifications.ts — Rappels locaux (séance, repas, hydratation, bilan).
 *
 * Choix technique : rappels *locaux* planifiés par l'onglet ouvert, et non
 * notifications poussées. Le push exige un serveur et des clés VAPID ; le
 * budget étant nul, on s'en tient à ce qui fonctionne sans backend.
 *
 * Conséquence assumée, expliquée à l'utilisateur dans l'interface : les
 * rappels ne se déclenchent que si l'application est ouverte ou installée
 * et active en arrière-plan.
 */

import type { Programme } from "./moteur";
import { JOURS } from "./moteur/types";

export type EtatPermission = "default" | "granted" | "denied" | "indisponible";

export function permissionActuelle(): EtatPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "indisponible";
  return Notification.permission as EtatPermission;
}

/* --------------------------------------------------------------------------
 * Exposition de la permission comme source externe.
 *
 * L'API Notification n'existe pas au rendu serveur : lire sa valeur pendant
 * le rendu ferait diverger le HTML serveur et client (erreur React #418).
 * `useSyncExternalStore` accepte un instantané serveur distinct, ce qui règle
 * le problème sans effet ni rendu supplémentaire.
 * ------------------------------------------------------------------------ */

const abonnesPermission = new Set<() => void>();

export function souscrirePermission(callback: () => void): () => void {
  abonnesPermission.add(callback);
  return () => { abonnesPermission.delete(callback); };
}

/** À appeler après une demande de permission, pour rafraîchir les abonnés. */
export function notifierPermission(): void {
  abonnesPermission.forEach((cb) => cb());
}

export const instantanePermission = (): EtatPermission => permissionActuelle();
export const instantanePermissionServeur = (): EtatPermission => "indisponible";

export async function demanderPermission(): Promise<EtatPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "indisponible";
  if (Notification.permission === "granted") return "granted";
  try {
    const etat = (await Notification.requestPermission()) as EtatPermission;
    notifierPermission();
    return etat;
  } catch {
    return "denied";
  }
}

interface Rappel {
  cle: string;
  heure: number;      // minutes depuis minuit
  titre: string;
  corps: string;
  url: string;
}

/** Rappels du jour, déduits du programme et des préférences. */
export function rappelsDuJour(
  programme: Programme,
  prefs: { seance: boolean; repas: boolean; hydratation: boolean; bilanHebdo: boolean },
  semaine: number,
): Rappel[] {
  const rappels: Rappel[] = [];
  const jour = JOURS[(new Date().getDay() + 6) % 7];
  const donnees = programme.cycle[semaine - 1] ?? programme.semaineType;
  const jourData = donnees.jours.find((j) => j.jour === jour);
  if (!jourData) return rappels;

  if (prefs.seance) {
    for (const s of jourData.seances) {
      const [h, m] = s.debut.split(":").map(Number);
      rappels.push({
        cle: `seance-${s.nom}-${s.debut}`,
        heure: h * 60 + m - 15,     // 15 min avant, le temps de se préparer
        titre: "Séance dans 15 minutes",
        corps: `${s.nom} · ${s.dureeMin} min`,
        url: "/seance",
      });
    }
  }

  if (prefs.repas) {
    for (const r of jourData.repas) {
      if (r.role !== "principal" && r.role !== "demarrage") continue;
      rappels.push({
        cle: `repas-${r.nom}-${r.heureTxt}`,
        heure: r.heure,
        titre: r.nom,
        corps: `${r.kcal} kcal · P ${r.proteinesG} / G ${r.glucidesG} / L ${r.lipidesG} g`,
        url: "/nutrition",
      });
    }
  }

  if (prefs.hydratation) {
    for (const p of jourData.hydratation.points) {
      if (!p.moment.startsWith("Point régulier")) continue;
      rappels.push({
        cle: `eau-${p.heureTxt}`,
        heure: p.heure,
        titre: "Un verre d'eau",
        corps: `${p.ml} ml — ${p.moment}`,
        url: "/nutrition",
      });
    }
  }

  if (prefs.bilanHebdo && jour === "dimanche") {
    rappels.push({
      cle: "bilan-hebdo",
      heure: 19 * 60,
      titre: "Bilan de la semaine",
      corps: "Faites le point sur vos séances et votre poids.",
      url: "/mesures",
    });
  }

  return rappels.sort((a, b) => a.heure - b.heure);
}

const CLE_ENVOYES = "callisthenic:rappels-envoyes";

/** Empêche de renvoyer deux fois le même rappel dans la journée. */
function dejaEnvoye(cle: string): boolean {
  try {
    const data = JSON.parse(localStorage.getItem(CLE_ENVOYES) ?? "{}");
    return data.date === new Date().toDateString() && data.cles?.includes(cle);
  } catch {
    return false;
  }
}

function marquerEnvoye(cle: string): void {
  try {
    const aujourdhui = new Date().toDateString();
    const data = JSON.parse(localStorage.getItem(CLE_ENVOYES) ?? "{}");
    const cles = data.date === aujourdhui ? (data.cles ?? []) : [];
    cles.push(cle);
    localStorage.setItem(CLE_ENVOYES, JSON.stringify({ date: aujourdhui, cles }));
  } catch {
    // Stockage indisponible : au pire un rappel est répété.
  }
}

async function afficher(r: Rappel): Promise<void> {
  const options: NotificationOptions = {
    body: r.corps,
    icon: "/icones/icone-192.png",
    badge: "/icones/icone-192.png",
    tag: r.cle,
    data: { url: r.url },
  };

  // Le service worker permet d'afficher la notification même onglet masqué.
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.showNotification(r.titre, options);
      return;
    }
  }
  new Notification(r.titre, options);
}

/**
 * Démarre la surveillance des rappels.
 * Renvoie la fonction d'arrêt, à appeler au démontage.
 */
export function demarrerRappels(
  obtenirRappels: () => Rappel[],
  intervalleMs = 60_000,
): () => void {
  if (typeof window === "undefined" || permissionActuelle() !== "granted") {
    return () => {};
  }

  const verifier = () => {
    const maintenant = new Date();
    const minutes = maintenant.getHours() * 60 + maintenant.getMinutes();

    for (const r of obtenirRappels()) {
      // Fenêtre de 2 min : on tolère un onglet réveillé avec du retard, sans
      // déclencher des rappels vieux de plusieurs heures.
      if (minutes >= r.heure && minutes < r.heure + 2 && !dejaEnvoye(r.cle)) {
        marquerEnvoye(r.cle);
        void afficher(r);
      }
    }
  };

  verifier();
  const id = window.setInterval(verifier, intervalleMs);
  return () => window.clearInterval(id);
}

/** Notification de démonstration, pour vérifier que tout fonctionne. */
export async function notificationTest(): Promise<void> {
  await afficher({
    cle: `test-${Date.now()}`,
    heure: 0,
    titre: "Les rappels sont actifs",
    corps: "Vous recevrez vos rappels de séance, de repas et d'hydratation.",
    url: "/",
  });
}
