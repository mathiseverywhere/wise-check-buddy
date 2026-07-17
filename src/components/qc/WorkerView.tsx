import { useMemo, useState, useEffect } from "react";
import {
  useProducts, useTolerancesMap, useJobs, useStations, useReturns, usePallets,
  activeCheckpoints, getCheckpoint, evaluateValue,
  ensureStation, claimStation, releaseStation, completeStation,
  markJobInTesting, advanceIfComplete, completeMarking, completePacking, completePalletPacking,
  receiveOrder, transportToInspection, completeReturn, confirmShipment,
  type Product, type TestJob, type Station, type Tolerances, type CheckpointDef, type Checklist, type JobReturn, type Pallet,
} from "@/lib/qcData";
import { AppShell, ProductChip, StatusPill } from "./Shell";
import { useBi } from "@/lib/i18n";

export function WorkerView({ workerName, onSwitchRole }: { workerName: string; onSwitchRole: () => void }) {
  const [tab, setTab] = useState<"receipt" | "transport" | "testing" | "returns" | "marking" | "packing" | "shipment">("testing");
  const bi = useBi();
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
      title={bi("Workstation", "工作站")}
      subtitle={`${bi("Inspector", "检验员")}: ${workerName}`}
      role="worker"
      onSwitchRole={onSwitchRole}
      tab={tab}
      setTab={(t) => setTab(t as typeof tab)}
      tabs={[
        { id: "receipt", label: bi("Goods receipt", "收货"), badge: receipt.length },
        { id: "transport", label: bi("Transport → Inspection", "运输 → 检验"), badge: transport.length },
        { id: "testing", label: bi("Inspection", "检验"), badge: testing.length },
        { id: "returns", label: bi("Returns", "退货"), badge: openReturns.length },
        { id: "marking", label: bi("Laser marking", "激光打标"), badge: marking.length },
        { id: "packing", label: bi("Packing", "包装"), badge: packing.length },
        { id: "shipment", label: bi("Shipment", "出货"), badge: shipment.length },
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

// ---------- Batch helpers ----------

function groupByReference(jobs: TestJob[], products: Product[]): { ref: string; product: Product | undefined; items: TestJob[] }[] {
  const map = new Map<string, TestJob[]>();
  for (const j of jobs) {
    const p = products.find((x) => x.id === j.product_id);
    const ref = p?.reference ?? "—";
    (map.get(ref) ?? map.set(ref, []).get(ref)!).push(j);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([ref, items]) => ({ ref, product: products.find((x) => x.reference === ref), items }));
}

function BatchGroupHeader({
  product, ref, items, selected, onToggleAll, children,
}: {
  product: Product | undefined;
  ref: string;
  items: TestJob[];
  selected: Set<string>;
  onToggleAll: () => void;
  children?: React.ReactNode;
}) {
  const allSelected = items.every((j) => selected.has(j.id));
  const anySelected = items.some((j) => selected.has(j.id));
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/15 bg-muted/60 px-4 py-2">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={allSelected}
          ref={(el) => { if (el) el.indeterminate = !allSelected && anySelected; }}
          onChange={onToggleAll}
          className="h-4 w-4 accent-ink"
        />
        <span className="font-mono text-sm font-semibold">{ref}</span>
        <span className="font-mono text-[10px] text-ink/50">{product?.name ?? ""}</span>
        <span className="ml-2 font-mono text-[10px] text-ink/50">· {items.length} orders</span>
      </label>
      {children}
    </div>
  );
}

// ---------- Transport (Warehouse → Inspection center) ----------

function TransportTab({ worker, jobs, products, onDone }: { worker: string; jobs: TestJob[]; products: Product[]; onDone: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tagPrefix, setTagPrefix] = useState("");
  const [busy, setBusy] = useState(false);
  const groups = useMemo(() => groupByReference(jobs, products), [jobs, products]);

  if (jobs.length === 0) return <div className="border border-ink/20 bg-card p-10 text-center font-mono text-sm text-ink/40">Nothing to transport.</div>;

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleGroup = (items: TestJob[]) => setSelected((s) => {
    const n = new Set(s);
    const all = items.every((j) => n.has(j.id));
    for (const j of items) { if (all) n.delete(j.id); else n.add(j.id); }
    return n;
  });

  async function submitBatch() {
    const chosen = jobs.filter((j) => selected.has(j.id));
    if (chosen.length === 0) return;
    const stamp = new Date().toISOString().slice(5,10).replace("-","");
    const base = tagPrefix.trim() || "T";
    setBusy(true);
    try {
      for (let i = 0; i < chosen.length; i++) {
        const j = chosen[i];
        const suffix = (j.order_number ?? j.id.slice(0,4)).toString().slice(-6);
        const tag = `${base}-${suffix}-${stamp}${chosen.length > 1 ? `-${i+1}` : ""}`;
        await transportToInspection(j.id, tag, worker);
      }
      setSelected(new Set());
      onDone();
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 border border-ink/15 bg-muted px-4 py-2">
        <div className="font-mono text-[11px] text-ink/60">
          Select one or more orders (same reference recommended), assign an inspection tag and move them to inspection.
        </div>
        <div className="flex items-center gap-2">
          <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink/60">Tag prefix
            <input value={tagPrefix} onChange={(e) => setTagPrefix(e.target.value)} placeholder="T" className="ml-2 border-b border-ink/30 bg-transparent px-1 py-1 font-mono text-xs w-24 normal-case tracking-normal" />
          </label>
          <button onClick={submitBatch} disabled={busy || selected.size === 0} className="bg-ink px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] text-paper disabled:opacity-30 hover:bg-ink/85">
            {busy ? "…" : `Tag ${selected.size} → to inspection`}
          </button>
        </div>
      </div>
      {groups.map(({ ref, product, items }) => (
        <div key={ref} className="border border-ink/25 bg-card">
          <BatchGroupHeader product={product} ref={ref} items={items} selected={selected} onToggleAll={() => toggleGroup(items)} />
          <ul className="divide-y divide-ink/10">
            {items.map((j) => {
              const p = products.find((x) => x.id === j.product_id);
              const checked = selected.has(j.id);
              return (
                <li key={j.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${checked ? "bg-accent/10" : ""}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggle(j.id)} className="h-4 w-4 accent-ink" />
                  <div className="flex-1">
                    {p && <ProductChip product={p} orderNumber={j.order_number} />}
                    <div className="mt-1 font-mono text-[10px] text-ink/50">
                      Location: <b>{j.storage_location ?? "—"}</b> · {j.incoming_qty ?? j.quantity_total} pcs · {j.customer} ← {j.supplier}
                    </div>
                  </div>
                  {j.instructions === "full_check" && (
                    <span className="tape-stripes px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-paper">Full check</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ---------- Goods receipt ----------

function ReceiptTab({ worker, jobs, products, onDone }: { worker: string; jobs: TestJob[]; products: Product[]; onDone: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loc, setLoc] = useState("");
  const [busy, setBusy] = useState(false);
  const groups = useMemo(() => groupByReference(jobs, products), [jobs, products]);

  if (jobs.length === 0) return <div className="border border-ink/20 bg-card p-10 text-center font-mono text-sm text-ink/40">No orders to receive.</div>;

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleGroup = (items: TestJob[]) => setSelected((s) => {
    const n = new Set(s);
    const all = items.every((j) => n.has(j.id));
    for (const j of items) { if (all) n.delete(j.id); else n.add(j.id); }
    return n;
  });

  async function submitBatch() {
    if (!loc.trim() || selected.size === 0) return;
    setBusy(true);
    try {
      for (const id of selected) await receiveOrder(id, loc.trim(), worker);
      setSelected(new Set());
      onDone();
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 border border-ink/15 bg-muted px-4 py-2">
        <div className="font-mono text-[11px] text-ink/60">
          Select orders of the same reference and book them to a common storage location in one step.
        </div>
        <div className="flex items-center gap-2">
          <input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="Storage location (e.g. Rack A-12)" className="border-b border-ink/30 bg-transparent px-1 py-1 font-mono text-xs w-56" />
          <button onClick={submitBatch} disabled={busy || !loc.trim() || selected.size === 0} className="bg-ink px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] text-paper disabled:opacity-30 hover:bg-ink/85">
            {busy ? "…" : `Receive ${selected.size} → stock`}
          </button>
        </div>
      </div>
      {groups.map(({ ref, product, items }) => (
        <div key={ref} className="border border-ink/25 bg-card">
          <BatchGroupHeader product={product} ref={ref} items={items} selected={selected} onToggleAll={() => toggleGroup(items)} />
          <ul className="divide-y divide-ink/10">
            {items.map((j) => {
              const p = products.find((x) => x.id === j.product_id);
              const checked = selected.has(j.id);
              return (
                <li key={j.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${checked ? "bg-accent/10" : ""}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggle(j.id)} className="h-4 w-4 accent-ink" />
                  <div className="flex-1">
                    {p && <ProductChip product={p} orderNumber={j.order_number} />}
                    <div className="mt-1 font-mono text-[10px] text-ink/50">
                      Customer: <b>{j.customer}</b> · Supplier: <b>{j.supplier}</b> · {j.incoming_qty} pcs
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
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
          Jobs · {jobs.length}
        </div>
        <ul className="divide-y divide-ink/10">
          {jobs.length === 0 && <li className="p-4 font-mono text-xs text-ink/40">— none open —</li>}
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
                  {j.inspection_tag && (
                    <div className={`mt-1 inline-block rounded-sm px-1.5 py-0.5 font-mono text-[10px] ${active ? "bg-paper text-ink" : "bg-accent text-ink"}`}>
                      🏷 {j.inspection_tag}
                    </div>
                  )}
                  <div className={`mt-1 font-mono text-[10px] ${active ? "text-paper/60" : "text-ink/50"}`}>
                    {j.scheduled_date} · {j.incoming_qty ?? j.quantity_total} pcs
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <section>
        {!job && <div className="border border-ink/20 bg-card p-10 text-center font-mono text-sm text-ink/40">No job selected.</div>}
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
          {product && <ProductChip product={product} orderNumber={job.order_number} inspectionTag={job.inspection_tag} />}
          <div className="mt-1 font-mono text-[10px] text-ink/50">
            Customer {job.customer ?? "—"} · Supplier {job.supplier ?? "—"} · Location {job.storage_location ?? "—"}
          </div>
          <div className="mt-0.5 font-mono text-[10px] text-ink/50">
            {job.scheduled_date} · Qty {job.incoming_qty ?? job.quantity_total} · Samples I{job.sample_inner}/A{job.sample_outer}/B{job.sample_width}, gen. {job.sample_general}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {job.instructions === "full_check" && (
            <span className="tape-stripes px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-paper">Full check</span>
          )}
          <StatusPill status={job.status} />
        </div>
      </div>

      {blocked && (
        <div className="border-b border-accent/40 bg-accent/10 px-6 py-3 font-mono text-xs">
          Full check auf {fullCheckRef ?? "another job"} active — this job must not be started.
        </div>
      )}
      {job.office_note && <div className="border-b border-ink/10 bg-muted px-6 py-2 font-mono text-xs">Office: {job.office_note}</div>}
      {checklist?.extra_instructions && <div className="border-b border-ink/10 bg-muted px-6 py-2 font-mono text-xs">Instruction: {checklist.extra_instructions}</div>}

      <div className="border-b border-ink/10 px-6 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink/50">
        Stations · {doneCount}/{active.length} · Deviations: {failCount}
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
                    {highlight && <span className="rounded-sm bg-destructive/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-destructive">out of tolerance</span>}
                  </div>
                  <div className="font-mono text-[10px] text-ink/50">
                    {toleranceLabel(cp, tolerances, product)} · {station?.claimed_by ? `${station.claimed_by} (${station.claimed_date})` : "open"}
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
                  claimHint={station.status === "open" ? (myClaimedToday ? "Already working on a station today." : blocked ? "Blockiert durch Full check." : undefined) : undefined}
                  isMine={mine}
                  onClaim={() => onClaim(station)}
                  onRelease={() => onRelease(station)}
                  onSubmit={(m, r, n) => onSubmit(station, m, r, n)}
                />
              )}
            </li>
          );
        })}
        {active.length === 0 && <li className="px-6 py-6 font-mono text-xs text-ink/50">No checkpoints selected for this job.</li>}
      </ul>
    </div>
  );
}

function toleranceLabel(cp: CheckpointDef, tol: Tolerances | null, product: Product | null): string {
  if (cp.visual) return "visuelle Inspection";
  const min = cp.tolMinKey ? tol?.[cp.tolMinKey] : null;
  const max = cp.tolMaxKey ? tol?.[cp.tolMaxKey] : null;
  if (min == null && max == null) return "no tolerance in DB — free entry";
  if (cp.nominalKey && product) {
    const nom = product[cp.nominalKey];
    return `Target: ${nom ?? "?"} mm · Deviation erlaubt ${min ?? "—"}…${max ?? "—"} μm`;
  }
  return `${min ?? "—"}…${max ?? "—"} ${cp.unit ?? ""}`;
}

function StationBadge({ station, mine }: { station: Station | null; mine: boolean }) {
  if (!station) return <span className="rounded-sm border border-ink/30 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em]">wird created…</span>;
  if (station.status === "done") {
    const cls = station.result === "ok" ? "bg-ok/15 text-ok" : station.result === "fail" ? "bg-destructive/15 text-destructive" : "bg-ink/10 text-ink/60";
    return <span className={`rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${cls}`}>{station.result?.toUpperCase() ?? "—"}</span>;
  }
  if (station.status === "claimed") {
    return <span className={`rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${mine ? "bg-ink text-paper" : "bg-accent/25"}`}>{mine ? "Mine" : "claimed"}</span>;
  }
  return <span className="rounded-sm border border-ink/30 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em]">open</span>;
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
        Result: <b>{formatVals(station.measurements)}</b> · {station.result === "ok" ? "in tolerance" : station.result === "fail" ? "out of tolerance" : "unrated"} · {station.claimed_by} ({station.claimed_date})
        {station.note && <div className="mt-1 text-ink/60">Note: {station.note}</div>}
      </div>
    );
  }
  if (station.status === "open") {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button onClick={onClaim} disabled={!canClaim} className="bg-ink px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] text-paper disabled:opacity-30 hover:bg-ink/85">
          Claim station
        </button>
        {claimHint && <span className="font-mono text-xs text-ink/50">{claimHint}</span>}
      </div>
    );
  }
  if (!isMine) {
    return <div className="mt-3 font-mono text-xs text-ink/60">Claimed by {station.claimed_by}. Queue — choose next station.</div>;
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
          <button onClick={() => setVisual("ok")} className={`border px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] ${visual === "ok" ? "border-ok bg-ok/15 text-ok" : "border-ink/25"}`}>✓ OK</button>
          <button onClick={() => setVisual("fail")} className={`border px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] ${visual === "fail" ? "border-destructive bg-destructive/15 text-destructive" : "border-ink/25"}`}>✕ n.OK</button>
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
                      placeholder="Deviation"
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
          {overall === "unrated" && <div className="mt-1 font-mono text-[10px] text-ink/50">No tolerance in DB → will be stored as "unrated".</div>}
        </div>
      )}

      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" rows={2} className="w-full border border-ink/20 bg-transparent px-2 py-1 font-mono text-xs" />

      <div className="flex gap-2">
        <button onClick={submit} disabled={!overall} className="bg-ink px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] text-paper disabled:opacity-30 hover:bg-ink/85">
          Confirm result
        </button>
        <button onClick={onRelease} className="border border-ink/25 px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] hover:border-ink">Release</button>
      </div>
    </div>
  );
}

function formatVals(m: any): string {
  if (!m) return "—";
  if (Array.isArray(m?.values)) return m.values.map((v: any) => v == null ? "—" : v).join(", ");
  if (m?.value != null) return String(m.value);
  if (m?.visual) return m.visual === "ok" ? "OK" : "n.OK";
  return "—";
}

// ---------- Returns ----------

function ReturnsTab({ worker, returns, jobs, products, onDone }: { worker: string; returns: JobReturn[]; jobs: TestJob[]; products: Product[]; onDone: () => void }) {
  if (returns.length === 0) return <div className="border border-ink/20 bg-card p-10 text-center font-mono text-sm text-ink/40">Keine openen Returns.</div>;
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
                <b>{r.quantity}</b> defective pcs · Customer {j?.customer ?? "—"} · Supplier {j?.supplier ?? "—"}
              </div>
              {r.note && <div className="mt-1 font-mono text-xs">{r.note}</div>}
            </div>
            <button
              onClick={async () => { await completeReturn(r.id, worker); onDone(); }}
              className="bg-ink px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] text-paper hover:bg-ink/85"
            >
              Return handled
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Marking ----------

function MarkingTab({ jobs, products, onDone }: { jobs: TestJob[]; products: Product[]; onDone: () => void }) {
  if (jobs.length === 0) return <div className="border border-ink/20 bg-card p-10 text-center font-mono text-sm text-ink/40">Keine Products in Laser marking.</div>;
  return (
    <div className="space-y-3">
      {jobs.map((j) => {
        const p = products.find((x) => x.id === j.product_id);
        const text = j.laser_text ?? p?.laser_text ?? p?.reference;
        const pack = j.packing_type ?? p?.packing_type ?? "—";
        return (
          <div key={j.id} className="flex flex-wrap items-center justify-between gap-3 border border-ink/20 bg-card p-4">
            <div>
              {p && <ProductChip product={p} orderNumber={j.order_number} inspectionTag={j.inspection_tag} />}
              <div className="mt-1 font-mono text-[10px] text-ink/50">Qty {j.incoming_qty ?? j.quantity_total} · Engraving: <b>{text}</b></div>
              <div className="mt-0.5 font-mono text-[10px] text-ink/50">Next steps: {pack} · {j.shipment_mode === "air" ? "Air freight" : j.shipment_mode === "sea" ? "Sea freight" : "—"} → {j.destination_country ?? "—"}</div>
            </div>
            <button onClick={async () => { await completeMarking(j.id); onDone(); }} className="bg-ink px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] text-paper hover:bg-ink/85">
              Marking done
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Packing ----------

function PackingTab({ jobs, products, onDone }: { jobs: TestJob[]; products: Product[]; onDone: () => void }) {
  const pallets = usePallets();
  const ready = pallets.data.filter((p) => p.status === "ready_to_pack");
  const loose = jobs.filter((j) => !j.pallet_id);

  if (ready.length === 0 && loose.length === 0) {
    return <div className="border border-ink/20 bg-card p-10 text-center font-mono text-sm text-ink/40">No pallets or products waiting for packing. Office needs to bundle released jobs into pallets first.</div>;
  }

  return (
    <div className="space-y-6">
      {ready.map((pal) => {
        const items = jobs.filter((j) => j.pallet_id === pal.id);
        return (
          <div key={pal.id} className="border-2 border-ink/40 bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/20 bg-muted/40 px-4 py-3">
              <div>
                <div className="font-display text-lg">🟰 Pallet {pal.name}</div>
                <div className="font-mono text-[10px] text-ink/60">
                  Carton: {pal.carton_size} · {pal.shipment_mode === "air" ? "✈ Air freight" : "⛴ Sea freight"} → <b>{pal.destination_country}</b> · {items.length} orders
                </div>
              </div>
              <button
                onClick={async () => { await completePalletPacking(pal.id, items.map((j) => j.id)); pallets.refetch(); onDone(); }}
                disabled={items.length === 0}
                className="bg-ink px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] text-paper disabled:opacity-30 hover:bg-ink/85">
                Pallet packed → Ship
              </button>
            </div>
            <ul className="divide-y divide-ink/10">
              {items.map((j) => {
                const p = products.find((x) => x.id === j.product_id);
                const pack = j.packing_type ?? p?.packing_type ?? "—";
                return (
                  <li key={j.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div>
                      {p && <ProductChip product={p} orderNumber={j.order_number} inspectionTag={j.inspection_tag} />}
                      <div className="mt-1 font-mono text-[10px] text-ink/50">Qty {j.incoming_qty ?? j.quantity_total} · Packing: <b>{pack}</b></div>
                    </div>
                  </li>
                );
              })}
              {items.length === 0 && <li className="px-4 py-3 font-mono text-[11px] text-ink/40">Pallet is empty.</li>}
            </ul>
          </div>
        );
      })}

      {loose.length > 0 && (
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/50">Waiting for pallet assembly ({loose.length})</div>
          <div className="mt-2 space-y-2">
            {loose.map((j) => {
              const p = products.find((x) => x.id === j.product_id);
              return (
                <div key={j.id} className="flex flex-wrap items-center gap-3 border border-dashed border-ink/25 bg-card p-3">
                  {p && <ProductChip product={p} orderNumber={j.order_number} inspectionTag={j.inspection_tag} />}
                  <span className="font-mono text-[10px] text-ink/50">
                    {j.customer} · {j.incoming_qty} pcs · {j.shipment_mode === "air" ? "✈ Air" : "⛴ Sea"} → {j.destination_country}
                  </span>
                  <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.22em] text-ink/40">Office must assign to a pallet</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Shipment (Worker confirms) ----------

function ShipmentTab({ worker, jobs, products, onDone }: { worker: string; jobs: TestJob[]; products: Product[]; onDone: () => void }) {
  void worker;
  if (jobs.length === 0) return <div className="border border-ink/20 bg-card p-10 text-center font-mono text-sm text-ink/40">Keine Jobs im Shipment vorbereitet.</div>;
  return (
    <div className="space-y-3">
      {jobs.map((j) => {
        const p = products.find((x) => x.id === j.product_id);
        const pack = j.packing_type ?? p?.packing_type ?? "—";
        return (
          <div key={j.id} className="flex flex-wrap items-center justify-between gap-3 border border-ink/25 bg-card p-4">
            <div>
              {p && <ProductChip product={p} orderNumber={j.order_number} inspectionTag={j.inspection_tag} />}
              <div className="mt-1 font-mono text-[10px] text-ink/50">
                Qty {j.incoming_qty ?? j.quantity_total} · {j.shipment_mode === "air" ? "Air freight" : "Sea freight"} → <b>{j.destination_country}</b> · Packing: {pack}
              </div>
              <div className="mt-1 font-mono text-[10px] text-ink/50">Customer: {j.customer}</div>
            </div>
            <button onClick={async () => { await confirmShipment(j.id); onDone(); }} className="bg-ok px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] text-paper hover:opacity-85">
              Shipped — done
            </button>
          </div>
        );
      })}
    </div>
  );
}
