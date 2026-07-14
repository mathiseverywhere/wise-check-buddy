import { useMemo, useState } from "react";

type CheckResult = "ok" | "fail" | null;

type CheckPoint = {
  id: string;
  label: string;
  spec: string;
  unit?: string;
  tolerance?: { min: number; max: number };
  type: "numeric" | "visual";
};

type Order = {
  po: string;
  supplier: string;
  reference: string;
  lotSize: number;
  aql: string;
  sampleSize: number;
  checkpoints: CheckPoint[];
};

const ORDERS: Record<string, Order> = {
  "PO-48213": {
    po: "PO-48213",
    supplier: "Metallwerk Nord GmbH",
    reference: "REF-1042 · Getriebewelle Ø18",
    lotSize: 500,
    aql: "AQL 2.5 · Level II",
    sampleSize: 32,
    checkpoints: [
      { id: "d1", label: "Durchmesser Ø", spec: "18.00 ± 0.05", unit: "mm", tolerance: { min: 17.95, max: 18.05 }, type: "numeric" },
      { id: "l1", label: "Länge L", spec: "84.00 ± 0.10", unit: "mm", tolerance: { min: 83.9, max: 84.1 }, type: "numeric" },
      { id: "n1", label: "Geräuschprüfung", spec: "≤ 62 dB im Leerlauf", unit: "dB", tolerance: { min: 0, max: 62 }, type: "numeric" },
      { id: "o1", label: "Oberfläche / Optik", spec: "keine Kratzer, keine Grate", type: "visual" },
    ],
  },
  "PO-48219": {
    po: "PO-48219",
    supplier: "Präzision Süd AG",
    reference: "REF-0788 · Lagerbuchse",
    lotSize: 200,
    aql: "AQL 1.5 · Level II",
    sampleSize: 20,
    checkpoints: [
      { id: "di", label: "Innendurchmesser", spec: "12.00 ± 0.02", unit: "mm", tolerance: { min: 11.98, max: 12.02 }, type: "numeric" },
      { id: "da", label: "Außendurchmesser", spec: "16.00 ± 0.03", unit: "mm", tolerance: { min: 15.97, max: 16.03 }, type: "numeric" },
      { id: "op", label: "Optik / Beschichtung", spec: "gleichmäßig, glänzend", type: "visual" },
    ],
  },
};

type Step = 0 | 1 | 2 | 3 | 4;

export function InspectionDemo() {
  const [step, setStep] = useState<Step>(0);
  const [poInput, setPoInput] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [results, setResults] = useState<Record<string, { value: string; result: CheckResult }>>({});
  const [pointer, setPointer] = useState(0);
  const [officeDecision, setOfficeDecision] = useState<"pending" | "released" | "rejected">("pending");

  const failCount = useMemo(
    () => Object.values(results).filter((r) => r.result === "fail").length,
    [results],
  );
  const escalated = failCount >= 1;

  function loadOrder(po: string) {
    const o = ORDERS[po.toUpperCase().trim()];
    if (!o) return false;
    setOrder(o);
    setResults({});
    setPointer(0);
    setOfficeDecision("pending");
    return true;
  }

  function reset() {
    setStep(0);
    setPoInput("");
    setOrder(null);
    setResults({});
    setPointer(0);
    setOfficeDecision("pending");
  }

  function evaluateCheckpoint(cp: CheckPoint, raw: string): CheckResult {
    if (cp.type === "numeric" && cp.tolerance) {
      const v = parseFloat(raw.replace(",", "."));
      if (Number.isNaN(v)) return null;
      return v >= cp.tolerance.min && v <= cp.tolerance.max ? "ok" : "fail";
    }
    return null;
  }

  return (
    <div className="border border-ink/25 bg-card">
      {/* Header rail */}
      <div className="flex flex-col gap-3 border-b border-ink/15 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-ok" aria-hidden />
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink/70">
            Live-Demo · Prüfplatz-Terminal
          </span>
        </div>
        <div className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em]">
          {["Anmeldung", "AQL", "Prüfung", "Eskalation", "Freigabe"].map((label, i) => {
            const active = i === step;
            const done = i < step;
            return (
              <div key={label} className="flex items-center gap-1">
                <span
                  className={`flex h-6 min-w-6 items-center justify-center rounded-sm border px-1.5 ${
                    active
                      ? "border-ink bg-ink text-paper"
                      : done
                        ? "border-ok/60 bg-ok/10 text-ok"
                        : "border-ink/25 text-ink/40"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                  <span className="ml-1 hidden md:inline">· {label}</span>
                </span>
                {i < 4 && <span className="text-ink/25">/</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-6 md:p-10">
        {/* STEP 0 — Anmeldung */}
        {step === 0 && (
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-ink/50">
                Schritt 01 — Anmeldung
              </div>
              <h3 className="font-display text-3xl leading-tight">
                Order-Nr. scannen oder eingeben.
              </h3>
              <p className="mt-4 text-ink/70">
                In der echten Umgebung liest das Terminal die PO per Barcode und zieht
                Lieferant, Referenz und Losgröße aus <span className="font-mono">SAP B1</span>.
                Für die Demo tippe eine Test-PO ein.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {Object.keys(ORDERS).map((po) => (
                  <button
                    key={po}
                    onClick={() => setPoInput(po)}
                    className="rounded-sm border border-ink/25 bg-background px-3 py-1.5 font-mono text-xs hover:border-ink hover:bg-ink hover:text-paper"
                  >
                    {po}
                  </button>
                ))}
              </div>
            </div>

            <div className="border border-ink/20 bg-background/60 p-6">
              <label className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink/60">
                Order-Nr.
              </label>
              <input
                autoFocus
                value={poInput}
                onChange={(e) => setPoInput(e.target.value)}
                placeholder="PO-48213"
                className="mt-2 w-full border-b-2 border-ink/30 bg-transparent py-3 font-mono text-2xl tracking-widest outline-none focus:border-ink"
              />
              <button
                onClick={() => {
                  if (loadOrder(poInput)) setStep(1);
                }}
                disabled={!poInput.trim()}
                className="mt-6 w-full rounded-sm bg-ink px-4 py-3 font-mono text-xs uppercase tracking-[0.22em] text-paper transition disabled:cursor-not-allowed disabled:opacity-30 hover:bg-ink/85"
              >
                Anmelden →
              </button>
              {poInput && !ORDERS[poInput.toUpperCase().trim()] && (
                <p className="mt-3 font-mono text-[11px] text-destructive">
                  ! Order nicht gefunden. Verwende PO-48213 oder PO-48219.
                </p>
              )}
            </div>
          </div>
        )}

        {/* STEP 1 — AQL Vorschlag */}
        {step === 1 && order && (
          <div>
            <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-ink/50">
              Schritt 02 — AQL-Vorschlag
            </div>
            <h3 className="font-display text-3xl leading-tight">
              Stichprobengröße & Toleranzen aus der Datenbank.
            </h3>

            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {[
                { l: "Lieferant", v: order.supplier },
                { l: "Referenz", v: order.reference },
                { l: "Losgröße", v: `${order.lotSize} Stk.` },
              ].map((c) => (
                <div key={c.l} className="border border-ink/15 p-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/50">
                    {c.l}
                  </div>
                  <div className="mt-1 font-display text-lg">{c.v}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-0 border border-ink/25 md:grid-cols-2">
              <div className="border-b border-ink/15 p-6 md:border-b-0 md:border-r">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/50">
                  Prüfplan
                </div>
                <div className="mt-1 font-display text-2xl">{order.aql}</div>
              </div>
              <div className="p-6">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/50">
                  Stichprobe
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-4xl">{order.sampleSize}</span>
                  <span className="font-mono text-xs text-ink/50">von {order.lotSize}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 border border-ink/20 bg-background/60">
              <div className="border-b border-ink/15 px-5 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ink/50">
                Prüfpunkte · {order.checkpoints.length}
              </div>
              <ul className="divide-y divide-ink/10">
                {order.checkpoints.map((cp) => (
                  <li key={cp.id} className="flex items-center justify-between px-5 py-3">
                    <span className="font-medium">{cp.label}</span>
                    <span className="font-mono text-xs text-ink/60">{cp.spec}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={() => setStep(2)}
                className="rounded-sm bg-ink px-5 py-3 font-mono text-xs uppercase tracking-[0.22em] text-paper hover:bg-ink/85"
              >
                Prüfung starten →
              </button>
              <button
                onClick={reset}
                className="rounded-sm border border-ink/25 px-5 py-3 font-mono text-xs uppercase tracking-[0.22em] text-ink/70 hover:border-ink"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 — Prüfung */}
        {step === 2 && order && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink/50">
                Schritt 03 — Prüfung am Tablet
              </div>
              <div className="font-mono text-[11px] text-ink/50">
                {pointer + 1} / {order.checkpoints.length}
              </div>
            </div>
            <h3 className="font-display text-3xl leading-tight">
              {order.checkpoints[pointer].label}
            </h3>
            <div className="mt-2 font-mono text-sm text-ink/60">
              Sollwert: <span className="text-ink">{order.checkpoints[pointer].spec}</span>
            </div>

            <CheckpointForm
              key={order.checkpoints[pointer].id}
              cp={order.checkpoints[pointer]}
              onSubmit={(value, result) => {
                const cp = order.checkpoints[pointer];
                setResults((r) => ({ ...r, [cp.id]: { value, result } }));
                if (pointer + 1 < order.checkpoints.length) {
                  setPointer(pointer + 1);
                } else {
                  setStep(3);
                }
              }}
              evaluate={(raw) => evaluateCheckpoint(order.checkpoints[pointer], raw)}
            />

            {/* Progress bar */}
            <div className="mt-8">
              <div className="mb-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-ink/50">
                <span>Fortschritt</span>
                <span>
                  {Object.keys(results).length} von {order.checkpoints.length}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
                <div
                  className="h-full bg-ink transition-all"
                  style={{
                    width: `${(Object.keys(results).length / order.checkpoints.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 — Eskalation */}
        {step === 3 && order && (
          <div>
            <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-ink/50">
              Schritt 04 — Auswertung & Eskalation
            </div>

            {escalated ? (
              <div>
                <div className="inline-block tape-stripes px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-paper">
                  Eskalation vorgeschlagen
                </div>
                <h3 className="mt-4 font-display text-3xl leading-tight">
                  {failCount} Auffälligkeit{failCount > 1 ? "en" : ""} — erweiterte Stichprobe empfohlen.
                </h3>
                <p className="mt-3 max-w-xl text-ink/70">
                  Das System dokumentiert die Abweichung und leitet den Fall an die
                  Büro-Queue zur finalen Entscheidung.
                </p>
              </div>
            ) : (
              <div>
                <div className="inline-block rounded-sm bg-ok/15 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-ok">
                  Alle Prüfpunkte in Toleranz
                </div>
                <h3 className="mt-4 font-display text-3xl leading-tight">
                  Keine Eskalation nötig.
                </h3>
              </div>
            )}

            <div className="mt-8 border border-ink/20">
              <div className="border-b border-ink/15 px-5 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ink/50">
                Ergebnisliste
              </div>
              <ul className="divide-y divide-ink/10">
                {order.checkpoints.map((cp) => {
                  const r = results[cp.id];
                  return (
                    <li key={cp.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <div className="font-medium">{cp.label}</div>
                        <div className="font-mono text-xs text-ink/50">{cp.spec}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm">{r?.value || "—"}</span>
                        <span
                          className={`rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${
                            r?.result === "ok"
                              ? "bg-ok/15 text-ok"
                              : r?.result === "fail"
                                ? "bg-destructive/15 text-destructive"
                                : "bg-muted text-ink/60"
                          }`}
                        >
                          {r?.result === "ok" ? "OK" : r?.result === "fail" ? "NIO" : "manuell"}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={() => setStep(4)}
                className="rounded-sm bg-ink px-5 py-3 font-mono text-xs uppercase tracking-[0.22em] text-paper hover:bg-ink/85"
              >
                An Büro übergeben →
              </button>
              <button
                onClick={reset}
                className="rounded-sm border border-ink/25 px-5 py-3 font-mono text-xs uppercase tracking-[0.22em] text-ink/70 hover:border-ink"
              >
                Neu starten
              </button>
            </div>
          </div>
        )}

        {/* STEP 4 — Freigabe */}
        {step === 4 && order && (
          <div>
            <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-ink/50">
              Schritt 05 — Büro-Freigabe
            </div>
            <h3 className="font-display text-3xl leading-tight">
              Fall in der Queue · {order.po}
            </h3>

            <div className="mt-6 grid gap-6 md:grid-cols-3">
              <div className="border border-ink/15 p-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/50">Referenz</div>
                <div className="mt-1 font-display text-lg">{order.reference}</div>
              </div>
              <div className="border border-ink/15 p-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/50">Ergebnis</div>
                <div className={`mt-1 font-display text-lg ${escalated ? "text-destructive" : "text-ok"}`}>
                  {escalated ? `${failCount} Abweichung${failCount > 1 ? "en" : ""}` : "Alle in Toleranz"}
                </div>
              </div>
              <div className="border border-ink/15 p-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/50">Stichprobe</div>
                <div className="mt-1 font-display text-lg">
                  {order.sampleSize} von {order.lotSize}
                </div>
              </div>
            </div>

            {officeDecision === "pending" ? (
              <div className="mt-8">
                <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink/60">
                  Finale Entscheidung
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                  <button
                    onClick={() => setOfficeDecision("released")}
                    className="rounded-sm bg-ok px-5 py-3 font-mono text-xs uppercase tracking-[0.22em] text-paper hover:opacity-90"
                  >
                    ✓ Freigeben
                  </button>
                  <button
                    onClick={() => setOfficeDecision("rejected")}
                    className="rounded-sm bg-destructive px-5 py-3 font-mono text-xs uppercase tracking-[0.22em] text-destructive-foreground hover:opacity-90"
                  >
                    ✕ Sperren / Reklamation
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-8 border-l-4 border-ink bg-background/60 p-6">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/50">
                  Report automatisch erzeugt
                </div>
                <div className="mt-2 font-display text-2xl">
                  {officeDecision === "released"
                    ? "Lieferung freigegeben."
                    : "Lieferung gesperrt — Reklamation angelegt."}
                </div>
                <div className="mt-1 font-mono text-xs text-ink/60">
                  PDF · CSV · SAP-Buchung {officeDecision === "released" ? "verbucht" : "ausgesetzt"}
                </div>
                <button
                  onClick={reset}
                  className="mt-6 rounded-sm border border-ink/25 px-5 py-3 font-mono text-xs uppercase tracking-[0.22em] text-ink/70 hover:border-ink"
                >
                  Nächste Lieferung →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CheckpointForm({
  cp,
  evaluate,
  onSubmit,
}: {
  cp: CheckPoint;
  evaluate: (raw: string) => CheckResult;
  onSubmit: (value: string, result: CheckResult) => void;
}) {
  const [value, setValue] = useState("");
  const [visual, setVisual] = useState<CheckResult>(null);

  if (cp.type === "numeric") {
    const preview = value ? evaluate(value) : null;
    return (
      <div className="mt-6">
        <div className="flex items-end gap-3">
          <input
            autoFocus
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0.00"
            className="w-full max-w-xs border-b-2 border-ink/30 bg-transparent py-3 font-mono text-4xl outline-none focus:border-ink"
          />
          {cp.unit && <span className="pb-3 font-mono text-lg text-ink/50">{cp.unit}</span>}
          {preview && (
            <span
              className={`ml-auto rounded-sm px-3 py-1 font-mono text-xs uppercase tracking-[0.18em] ${
                preview === "ok" ? "bg-ok/15 text-ok" : "bg-destructive/15 text-destructive"
              }`}
            >
              {preview === "ok" ? "in Toleranz" : "außerhalb"}
            </span>
          )}
        </div>
        <button
          onClick={() => {
            const r = evaluate(value);
            if (r !== null) onSubmit(value, r);
          }}
          disabled={!value || evaluate(value) === null}
          className="mt-6 rounded-sm bg-ink px-5 py-3 font-mono text-xs uppercase tracking-[0.22em] text-paper disabled:opacity-30 hover:bg-ink/85"
        >
          Wert bestätigen →
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setVisual("ok")}
          className={`rounded-sm border px-5 py-3 font-mono text-xs uppercase tracking-[0.22em] ${
            visual === "ok" ? "border-ok bg-ok/15 text-ok" : "border-ink/25 hover:border-ok"
          }`}
        >
          ✓ i.O.
        </button>
        <button
          onClick={() => setVisual("fail")}
          className={`rounded-sm border px-5 py-3 font-mono text-xs uppercase tracking-[0.22em] ${
            visual === "fail" ? "border-destructive bg-destructive/15 text-destructive" : "border-ink/25 hover:border-destructive"
          }`}
        >
          ✕ n.i.O.
        </button>
      </div>
      <button
        onClick={() => visual && onSubmit(visual === "ok" ? "OK" : "NIO", visual)}
        disabled={!visual}
        className="mt-6 rounded-sm bg-ink px-5 py-3 font-mono text-xs uppercase tracking-[0.22em] text-paper disabled:opacity-30 hover:bg-ink/85"
      >
        Bewertung bestätigen →
      </button>
    </div>
  );
}
