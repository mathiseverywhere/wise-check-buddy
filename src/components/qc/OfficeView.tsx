import { useMemo, useState } from "react";
import {
  newId,
  useQC,
  defaultStations,
  type PackingType,
  type Product,
  type TestJob,
} from "@/lib/qcStore";
import { AppShell, ProductChip, StatusPill } from "./Shell";

const PACKING: PackingType[] = ["Karton einzeln", "Blister", "Sammelkiste", "Kunststoffbeutel"];

export function OfficeView() {
  const [tab, setTab] = useState<"overview" | "products" | "schedule" | "decisions">("overview");
  const { state } = useQC();

  const counts = useMemo(() => {
    const c = { testing: 0, marking: 0, packing: 0, decision: 0, done: 0, rejected: 0 };
    for (const j of state.jobs) {
      if (j.status === "in_testing" || j.status === "scheduled") c.testing++;
      else if (j.status === "in_marking") c.marking++;
      else if (j.status === "in_packing") c.packing++;
      else if (j.status === "awaiting_decision") c.decision++;
      else if (j.status === "done") c.done++;
      else if (j.status === "rejected") c.rejected++;
    }
    return c;
  }, [state.jobs]);

  return (
    <AppShell
      title="Büro-Konsole"
      subtitle="Planung · Freigabe · Übersicht"
      tab={tab}
      setTab={(t) => setTab(t as typeof tab)}
      tabs={[
        { id: "overview", label: "Übersicht" },
        { id: "products", label: "Produkte", badge: state.products.length },
        { id: "schedule", label: "Planung" },
        { id: "decisions", label: "Freigaben", badge: counts.decision },
      ]}
    >
      {tab === "overview" && <Overview counts={counts} />}
      {tab === "products" && <ProductsTab />}
      {tab === "schedule" && <ScheduleTab />}
      {tab === "decisions" && <DecisionsTab />}
    </AppShell>
  );
}

// ---------- Overview ----------

function Overview({
  counts,
}: {
  counts: { testing: number; marking: number; packing: number; decision: number; done: number; rejected: number };
}) {
  const { state, productOf, fullCheckActive } = useQC();
  const [open, setOpen] = useState<string | null>(null);

  const groups: { key: string; label: string; jobs: TestJob[] }[] = [
    {
      key: "testing",
      label: "Testing",
      jobs: state.jobs.filter((j) => j.status === "in_testing" || j.status === "scheduled"),
    },
    { key: "decision", label: "Wartet auf Freigabe", jobs: state.jobs.filter((j) => j.status === "awaiting_decision") },
    { key: "marking", label: "Lasermarkierung", jobs: state.jobs.filter((j) => j.status === "in_marking") },
    { key: "packing", label: "Verpackung", jobs: state.jobs.filter((j) => j.status === "in_packing") },
    { key: "done", label: "Abgeschlossen", jobs: state.jobs.filter((j) => j.status === "done") },
    { key: "rejected", label: "Gesperrt", jobs: state.jobs.filter((j) => j.status === "rejected") },
  ];

  return (
    <div className="space-y-6">
      {fullCheckActive && (
        <div className="border-l-4 border-accent bg-accent/10 p-4 font-mono text-xs">
          <span className="tape-stripes mr-2 inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-paper">
            Full Check aktiv
          </span>
          {productOf(fullCheckActive.productId)?.reference} — andere Prüfungen sind blockiert.
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <StatCard label="In Testing" value={counts.testing} tone="ink" />
        <StatCard label="Wartet Entscheid" value={counts.decision} tone="accent" />
        <StatCard label="Lasermarkierung" value={counts.marking} tone="ink" />
        <StatCard label="Verpackung" value={counts.packing} tone="ok" />
        <StatCard label="Fertig" value={counts.done} tone="ok" />
        <StatCard label="Gesperrt" value={counts.rejected} tone="destructive" />
      </div>

      <div className="space-y-2">
        {groups.map((g) => (
          <div key={g.key} className="border border-ink/20 bg-card">
            <button
              className="flex w-full items-center justify-between px-4 py-3 text-left"
              onClick={() => setOpen(open === g.key ? null : g.key)}
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.2em]">
                {g.label}
              </span>
              <span className="font-mono text-xs text-ink/60">
                {g.jobs.length} {open === g.key ? "▲" : "▼"}
              </span>
            </button>
            {open === g.key && (
              <div className="border-t border-ink/10 divide-y divide-ink/10">
                {g.jobs.length === 0 && (
                  <div className="px-4 py-3 font-mono text-xs text-ink/40">— leer —</div>
                )}
                {g.jobs.map((j) => {
                  const p = productOf(j.productId);
                  const done = j.stations.filter((s) => s.status === "done").length;
                  return (
                    <div key={j.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p && <ProductChip product={p} />}
                        <span className="font-mono text-[10px] text-ink/50">
                          {j.scheduledDate} · {j.quantity} Stk
                        </span>
                        {j.instructions === "full_check" && (
                          <span className="rounded-sm bg-accent/30 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em]">
                            Full Check
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[10px] text-ink/50">
                          {done}/{j.stations.length} Stationen
                        </span>
                        <StatusPill status={j.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: "ink" | "accent" | "ok" | "destructive" }) {
  const cls =
    tone === "accent"
      ? "border-accent"
      : tone === "ok"
        ? "border-ok"
        : tone === "destructive"
          ? "border-destructive"
          : "border-ink";
  return (
    <div className={`border-l-4 bg-card p-4 ${cls}`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/50">{label}</div>
      <div className="mt-1 font-display text-4xl">{value}</div>
    </div>
  );
}

// ---------- Products ----------

function ProductsTab() {
  const { state, dispatch } = useQC();
  const [ref, setRef] = useState("");
  const [name, setName] = useState("");
  const [laser, setLaser] = useState(false);
  const [laserText, setLaserText] = useState("");
  const [pack, setPack] = useState<PackingType>("Karton einzeln");

  function save() {
    if (!ref.trim() || !name.trim()) return;
    const p: Product = {
      id: newId("p"),
      reference: ref.trim().toUpperCase(),
      name: name.trim(),
      hasLaserMarking: laser,
      laserText: laser ? laserText.trim() || ref.trim().toUpperCase() : undefined,
      packingType: pack,
      createdAt: Date.now(),
    };
    dispatch({ type: "addProduct", product: p });
    setRef("");
    setName("");
    setLaser(false);
    setLaserText("");
    setPack("Karton einzeln");
  }

  return (
    <div className="grid gap-6 md:grid-cols-[400px,1fr]">
      <div className="border border-ink/20 bg-card p-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/50">
          Neues Produkt anlegen
        </div>
        <h2 className="mt-1 font-display text-xl">Produktreferenz erfassen</h2>

        <label className="mt-4 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink/60">Referenz</label>
        <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="REF-1234" className="mt-1 w-full border-b border-ink/30 bg-transparent py-2 font-mono outline-none focus:border-ink" />

        <label className="mt-4 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink/60">Bezeichnung</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Getriebewelle Ø18" className="mt-1 w-full border-b border-ink/30 bg-transparent py-2 outline-none focus:border-ink" />

        <label className="mt-4 flex items-center gap-2 font-mono text-xs">
          <input type="checkbox" checked={laser} onChange={(e) => setLaser(e.target.checked)} />
          Lasermarkierung erforderlich
        </label>
        {laser && (
          <input value={laserText} onChange={(e) => setLaserText(e.target.value)} placeholder="Gravurtext (Standard: Referenz)" className="mt-2 w-full border-b border-ink/30 bg-transparent py-2 font-mono text-sm outline-none focus:border-ink" />
        )}

        <label className="mt-4 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink/60">Verpackung</label>
        <select value={pack} onChange={(e) => setPack(e.target.value as PackingType)} className="mt-1 w-full border border-ink/25 bg-transparent px-2 py-2 font-mono text-sm">
          {PACKING.map((p) => <option key={p}>{p}</option>)}
        </select>

        <button onClick={save} disabled={!ref.trim() || !name.trim()} className="mt-6 w-full bg-ink px-4 py-3 font-mono text-xs uppercase tracking-[0.22em] text-paper disabled:opacity-30 hover:bg-ink/85">
          Speichern
        </button>
      </div>

      <div className="border border-ink/20 bg-card">
        <div className="border-b border-ink/15 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ink/50">
          Katalog · {state.products.length}
        </div>
        <table className="w-full text-sm">
          <thead className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink/50">
            <tr className="border-b border-ink/10">
              <th className="px-4 py-2 text-left">Referenz</th>
              <th className="px-4 py-2 text-left">Bezeichnung</th>
              <th className="px-4 py-2 text-left">Laser</th>
              <th className="px-4 py-2 text-left">Verpackung</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {state.products.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-2 font-mono">{p.reference}</td>
                <td className="px-4 py-2">{p.name}</td>
                <td className="px-4 py-2 font-mono text-xs">
                  {p.hasLaserMarking ? `✓ ${p.laserText ?? p.reference}` : "—"}
                </td>
                <td className="px-4 py-2 font-mono text-xs">{p.packingType}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Schedule ----------

function ScheduleTab() {
  const { state, dispatch, today, productOf } = useQC();
  const [pid, setPid] = useState<string>(state.products[0]?.id ?? "");
  const [date, setDate] = useState<string>(today);
  const [qty, setQty] = useState<number>(20);

  function schedule() {
    if (!pid) return;
    const job: TestJob = {
      id: newId("j"),
      productId: pid,
      scheduledDate: date,
      quantity: qty,
      instructions: "normal",
      status: "scheduled",
      stations: defaultStations(),
      createdAt: Date.now(),
    };
    dispatch({ type: "scheduleJob", job });
  }

  const scheduled = state.jobs
    .filter((j) => ["scheduled", "in_testing"].includes(j.status))
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));

  return (
    <div className="grid gap-6 md:grid-cols-[380px,1fr]">
      <div className="border border-ink/20 bg-card p-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/50">Neuer Prüfauftrag</div>
        <h2 className="mt-1 font-display text-xl">Prüfung terminieren</h2>

        <label className="mt-4 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink/60">Produkt</label>
        <select value={pid} onChange={(e) => setPid(e.target.value)} className="mt-1 w-full border border-ink/25 bg-transparent px-2 py-2 font-mono text-sm">
          <option value="">— wählen —</option>
          {state.products.map((p) => (
            <option key={p.id} value={p.id}>{p.reference} · {p.name}</option>
          ))}
        </select>

        <label className="mt-4 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink/60">Termin</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full border border-ink/25 bg-transparent px-2 py-2 font-mono text-sm" />

        <label className="mt-4 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink/60">Menge</label>
        <input type="number" min={1} value={qty} onChange={(e) => setQty(parseInt(e.target.value || "0", 10))} className="mt-1 w-full border border-ink/25 bg-transparent px-2 py-2 font-mono text-sm" />

        <button onClick={schedule} disabled={!pid} className="mt-6 w-full bg-ink px-4 py-3 font-mono text-xs uppercase tracking-[0.22em] text-paper disabled:opacity-30 hover:bg-ink/85">
          Auftrag einplanen
        </button>
      </div>

      <div className="border border-ink/20 bg-card">
        <div className="border-b border-ink/15 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ink/50">
          Offene / laufende Aufträge · {scheduled.length}
        </div>
        <div className="divide-y divide-ink/10">
          {scheduled.length === 0 && <div className="p-6 font-mono text-xs text-ink/40">— keine Aufträge —</div>}
          {scheduled.map((j) => {
            const p = productOf(j.productId);
            const done = j.stations.filter((s) => s.status === "done").length;
            return (
              <div key={j.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3">
                  {p && <ProductChip product={p} />}
                  <span className="font-mono text-[10px] text-ink/50">{j.scheduledDate} · {j.quantity} Stk</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      dispatch({
                        type: "setInstructions",
                        jobId: j.id,
                        instructions: j.instructions === "full_check" ? "normal" : "full_check",
                      })
                    }
                    className={`border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${
                      j.instructions === "full_check"
                        ? "border-accent bg-accent/25"
                        : "border-ink/25 hover:border-ink"
                    }`}
                  >
                    {j.instructions === "full_check" ? "✓ Full Check" : "Full Check"}
                  </button>
                  <span className="font-mono text-[10px] text-ink/50">{done}/{j.stations.length}</span>
                  <StatusPill status={j.status} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------- Decisions ----------

function DecisionsTab() {
  const { state, dispatch, productOf } = useQC();
  const jobs = state.jobs.filter((j) => j.status === "awaiting_decision");

  return (
    <div className="space-y-4">
      {jobs.length === 0 && (
        <div className="border border-ink/20 bg-card p-8 text-center font-mono text-sm text-ink/40">
          Keine Freigaben ausstehend.
        </div>
      )}
      {jobs.map((j) => {
        const p = productOf(j.productId);
        const fails = j.stations.filter((s) => s.result === "fail").length;
        return (
          <div key={j.id} className="border border-ink/25 bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/15 px-5 py-3">
              <div className="flex items-center gap-3">
                {p && <ProductChip product={p} />}
                <span className="font-mono text-[10px] text-ink/50">{j.scheduledDate} · {j.quantity} Stk</span>
              </div>
              <div className="flex items-center gap-3">
                {fails > 0 ? (
                  <span className="rounded-sm bg-destructive/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-destructive">
                    {fails} Abweichung{fails > 1 ? "en" : ""}
                  </span>
                ) : (
                  <span className="rounded-sm bg-ok/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ok">
                    Alle in Toleranz
                  </span>
                )}
              </div>
            </div>
            <div className="grid gap-0 md:grid-cols-2">
              <div className="border-b border-ink/10 md:border-b-0 md:border-r">
                <ul className="divide-y divide-ink/10">
                  {j.stations.map((s) => (
                    <li key={s.id} className="flex items-center justify-between px-5 py-2 text-sm">
                      <div>
                        <div>{s.cp.label}</div>
                        <div className="font-mono text-[10px] text-ink/50">
                          {s.cp.spec} · von {s.claimedBy ?? "—"}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs">{s.value ?? "—"}</span>
                        <span
                          className={`rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${
                            s.result === "ok"
                              ? "bg-ok/15 text-ok"
                              : s.result === "fail"
                                ? "bg-destructive/15 text-destructive"
                                : "bg-muted"
                          }`}
                        >
                          {s.result === "ok" ? "OK" : s.result === "fail" ? "NIO" : "—"}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/50">Nächster Schritt</div>
                <div className="mt-1 text-sm text-ink/70">
                  {p?.hasLaserMarking
                    ? "Bei Freigabe → Lasermarkierung → Verpackung"
                    : "Bei Freigabe → direkt Verpackung"}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => dispatch({ type: "decide", jobId: j.id, decision: "pass" })}
                    className="bg-ok px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] text-paper hover:opacity-90"
                  >
                    ✓ Freigeben
                  </button>
                  <button
                    onClick={() => dispatch({ type: "decide", jobId: j.id, decision: "retest" })}
                    className="border border-ink/25 px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] hover:border-ink"
                  >
                    ↻ Erneut prüfen
                  </button>
                  <button
                    onClick={() => dispatch({ type: "decide", jobId: j.id, decision: "reject" })}
                    className="bg-destructive px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] text-destructive-foreground hover:opacity-90"
                  >
                    ✕ Sperren
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
