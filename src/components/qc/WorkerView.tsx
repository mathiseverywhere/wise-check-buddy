import { useMemo, useState, useEffect } from "react";
import {
  useProducts, useTolerancesMap, useJobs, useStations, useReturns,
  activeCheckpoints, getCheckpoint, evaluateValue,
  ensureStation, claimStation, releaseStation, completeStation,
  markJobInTesting, advanceIfComplete, completeMarking, completePacking,
  receiveOrder, transportToInspection, completeReturn, confirmShipment,
  type Product, type TestJob, type Station, type Tolerances, type CheckpointDef, type Checklist, type JobReturn,
} from "@/lib/qcData";
import { AppShell, ProductChip, StatusPill } from "./Shell";

export function WorkerView({ workerName, onSwitchRole }: { workerName: string; onSwitchRole: () => void }) {
  const [tab, setTab] = useState<"receipt" | "transport" | "testing" | "returns" | "marking" | "packing" | "shipment">("testing");
  const products = useProducts();
  const tol = useTolerancesMap();
  const { data: jobs, checklists, refetch } = useJobs();
  const returns = useReturns();

  const receipt = jobs.filter((j) => j.status === "awaiting_receipt");
  const transport = jobs.filter((j) => j.status === "in_transport");
  const testing = jobs.filter((j) => j.status === "in_testing" || j.status === "scheduled");
  const marking = jobs.filter((j) => j.status === "in_marking");
  const packing = jobs.filter((j) => j.status === "in_packing");
  const shipment = jobs.filter((j) => j.status === "in_shipment" && j.shipment_status === "prepared");
  const openReturns = returns.data.filter((r) => r.status === "open");

  return (
    <AppShell
      title="Arbeitsplatz"
      subtitle={`Prüfer: ${workerName}`}
      role="worker"
      onSwitchRole={onSwitchRole}
      tab={tab}
      setTab={(t) => setTab(t as typeof tab)}
      tabs={[
        { id: "receipt", label: "Warenannahme", badge: receipt.length },
        { id: "transport", label: "Transport → Prüfung", badge: transport.length },
        { id: "testing", label: "Prüfung", badge: testing.length },
        { id: "returns", label: "Rücksendungen", badge: openReturns.length },
        { id: "marking", label: "Lasermarkierung", badge: marking.length },
        { id: "packing", label: "Verpackung", badge: packing.length },
        { id: "shipment", label: "Versand", badge: shipment.length },
      ]}
    >
      {tab === "receipt" && <ReceiptTab worker={workerName} jobs={receipt} products={products.data} onDone={refetch} />}
      {tab === "transport" && <TransportTab worker={workerName} jobs={transport} products={products.data} onDone={refetch} />}
      {tab === "testing" && (
        <TestingTab worker={workerName} jobs={testing} products={products.data} tol={tol.data} checklists={checklists} onRefetch={refetch} />
      )}
      {tab === "returns" && <ReturnsTab worker={workerName} returns={openReturns} jobs={jobs} products={products.data} onDone={returns.refetch} />}
      {tab === "marking" && <MarkingTab jobs={marking} products={products.data} onDone={refetch} />}
      {tab === "packing" && <PackingTab jobs={packing} products={products.data} onDone={refetch} />}
      {tab === "shipment" && <ShipmentTab worker={workerName} jobs={shipment} products={products.data} onDone={refetch} />}
    </AppShell>
  );
}

// ---------- Transport (Lager → Prüfzentrum) ----------

function TransportTab({ worker, jobs, products, onDone }: { worker: string; jobs: TestJob[]; products: Product[]; onDone: () => void }) {
  if (jobs.length === 0) return <div className="border border-ink/20 bg-card p-10 text-center font-mono text-sm text-ink/40">Nichts zu transportieren.</div>;
  return (
    <div className="space-y-3">
      <div className="border border-ink/15 bg-muted px-4 py-2 font-mono text-[11px] text-ink/60">
        Ware aus dem Lager holen, Prüf-Etikett (Inspection-Tag) vergeben und ins Prüfzentrum bringen. Das Etikett erscheint anschließend im Prüfungsfenster.
      </div>
      {jobs.map((j) => {
        const p = products.find((x) => x.id === j.product_id);
        return <TransportCard key={j.id} worker={worker} job={j} product={p} onDone={onDone} />;
      })}
    </div>
  );
}

function TransportCard({ worker, job, product, onDone }: { worker: string; job: TestJob; product: Product | undefined; onDone: () => void }) {
  const suggested = `T-${(job.order_number ?? job.id.slice(0, 4)).toString().slice(-6)}-${new Date().toISOString().slice(5,10).replace("-","")}`;
  const [tag, setTag] = useState(suggested);
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (!tag.trim()) return;
    setBusy(true);
    try { await transportToInspection(job.id, tag.trim(), worker); onDone(); } finally { setBusy(false); }
  }
  return (
    <div className="border border-ink/25 bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {product && <ProductChip product={product} orderNumber={job.order_number} />}
          <div className="mt-1 font-mono text-[10px] text-ink/50">
            Lagerort: <b>{job.storage_location ?? "—"}</b> · {job.incoming_qty ?? job.quantity_total} Stk · {job.customer} ← {job.supplier}
          </div>
          {job.instructions === "full_check" && (
            <span className="mt-1 inline-block tape-stripes px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-paper">Full Check</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink/60">Prüf-Etikett
            <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="z.B. T-1234-1116" className="ml-2 border-b border-ink/30 bg-transparent px-1 py-2 font-mono text-xs w-56 normal-case tracking-normal" />
          </label>
          <button onClick={submit} disabled={busy || !tag.trim()} className="bg-ink px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] text-paper disabled:opacity-30 hover:bg-ink/85">
            {busy ? "…" : "Etikettiert → ins Prüfzentrum"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Warenannahme ----------

function ReceiptTab({ worker, jobs, products, onDone }: { worker: string; jobs: TestJob[]; products: Product[]; onDone: () => void }) {
  if (jobs.length === 0) return <div className="border border-ink/20 bg-card p-10 text-center font-mono text-sm text-ink/40">Keine Bestellungen zur Annahme.</div>;
  return (
    <div className="space-y-3">
      {jobs.map((j) => {
        const p = products.find((x) => x.id === j.product_id);
        return <ReceiptCard key={j.id} worker={worker} job={j} product={p} onDone={onDone} />;
      })}
    </div>
  );
}

function ReceiptCard({ worker, job, product, onDone }: { worker: string; job: TestJob; product: Product | undefined; onDone: () => void }) {
  const [loc, setLoc] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (!loc.trim()) return;
    setBusy(true);
    try { await receiveOrder(job.id, loc.trim(), worker); onDone(); } finally { setBusy(false); }
  }
  return (
    <div className="border border-ink/25 bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {product && <ProductChip product={product} orderNumber={job.order_number} />}
          <div className="mt-1 font-mono text-[10px] text-ink/50">
            Kunde: <b>{job.customer}</b> · Lieferant: <b>{job.supplier}</b> · {job.incoming_qty} Stk
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="Lagerort (z.B. Regal A-12)" className="border-b border-ink/30 bg-transparent px-1 py-2 font-mono text-xs w-56" />
          <button onClick={submit} disabled={busy || !loc.trim()} className="bg-ink px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] text-paper disabled:opacity-30 hover:bg-ink/85">
            {busy ? "…" : "Angekommen → auf Lager"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Testing ----------

function TestingTab({
  worker, jobs, products, tol, checklists, onRefetch,
}: {
  worker: string;
  jobs: TestJob[];
  products: Product[];
  tol: Record<string, Tolerances>;
  checklists: Record<string, Checklist>;
  onRefetch: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const job = useMemo(() => jobs.find((j) => j.id === selectedId) ?? jobs[0], [jobs, selectedId]);
  const productOf = (id: string) => products.find((p) => p.id === id);

  const fullCheckActive = jobs.find((j) => j.instructions === "full_check" && (j.status === "in_testing" || j.status === "scheduled"));

  return (
    <div className="grid gap-4 md:grid-cols-[320px,1fr]">
      <aside className="border border-ink/20 bg-card">
        <div className="border-b border-ink/15 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ink/50">
          Aufträge · {jobs.length}
        </div>
        <ul className="divide-y divide-ink/10">
          {jobs.length === 0 && <li className="p-4 font-mono text-xs text-ink/40">— keine offenen —</li>}
          {jobs.map((j) => {
            const p = productOf(j.product_id);
            const active = job?.id === j.id;
            return (
              <li key={j.id}>
                <button
                  onClick={() => setSelectedId(j.id)}
                  className={`block w-full px-4 py-3 text-left transition ${active ? "bg-ink text-paper" : "hover:bg-muted"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm">{j.order_number ? `#${j.order_number}` : ""} {p?.reference}</span>
                    {j.instructions === "full_check" && (
                      <span className="tape-stripes px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-paper">Full</span>
                    )}
                  </div>
                  <div className={`mt-1 font-mono text-[10px] ${active ? "text-paper/60" : "text-ink/50"}`}>
                    {j.scheduled_date} · {j.incoming_qty ?? j.quantity_total} Stk
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <section>
        {!job && <div className="border border-ink/20 bg-card p-10 text-center font-mono text-sm text-ink/40">Kein Auftrag ausgewählt.</div>}
        {job && (
          <JobDetail
            key={job.id}
            job={job}
            product={productOf(job.product_id) ?? null}
            tolerances={tol[job.product_id] ?? null}
            checklist={checklists[job.id] ?? null}
            worker={worker}
            blocked={!!(fullCheckActive && fullCheckActive.id !== job.id)}
            fullCheckRef={fullCheckActive && fullCheckActive.id !== job.id ? productOf(fullCheckActive.product_id)?.reference : undefined}
            onRefetch={onRefetch}
          />
        )}
      </section>
    </div>
  );
}

function JobDetail({
  job, product, tolerances, checklist, worker, blocked, fullCheckRef, onRefetch,
}: {
  job: TestJob;
  product: Product | null;
  tolerances: Tolerances | null;
  checklist: Checklist | null;
  worker: string;
  blocked: boolean;
  fullCheckRef?: string;
  onRefetch: () => void;
}) {
  const active = activeCheckpoints(checklist, tolerances);
  const activeKeys = active.map((c) => c.key);
  const { data: stationMap, refetch: refetchStations } = useStations([job.id]);
  const stations = stationMap[job.id] ?? [];
  const [openKey, setOpenKey] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const existing = new Set(stations.map((s) => s.checkpoint_key));
      const missing = activeKeys.filter((k) => !existing.has(k));
      if (missing.length === 0) return;
      for (const k of missing) await ensureStation(job.id, k);
      refetchStations();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.id, activeKeys.join(",")]);

  const today = new Date().toISOString().slice(0, 10);
  const doneCount = stations.filter((s) => s.status === "done" && activeKeys.includes(s.checkpoint_key)).length;
  const failCount = stations.filter((s) => s.result === "fail").length;
  const myClaimedToday = stations.some((s) => s.status === "claimed" && s.claimed_by === worker && s.claimed_date === today);

  async function onClaim(s: Station) {
    await claimStation(s.id, worker, today);
    await markJobInTesting(job.id);
    refetchStations();
    onRefetch();
  }
  async function onRelease(s: Station) {
    await releaseStation(s.id);
    refetchStations();
  }
  async function onSubmit(s: Station, measurements: any, result: "ok" | "fail" | "unrated", note?: string) {
    await completeStation(s.id, measurements, result, note);
    await advanceIfComplete(job.id, activeKeys);
    refetchStations();
    onRefetch();
  }

  return (
    <div className="border border-ink/25 bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/15 px-6 py-4">
        <div>
          {product && <ProductChip product={product} orderNumber={job.order_number} />}
          <div className="mt-1 font-mono text-[10px] text-ink/50">
            Kunde {job.customer ?? "—"} · Lieferant {job.supplier ?? "—"} · Ort {job.storage_location ?? "—"}
          </div>
          <div className="mt-0.5 font-mono text-[10px] text-ink/50">
            {job.scheduled_date} · Menge {job.incoming_qty ?? job.quantity_total} · Prüfmengen I{job.sample_inner}/A{job.sample_outer}/B{job.sample_width}, allg. {job.sample_general}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {job.instructions === "full_check" && (
            <span className="tape-stripes px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-paper">Full Check</span>
          )}
          <StatusPill status={job.status} />
        </div>
      </div>

      {blocked && (
        <div className="border-b border-accent/40 bg-accent/10 px-6 py-3 font-mono text-xs">
          Full Check auf {fullCheckRef ?? "einem anderen Auftrag"} aktiv — dieser Auftrag darf nicht angefangen werden.
        </div>
      )}
      {job.office_note && <div className="border-b border-ink/10 bg-muted px-6 py-2 font-mono text-xs">Büro: {job.office_note}</div>}
      {checklist?.extra_instructions && <div className="border-b border-ink/10 bg-muted px-6 py-2 font-mono text-xs">Anweisung: {checklist.extra_instructions}</div>}

      <div className="border-b border-ink/10 px-6 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink/50">
        Stationen · {doneCount}/{active.length} · Abweichungen: {failCount}
      </div>

      <ul className="divide-y divide-ink/10">
        {active.map((cp) => {
          const station = stations.find((s) => s.checkpoint_key === cp.key);
          const isOpen = openKey === cp.key;
          const highlight = station?.result === "fail";
          const mine = station?.claimed_by === worker;
          return (
            <li key={cp.key} className={`px-6 py-3 ${highlight ? "bg-destructive/8" : ""} ${isOpen ? "bg-muted" : ""}`}>
              <button className="flex w-full items-center justify-between text-left" onClick={() => setOpenKey(isOpen ? null : cp.key)}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={highlight ? "font-semibold text-destructive" : ""}>{cp.labelCn} · {cp.label}</span>
                    {highlight && <span className="rounded-sm bg-destructive/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-destructive">außer Toleranz</span>}
                  </div>
                  <div className="font-mono text-[10px] text-ink/50">
                    {toleranceLabel(cp, tolerances, product)} · {station?.claimed_by ? `${station.claimed_by} (${station.claimed_date})` : "offen"}
                  </div>
                </div>
                <StationBadge station={station ?? null} mine={mine} />
              </button>

              {isOpen && station && (
                <StationForm
                  key={station.id + station.status}
                  station={station}
                  cp={cp}
                  tolerances={tolerances}
                  job={job}
                  canClaim={!blocked && station.status === "open" && !myClaimedToday}
                  claimHint={station.status === "open" ? (myClaimedToday ? "Heute schon eine Station in Bearbeitung." : blocked ? "Blockiert durch Full Check." : undefined) : undefined}
                  isMine={mine}
                  onClaim={() => onClaim(station)}
                  onRelease={() => onRelease(station)}
                  onSubmit={(m, r, n) => onSubmit(station, m, r, n)}
                />
              )}
            </li>
          );
        })}
        {active.length === 0 && <li className="px-6 py-6 font-mono text-xs text-ink/50">Keine Prüfpunkte für diesen Auftrag ausgewählt.</li>}
      </ul>
    </div>
  );
}

function toleranceLabel(cp: CheckpointDef, tol: Tolerances | null, product: Product | null): string {
  if (cp.visual) return "visuelle Prüfung";
  const min = cp.tolMinKey ? tol?.[cp.tolMinKey] : null;
  const max = cp.tolMaxKey ? tol?.[cp.tolMaxKey] : null;
  if (min == null && max == null) return "keine Toleranz in DB — Freieingabe";
  if (cp.nominalKey && product) {
    const nom = product[cp.nominalKey];
    return `Soll: ${nom ?? "?"} mm · Abweichung erlaubt ${min ?? "—"}…${max ?? "—"} μm`;
  }
  return `${min ?? "—"}…${max ?? "—"} ${cp.unit ?? ""}`;
}

function StationBadge({ station, mine }: { station: Station | null; mine: boolean }) {
  if (!station) return <span className="rounded-sm border border-ink/30 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em]">wird angelegt…</span>;
  if (station.status === "done") {
    const cls = station.result === "ok" ? "bg-ok/15 text-ok" : station.result === "fail" ? "bg-destructive/15 text-destructive" : "bg-ink/10 text-ink/60";
    return <span className={`rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${cls}`}>{station.result?.toUpperCase() ?? "—"}</span>;
  }
  if (station.status === "claimed") {
    return <span className={`rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${mine ? "bg-ink text-paper" : "bg-accent/25"}`}>{mine ? "Meine" : "belegt"}</span>;
  }
  return <span className="rounded-sm border border-ink/30 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em]">offen</span>;
}

function StationForm({
  station, cp, tolerances, job, canClaim, claimHint, isMine, onClaim, onRelease, onSubmit,
}: {
  station: Station;
  cp: CheckpointDef;
  tolerances: Tolerances | null;
  job: TestJob;
  canClaim: boolean;
  claimHint?: string;
  isMine: boolean;
  onClaim: () => void;
  onRelease: () => void;
  onSubmit: (m: any, r: "ok" | "fail" | "unrated", note?: string) => void;
}) {
  const sampleCount = cp.sampleField ? Math.max(1, job[cp.sampleField]) : 1;
  const multi = !cp.visual && (cp.key === "inner_dia" || cp.key === "outer_dia" || cp.key === "width");
  const [values, setValues] = useState<string[]>(() => Array.from({ length: multi ? sampleCount : 1 }, () => ""));
  const [visual, setVisual] = useState<"ok" | "fail" | null>(null);
  const [note, setNote] = useState("");

  if (station.status === "done") {
    return (
      <div className="mt-3 rounded-sm bg-muted p-3 font-mono text-xs">
        Ergebnis: <b>{formatVals(station.measurements)}</b> · {station.result === "ok" ? "in Toleranz" : station.result === "fail" ? "außer Toleranz" : "unbewertet"} · {station.claimed_by} ({station.claimed_date})
        {station.note && <div className="mt-1 text-ink/60">Notiz: {station.note}</div>}
      </div>
    );
  }
  if (station.status === "open") {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button onClick={onClaim} disabled={!canClaim} className="bg-ink px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] text-paper disabled:opacity-30 hover:bg-ink/85">
          Station übernehmen
        </button>
        {claimHint && <span className="font-mono text-xs text-ink/50">{claimHint}</span>}
      </div>
    );
  }
  if (!isMine) {
    return <div className="mt-3 font-mono text-xs text-ink/60">Belegt durch {station.claimed_by}. Warteschlange — nächste Station wählen.</div>;
  }

  const evaluations = values.map((v) => cp.visual ? null : evaluateValue(v, cp, tolerances));
  const overall: "ok" | "fail" | "unrated" | null =
    cp.visual ? (visual ?? null) :
    (() => {
      if (values.every((v) => v.trim() === "")) return null;
      const anyFail = evaluations.some((r) => r === "fail");
      const anyEvaluated = evaluations.some((r) => r != null);
      if (!anyEvaluated) return "unrated";
      return anyFail ? "fail" : "ok";
    })();

  function submit() {
    if (cp.visual) {
      if (!visual) return;
      onSubmit({ visual }, visual, note || undefined);
      return;
    }
    const nums = values.map((v) => v.trim() === "" ? null : parseFloat(v.replace(",", ".")));
    onSubmit({ values: multi ? nums : nums[0] }, (overall as any) ?? "unrated", note || undefined);
  }

  return (
    <div className="mt-3 space-y-3">
      {cp.visual ? (
        <div className="flex gap-2">
          <button onClick={() => setVisual("ok")} className={`border px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] ${visual === "ok" ? "border-ok bg-ok/15 text-ok" : "border-ink/25"}`}>✓ i.O.</button>
          <button onClick={() => setVisual("fail")} className={`border px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] ${visual === "fail" ? "border-destructive bg-destructive/15 text-destructive" : "border-ink/25"}`}>✕ n.i.O.</button>
        </div>
      ) : (
        <div>
          {multi ? (
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {values.map((v, i) => {
                const r = evaluations[i];
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-ink/50 w-6">#{i + 1}</span>
                    <input
                      inputMode="decimal"
                      value={v}
                      onChange={(e) => { const n = [...values]; n[i] = e.target.value; setValues(n); }}
                      placeholder="Abweichung"
                      className="w-full border-b border-ink/30 bg-transparent py-1 font-mono outline-none focus:border-ink"
                    />
                    <span className="font-mono text-[10px] text-ink/40">{cp.unit}</span>
                    {r && <span className={`rounded-sm px-1 py-0.5 font-mono text-[9px] uppercase ${r === "ok" ? "bg-ok/15 text-ok" : "bg-destructive/15 text-destructive"}`}>{r}</span>}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-end gap-3">
              <input
                inputMode="decimal"
                value={values[0]}
                onChange={(e) => setValues([e.target.value])}
                placeholder="0"
                className="w-40 border-b-2 border-ink/30 bg-transparent py-2 font-mono text-xl outline-none focus:border-ink"
              />
              {cp.unit && <span className="pb-2 font-mono text-sm text-ink/50">{cp.unit}</span>}
              {evaluations[0] && (
                <span className={`ml-auto rounded-sm px-2 py-1 font-mono text-[10px] uppercase ${evaluations[0] === "ok" ? "bg-ok/15 text-ok" : "bg-destructive/15 text-destructive"}`}>{evaluations[0]}</span>
              )}
            </div>
          )}
          {overall === "unrated" && <div className="mt-1 font-mono text-[10px] text-ink/50">Keine Toleranz in DB → wird als "unbewertet" gespeichert.</div>}
        </div>
      )}

      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notiz (optional)" rows={2} className="w-full border border-ink/20 bg-transparent px-2 py-1 font-mono text-xs" />

      <div className="flex gap-2">
        <button onClick={submit} disabled={!overall} className="bg-ink px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] text-paper disabled:opacity-30 hover:bg-ink/85">
          Ergebnis bestätigen
        </button>
        <button onClick={onRelease} className="border border-ink/25 px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] hover:border-ink">Freigeben</button>
      </div>
    </div>
  );
}

function formatVals(m: any): string {
  if (!m) return "—";
  if (Array.isArray(m?.values)) return m.values.map((v: any) => v == null ? "—" : v).join(", ");
  if (m?.value != null) return String(m.value);
  if (m?.visual) return m.visual === "ok" ? "i.O." : "n.i.O.";
  return "—";
}

// ---------- Rücksendungen ----------

function ReturnsTab({ worker, returns, jobs, products, onDone }: { worker: string; returns: JobReturn[]; jobs: TestJob[]; products: Product[]; onDone: () => void }) {
  if (returns.length === 0) return <div className="border border-ink/20 bg-card p-10 text-center font-mono text-sm text-ink/40">Keine offenen Rücksendungen.</div>;
  return (
    <div className="space-y-3">
      {returns.map((r) => {
        const j = jobs.find((x) => x.id === r.job_id);
        const p = j ? products.find((x) => x.id === j.product_id) : undefined;
        return (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 border border-ink/25 bg-card p-4">
            <div>
              {p && j && <ProductChip product={p} orderNumber={j.order_number} />}
              <div className="mt-1 font-mono text-[10px] text-ink/50">
                <b>{r.quantity}</b> fehlerhafte Stk · Kunde {j?.customer ?? "—"} · Lieferant {j?.supplier ?? "—"}
              </div>
              {r.note && <div className="mt-1 font-mono text-xs">{r.note}</div>}
            </div>
            <button
              onClick={async () => { await completeReturn(r.id, worker); onDone(); }}
              className="bg-ink px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] text-paper hover:bg-ink/85"
            >
              Rücksendung erledigt
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Marking ----------

function MarkingTab({ jobs, products, onDone }: { jobs: TestJob[]; products: Product[]; onDone: () => void }) {
  if (jobs.length === 0) return <div className="border border-ink/20 bg-card p-10 text-center font-mono text-sm text-ink/40">Keine Produkte in Lasermarkierung.</div>;
  return (
    <div className="space-y-3">
      {jobs.map((j) => {
        const p = products.find((x) => x.id === j.product_id);
        const text = j.laser_text ?? p?.laser_text ?? p?.reference;
        return (
          <div key={j.id} className="flex flex-wrap items-center justify-between gap-3 border border-ink/20 bg-card p-4">
            <div>
              {p && <ProductChip product={p} orderNumber={j.order_number} />}
              <div className="mt-1 font-mono text-[10px] text-ink/50">Menge {j.incoming_qty ?? j.quantity_total} · Gravur: <b>{text}</b></div>
            </div>
            <button onClick={async () => { await completeMarking(j.id); onDone(); }} className="bg-ink px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] text-paper hover:bg-ink/85">
              Markierung abgeschlossen
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Packing ----------

function PackingTab({ jobs, products, onDone }: { jobs: TestJob[]; products: Product[]; onDone: () => void }) {
  if (jobs.length === 0) return <div className="border border-ink/20 bg-card p-10 text-center font-mono text-sm text-ink/40">Keine Produkte in Verpackung.</div>;
  return (
    <div className="space-y-3">
      {jobs.map((j) => {
        const p = products.find((x) => x.id === j.product_id);
        return (
          <div key={j.id} className="flex flex-wrap items-center justify-between gap-3 border border-ink/20 bg-card p-4">
            <div>
              {p && <ProductChip product={p} orderNumber={j.order_number} />}
              <div className="mt-1 font-mono text-[10px] text-ink/50">Menge {j.incoming_qty ?? j.quantity_total} · Verpackung: <b>{p?.packing_type ?? "—"}</b></div>
            </div>
            <button onClick={async () => { await completePacking(j.id); onDone(); }} className="bg-ink px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] text-paper hover:bg-ink/85">
              Verpackt → Versand
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Versand (Arbeiter bestätigt) ----------

function ShipmentTab({ worker, jobs, products, onDone }: { worker: string; jobs: TestJob[]; products: Product[]; onDone: () => void }) {
  void worker;
  if (jobs.length === 0) return <div className="border border-ink/20 bg-card p-10 text-center font-mono text-sm text-ink/40">Keine Aufträge im Versand vorbereitet.</div>;
  return (
    <div className="space-y-3">
      {jobs.map((j) => {
        const p = products.find((x) => x.id === j.product_id);
        return (
          <div key={j.id} className="flex flex-wrap items-center justify-between gap-3 border border-ink/25 bg-card p-4">
            <div>
              {p && <ProductChip product={p} orderNumber={j.order_number} />}
              <div className="mt-1 font-mono text-[10px] text-ink/50">
                Menge {j.incoming_qty ?? j.quantity_total} · {j.shipment_mode === "air" ? "Luftfracht" : "Seefracht"} → <b>{j.destination_country}</b>
              </div>
              <div className="mt-1 font-mono text-[10px] text-ink/50">Kunde: {j.customer}</div>
            </div>
            <button onClick={async () => { await confirmShipment(j.id); onDone(); }} className="bg-ok px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] text-paper hover:opacity-85">
              Versendet — fertig
            </button>
          </div>
        );
      })}
    </div>
  );
}
