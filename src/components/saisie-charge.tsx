"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import {
  type EntreeCharge,
  aujourdhui,
  derniereCharge,
  enregistrerCharge,
  tendanceCharge,
} from "@/lib/suivi";
import { Bouton, Saisie, cx } from "@/components/ui";
import { useToast } from "@/components/toast";

const fmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
const fmtPct = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

function formaterKg(v: number): string {
  return fmt.format(v);
}

function parseNombre(s: string): number {
  const nettoye = s.replace(",", ".").trim();
  const n = Number(nettoye);
  return Number.isFinite(n) ? n : NaN;
}

export function SaisieCharge({
  exercice,
  onEnregistre,
}: {
  exercice: string;
  onEnregistre?: (e: EntreeCharge) => void;
}) {
  const { toast } = useToast();

  const [derniere, setDerniere] = useState<EntreeCharge | null>(null);
  const [tendance, setTendance] = useState<ReturnType<typeof tendanceCharge>>({
    sens: "inconnu",
    deltaKg: 0,
    deltaPct: 0,
  });

  const [chargeRaw, setChargeRaw] = useState<string>("");
  const [repsRaw, setRepsRaw] = useState<string>("");

  const [errCharge, setErrCharge] = useState<string | undefined>();
  const [errReps, setErrReps] = useState<string | undefined>();

  const rafraichir = (forcerReset = false) => {
    const d = derniereCharge(exercice);
    setDerniere(d);
    setTendance(tendanceCharge(exercice));
    if (forcerReset) {
      if (d) {
        setChargeRaw(String(d.charge));
        setRepsRaw(String(d.reps));
      } else {
        setChargeRaw("");
        setRepsRaw("8");
      }
      setErrCharge(undefined);
      setErrReps(undefined);
    } else {
      if (d) {
        setChargeRaw((prev) => (prev === "" ? String(d.charge) : prev));
        setRepsRaw((prev) => (prev === "" ? String(d.reps) : prev));
      } else {
        setChargeRaw((prev) => (prev === "" ? "" : prev));
        setRepsRaw((prev) => (prev === "" ? "8" : prev));
      }
    }
  };

  useEffect(() => {
    rafraichir(true);
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent).detail as string | undefined;
      if (!detail || detail === "forge:charges" || detail === "tout") {
        rafraichir(false);
      }
    };
    window.addEventListener("forge:maj", handler as EventListener);
    return () => window.removeEventListener("forge:maj", handler as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercice]);

  const chargeNum = parseNombre(chargeRaw);
  // reps est entier
  const repsNum = parseNombre(repsRaw);

  const ajuster = (delta: number) => {
    const base = Number.isFinite(chargeNum) ? chargeNum : derniere?.charge ?? 0;
    const nv = Math.min(500, Math.max(0, Math.round((base + delta) * 2) / 2));
    setChargeRaw(String(nv));
    setErrCharge(undefined);
  };

  const valider = (): boolean => {
    let ok = true;
    if (!Number.isFinite(chargeNum) || chargeNum < 0 || chargeNum > 500) {
      setErrCharge("Charge entre 0 et 500 kg");
      ok = false;
    } else {
      setErrCharge(undefined);
    }
    if (!Number.isFinite(repsNum) || !Number.isInteger(repsNum) || repsNum < 1 || repsNum > 100) {
      setErrReps("Répétitions entre 1 et 100");
      ok = false;
    } else {
      setErrReps(undefined);
    }
    return ok;
  };

  const handleEnregistrer = () => {
    if (!valider()) return;
    const entree = enregistrerCharge({
      date: aujourdhui(),
      exercice,
      charge: chargeNum,
      reps: Math.trunc(repsNum),
    });
    const chargeTxt = formaterKg(entree.charge);
    toast(`${entree.exercice} : ${chargeTxt} kg × ${entree.reps}`, "succes");
    setDerniere(entree);
    setTendance(tendanceCharge(exercice));
    onEnregistre?.(entree);
  };

  const fleche =
    tendance.sens === "hausse" ? (
      <span className="ml-2 font-bold" style={{ color: "var(--accent)" }} aria-label="hausse">
        ↑
      </span>
    ) : tendance.sens === "baisse" ? (
      <span className="ml-2 font-bold" style={{ color: "var(--danger)" }} aria-label="baisse">
        ↓
      </span>
    ) : tendance.sens === "stable" ? (
      <span className="ml-2 text-muted" aria-label="stable">
        →
      </span>
    ) : null;

  const deltaLabel =
    tendance.sens !== "inconnu" ? (
      <span className="ml-1 text-xs text-muted">
        {tendance.deltaKg > 0 ? "+" : ""}
        {formaterKg(tendance.deltaKg)} kg ({tendance.deltaPct > 0 ? "+" : ""}
        {fmtPct.format(tendance.deltaPct)} %)
      </span>
    ) : null;

  return (
    <div className="mt-4 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-left">
      <div className="mb-3">
        {derniere ? (
          <p className="text-sm">
            <span className="text-muted">Dernière fois :</span>{" "}
            <span className="font-semibold">
              {formaterKg(derniere.charge)} kg × {derniere.reps}
            </span>
            {fleche}
            {deltaLabel}
          </p>
        ) : (
          <p className="text-sm text-muted">Première fois sur cet exercice</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">Charge (kg)</span>
          <Saisie
            type="number"
            inputMode="decimal"
            step={0.5}
            min={0}
            max={500}
            placeholder="0"
            value={chargeRaw}
            onChange={(e) => {
              setChargeRaw(e.target.value);
              setErrCharge(undefined);
            }}
            aria-label={`Charge pour ${exercice} en kg`}
            className={cx(errCharge && "border-[var(--danger)]")}
          />
          {errCharge && (
            <span className="mt-1 block text-xs font-medium text-[var(--danger)]">
              {errCharge}
            </span>
          )}
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">Reps</span>
          <Saisie
            type="number"
            inputMode="numeric"
            step={1}
            min={1}
            max={100}
            placeholder="8"
            value={repsRaw}
            onChange={(e) => {
              setRepsRaw(e.target.value);
              setErrReps(undefined);
            }}
            aria-label={`Répétitions pour ${exercice}`}
            className={cx(errReps && "border-[var(--danger)]")}
          />
          {errReps && (
            <span className="mt-1 block text-xs font-medium text-[var(--danger)]">{errReps}</span>
          )}
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => ajuster(-2.5)}
          aria-label="Retirer 2,5 kg"
          className="min-h-11 rounded-pill border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium transition hover:border-[var(--border-strong)]"
        >
          −2,5
        </button>
        <button
          type="button"
          onClick={() => ajuster(-1)}
          aria-label="Retirer 1 kg"
          className="min-h-11 rounded-pill border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium transition hover:border-[var(--border-strong)]"
        >
          −1
        </button>
        <button
          type="button"
          onClick={() => ajuster(1)}
          aria-label="Ajouter 1 kg"
          className="min-h-11 rounded-pill border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium transition hover:border-[var(--border-strong)]"
        >
          +1
        </button>
        <button
          type="button"
          onClick={() => ajuster(2.5)}
          aria-label="Ajouter 2,5 kg"
          className="min-h-11 rounded-pill border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium transition hover:border-[var(--border-strong)]"
        >
          +2,5
        </button>
      </div>

      <Bouton taille="sm" className="mt-3 w-full sm:w-auto" onClick={handleEnregistrer}>
        Enregistrer
      </Bouton>
    </div>
  );
}
