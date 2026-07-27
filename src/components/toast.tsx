"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";

export type TonToast = "succes" | "erreur" | "info";

export interface Toast {
  id: string;
  message: string;
  ton: TonToast;
}

interface ContexteToastType {
  toast: (message: string, ton?: TonToast) => void;
}

const ContexteToast = createContext<ContexteToastType | null>(null);

function id(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function FournisseurToast({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, ton: TonToast = "succes") => {
    const nouveau: Toast = {
      id: id(),
      message,
      ton,
    };

    setToasts((prev) => {
      const suivants = [...prev, nouveau];
      // max 3 simultanés, retire le plus ancien au-delà
      return suivants.length > 3 ? suivants.slice(1) : suivants;
    });
  }, []);

  // Auto-retrait après 3000 ms
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    toasts.forEach((t) => {
      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((p) => p.id !== t.id));
      }, 3000);
      timers.push(timer);
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [toasts]);

  const fermer = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getEmoji = (ton: TonToast): string => {
    if (ton === "succes") return "💧";
    if (ton === "erreur") return "⚠️";
    return "ℹ️";
  };

  const getCouleurPuce = (ton: TonToast): string => {
    if (ton === "succes") return "var(--accent)";
    if (ton === "erreur") return "var(--danger)";
    return "var(--text-muted)";
  };

  return (
    <ContexteToast.Provider value={{ toast }}>
      {children}

      <div
        role="status"
        aria-live="polite"
        aria-atomic="false"
        className="fixed inset-x-0 z-50 flex flex-col items-center gap-2 px-3 pointer-events-none"
        style={{
          bottom: "calc(5.5rem + env(safe-area-inset-bottom))",
        }}
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              onClick={() => fermer(t.id)}
              className="glass-strong rounded-pill px-4 py-2.5 text-sm shadow-soft flex items-center gap-2.5 max-w-sm w-fit pointer-events-auto cursor-pointer"
            >
              <span
                aria-hidden
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: getCouleurPuce(t.ton) }}
              />
              <span aria-hidden>{getEmoji(t.ton)}</span>
              <span>{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ContexteToast.Provider>
  );
}

export function useToast(): ContexteToastType {
  const ctx = useContext(ContexteToast);
  if (!ctx) {
    throw new Error(
      "useToast doit être appelé à l'intérieur d'un FournisseurToast"
    );
  }
  return ctx;
}
