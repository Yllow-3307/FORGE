/* eslint-disable */
import assert from "assert";
import Module from "module";

// Mock des variables d'environnement
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "mock-anon-key";

const navigatorMock = { onLine: false };

// Structure du client Supabase Mocké
const mockSupabaseClient = {
  auth: {
    getSession: async () => ({
      data: { session: { user: { id: "user-test-id" } } },
      error: null,
    }),
    getUser: async () => ({
      data: { user: { id: "user-test-id" } },
      error: null,
    }),
  },
  from: (table: string) => ({
    select: () => ({
      eq: () => ({
        order: async () => ({
          data: [],
          error: null,
        }),
      }),
    }),
    upsert: async (payload: any) => {
      if (!navigatorMock.onLine) {
        return { error: new Error("Hors ligne") };
      }
      return { error: null };
    },
    insert: async (payload: any) => {
      if (!navigatorMock.onLine) {
        return { error: new Error("Hors ligne") };
      }
      return { error: null };
    },
    delete: () => ({
      eq: async () => {
        if (!navigatorMock.onLine) {
          return { error: new Error("Hors ligne") };
        }
        return { error: null };
      },
    }),
  }),
};

// Intercepter l'import de @supabase/ssr pour retourner notre client mocké
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id: string) {
  if (id === "@supabase/ssr") {
    return {
      createBrowserClient: () => mockSupabaseClient,
    };
  }
  return originalRequire.apply(this, arguments as any);
};

// 1. Mock du localStorage et du window pour Node
class LocalStorageMock {
  private store: Record<string, string> = {};
  getItem(key: string) { return this.store[key] || null; }
  setItem(key: string, value: string) { this.store[key] = String(value); }
  removeItem(key: string) { delete this.store[key]; }
  clear() { this.store = {}; }
}

const localStore = new LocalStorageMock();

global.window = {
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
} as any;

global.localStorage = localStore as any;

// Redéfinir navigator de façon configurable
Object.defineProperty(global, "navigator", {
  value: navigatorMock,
  writable: true,
  configurable: true,
});

async function executerTests() {
  console.log("=== Début du test de synchronisation ===");

  // Importer dynamiquement pour s'assurer que process.env est déjà valorisé
  const {
    lireFileAttente,
    enregistrerPoids,
    viderFileAttente,
    stockageDistant,
    supabase,
  } = await import("../src/lib/stockage");

  console.log("stockageDistant():", stockageDistant());
  console.log("supabase():", supabase() ? "MOCK CLIENT" : "NULL");

  // Étape 1 : Simulation écriture hors ligne
  console.log("Étape 1 : Simulation écriture hors ligne (Poids)");
  navigatorMock.onLine = false;

  const mesure = await enregistrerPoids({
    ficheId: "fiche-test-id",
    date: "2026-07-28",
    poids: 78.4,
  });

  console.log("-> Pesée enregistrée localement :", mesure.poids, "kg");

  // Attendre un court instant car l'écriture distante est asynchrone (fire-and-forget)
  await new Promise((resolve) => setTimeout(resolve, 50));

  // Vérifier la mise en file d'attente
  const file = lireFileAttente();
  console.log("File d'attente actuelle :", file);
  assert.strictEqual(file.length, 1, "La file d'attente doit contenir 1 élément.");
  assert.strictEqual(file[0].type, "poids", "L'élément de la file d'attente doit être de type 'poids'.");
  assert.strictEqual(file[0].payload.poids, 78.4, "La valeur du poids doit être de 78.4.");
  console.log("✅ Étape 1 réussie : L'écriture hors ligne est bien mise en file d'attente.");

  // Étape 2 : Simulation retour réseau et vidange de la file d'attente
  console.log("\nÉtape 2 : Simulation retour réseau");
  navigatorMock.onLine = true;

  console.log("-> Vidange de la file d'attente...");
  await viderFileAttente();

  const fileApres = lireFileAttente();
  assert.strictEqual(fileApres.length, 0, "La file d'attente doit être vide après le retour réseau.");
  console.log("✅ Étape 2 réussie : La file d'attente a bien été vidée après retour réseau.");

  console.log("\n=== Tous les tests de synchronisation sont validés avec succès ! ===");
}

executerTests().catch((err) => {
  console.error("❌ Erreur pendant l'exécution des tests :", err);
  process.exit(1);
});
