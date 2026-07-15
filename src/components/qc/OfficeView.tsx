import { useMemo, useState } from "react";
import {
  addProduct, upsertTolerances, scheduleJob, decideJob,
  useProducts, useTolerancesMap, useJobs, useStations,
  CHECKPOINTS, activeCheckpoints, getCheckpoint,
  type Product, type Tolerances, type TestJob, type Checklist,
} from "@/lib/qcData";
import { AppShell, ProductChip, StatusPill } from "./Shell";

const PACKING = ["Karton einzeln", "Blister", "Sammelkiste", "Kunststoffbeutel"];

export function OfficeView({ onSwitchRole }: { onSwitchRole: () => void }) {
  const [tab, setTab] = useState<"overview" | "products" | "schedule" | "decisions">("overview");
  const products = useProducts();
  const tol = useTolerancesMap();
  const jobs = useJobs();

  const counts = useMemo(() => {
    const c = { testing: 0, marking: 0, packing: 0, decision: 0, done: 0, rejected: 0 };
    for (const j of jobs.data) {
      if (j.status === "in_testing" || j.status === "scheduled") c.testing++;
      else if (j.status === "in_marking") c.marking++;
      else if (j.status === "in_packing") c.packing++;
      else if (j.status === "awaiting_decision") c.decision++;
      else if (j.status === "done") c.done++;
      else if (j.status === "rejected") c.rejected++;
    }
    return c;
  }, [jobs.data]);

  return (
    <AppShell
      title="Büro-Konsole"
      subtitle="Produkte · Toleranzen · Planung · Freigaben"
      role="office"
      onSwitchRole={onSwitchRole}
      tab={tab}
      setTab={(t) => setTab(t as typeof tab)}
      tabs={[
        { id: "overview", label: "Übersicht" },
        { id: "products", label: "Produkte", badge: products.data.length },
        { id: "schedule", label: "Planung" },
        { id: "decisions", label: "Freigaben", badge: counts.decision },
      ]}
    >
      {tab === "overview" && <Overview counts={counts} jobs={jobs.data} products={products.data} />}
      {tab === "products" && <ProductsTab products={products} tolerances={tol} />}
      {tab === "schedule" && <ScheduleTab products={products.data} tolerances={tol.data} onDone={jobs.refetch} />}
      {tab === "decisions" && <DecisionsTab jobs={jobs.data} products={products.data} onDone={jobs.refetch} />}
    </AppShell>
  );
}

// ---------- Overview ----------

function Overview({
  counts, jobs, products,
}: {
  counts: { testing: number; marking: number; packing: number; decision: number; done: number; rejected: number };
  jobs: TestJob[];
  products: Product[];
}) {
  const [open, setOpen] = useState<string | null>("testing");
  const pOf = (id: string) => products.find((p) => p.id === id);

  const groups = [
    { key: "testing", label: "In Prüfung / Geplant", jobs: jobs.filter((j) => j.status === "in_testing" || j.status === "scheduled") },
    { key: "decision", label: "Wartet auf Freigabe", jobs: jobs.filter((j) => j.status === "awaiting_decision") },
    { key: "marking", label: "Lasermarkierung", jobs: jobs.filter((j) => j.status === "in_marking") },
    { key: "packing", label: "Verpackung", jobs: jobs.filter((j) => j.status === "in_packing") },
    { key: "done", label: "Abgeschlossen", jobs: jobs.filter((j) => j.status === "done") },
    { key: "rejected", label: "Gesperrt", jobs: jobs.filter((j) => j.status === "rejected") },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="In Testing" value={counts.testing} />
        <StatCard label="Wartet Entscheid" value={counts.decision} tone="accent" />
        <StatCard label="Marking" value={counts.marking} />
        <StatCard label="Packing" value={counts.packing} tone="ok" />
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
              <span className="font-mono text-[11px] uppercase tracking-[0.2em]">{g.label}</span>
              <span className="font-mono text-xs text-ink/60">{g.jobs.length} {open === g.key ? "▲" : "▼"}</span>
            </button>
            {open === g.key && (
              <div className="divide-y divide-ink/10 border-t border-ink/10">
                {g.jobs.length === 0 && <div className="px-4 py-3 font-mono text-xs text-ink/40">— leer —</div>}
                {g.jobs.map((j) => {
                  const p = pOf(j.product_id);
                  return (
                    <div key={j.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p && <ProductChip product={p} />}
                        <span className="font-mono text-[10px] text-ink/50">
                          {j.scheduled_date} · {j.quantity_total} Stk
                        </span>
                        {j.instructions === "full_check" && (
                          <span className="rounded-sm bg-accent/30 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em]">Full Check</span>
                        )}
                      </div>
                      <StatusPill status={j.status} />
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

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "accent" | "ok" | "destructive" }) {
  const cls = tone === "accent" ? "border-accent" : tone === "ok" ? "border-ok" : tone === "destructive" ? "border-destructive" : "border-ink";
  return (
    <div className={`border-l-4 bg-card p-4 ${cls}`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/50">{label}</div>
      <div className="mt-1 font-display text-4xl">{value}</div>
    </div>
  );
}

// ---------- Products & Tolerances ----------

function ProductsTab({
  products, tolerances,
}: {
  products: ReturnType<typeof useProducts>;
  tolerances: ReturnType<typeof useTolerancesMap>;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <div className="grid gap-6 lg:grid-cols-[420px,1fr]">
      <NewProductForm onDone={() => { products.refetch(); tolerances.refetch(); }} />
      <div className="border border-ink/20 bg-card">
        <div className="border-b border-ink/15 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ink/50">
          Katalog · {products.data.length}
        </div>
        <div className="divide-y divide-ink/10">
          {products.data.map((p) => (
            <div key={p.id}>
              <button
                onClick={() => setEditing(editing === p.id ? null : p.id)}
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted"
              >
                <div className="flex items-center gap-3">
                  <ProductChip product={p} />
                  <span className="font-mono text-[10px] text-ink/50">
                    {p.nominal_inner_dia ?? "?"}/{p.nominal_outer_dia ?? "?"}/{p.nominal_width ?? "?"}mm
                  </span>
                </div>
                <span className="font-mono text-[10px] text-ink/50">
                  {p.has_laser_marking ? "Laser ✓" : ""} · {p.packing_type ?? "—"} · {editing === p.id ? "▲" : "▼"}
                </span>
              </button>
              {editing === p.id && (
                <TolerancesEditor
                  product={p}
                  current={tolerances.data[p.id] ?? null}
                  onSaved={tolerances.refetch}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NewProductForm({ onDone }: { onDone: () => void }) {
  const [ref, setRef] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [inner, setInner] = useState(""); const [outer, setOuter] = useState(""); const [width, setWidth] = useState("");
  const [laser, setLaser] = useState(false);
  const [laserText, setLaserText] = useState("");
  const [pack, setPack] = useState(PACKING[0]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!ref.trim()) return;
    setBusy(true); setErr(null);
    try {
      await addProduct({
        reference: ref.trim(),
        name: name.trim() || null,
        bearing_type: type.trim() || null,
        nominal_inner_dia: inner ? parseFloat(inner) : null,
        nominal_outer_dia: outer ? parseFloat(outer) : null,
        nominal_width: width ? parseFloat(width) : null,
        has_laser_marking: laser,
        laser_text: laser ? (laserText.trim() || ref.trim()) : null,
        packing_type: pack,
        remark: null,
      });
      setRef(""); setName(""); setType(""); setInner(""); setOuter(""); setWidth(""); setLaser(false); setLaserText("");
      onDone();
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  }

  return (
    <div className="border border-ink/20 bg-card p-5">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/50">Neues Produkt</div>
      <h2 className="mt-1 font-display text-xl">Referenz anlegen</h2>

      <Field label="Referenz *"><input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="61907-2RS-C3-ZEN" className={inputCls} /></Field>
      <Field label="Bezeichnung"><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></Field>
      <Field label="Lagertyp"><input value={type} onChange={(e) => setType(e.target.value)} placeholder="深沟球" className={inputCls} /></Field>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <Field label="Innen-Ø (mm)"><input value={inner} onChange={(e) => setInner(e.target.value)} inputMode="decimal" className={inputCls} /></Field>
        <Field label="Außen-Ø (mm)"><input value={outer} onChange={(e) => setOuter(e.target.value)} inputMode="decimal" className={inputCls} /></Field>
        <Field label="Breite (mm)"><input value={width} onChange={(e) => setWidth(e.target.value)} inputMode="decimal" className={inputCls} /></Field>
      </div>

      <label className="mt-4 flex items-center gap-2 font-mono text-xs">
        <input type="checkbox" checked={laser} onChange={(e) => setLaser(e.target.checked)} />
        Lasermarkierung
      </label>
      {laser && <input value={laserText} onChange={(e) => setLaserText(e.target.value)} placeholder="Gravurtext" className={"mt-2 " + inputCls} />}

      <Field label="Verpackung">
        <select value={pack} onChange={(e) => setPack(e.target.value)} className="mt-1 w-full border border-ink/25 bg-transparent px-2 py-2 font-mono text-sm">
          {PACKING.map((p) => <option key={p}>{p}</option>)}
        </select>
      </Field>

      {err && <div className="mt-3 border border-destructive/40 bg-destructive/10 p-2 font-mono text-[11px] text-destructive">{err}</div>}
      <button onClick={save} disabled={!ref.trim() || busy} className="mt-6 w-full bg-ink px-4 py-3 font-mono text-xs uppercase tracking-[0.22em] text-paper disabled:opacity-30 hover:bg-ink/85">
        {busy ? "Speichern…" : "Speichern"}
      </button>
    </div>
  );
}

const inputCls = "mt-1 w-full border-b border-ink/30 bg-transparent py-2 font-mono text-sm outline-none focus:border-ink";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-4 block">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/60">{label}</div>
      {children}
    </label>
  );
}

function TolerancesEditor({
  product, current, onSaved,
}: { product: Product; current: Tolerances | null; onSaved: () => void }) {
  const initial: Partial<Tolerances> = current ?? {};
  const [vals, setVals] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    for (const [k, v] of Object.entries(initial)) {
      if (k === "product_id") continue;
      o[k] = v == null ? "" : String(v);
    }
    return o;
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const rows: { key: keyof Tolerances; label: string; hint?: string }[] = [
    { key: "inner_dia_min", label: "内径偏差 min (μm)" },
    { key: "inner_dia_max", label: "内径偏差 max (μm)" },
    { key: "outer_dia_min", label: "外径偏差 min (μm)" },
    { key: "outer_dia_max", label: "外径偏差 max (μm)" },
    { key: "width_min", label: "高度偏差 min (μm)" },
    { key: "width_max", label: "高度偏差 max (μm)" },
    { key: "noise_max", label: "噪音 max (dB)" },
    { key: "radial_play_min", label: "游隙 min (μm)" },
    { key: "radial_play_max", label: "游隙 max (μm)" },
    { key: "vibration_low_max", label: "振动 低频 max (μm/g)" },
    { key: "vibration_mid_max", label: "振动 中频 max (μm/g)" },
    { key: "vibration_high_max", label: "振动 高频 max (μm/g)" },
    { key: "hardness_inner_min", label: "硬度 内圈 min (HRC)" },
    { key: "hardness_inner_max", label: "硬度 内圈 max (HRC)" },
    { key: "hardness_outer_min", label: "硬度 外圈 min (HRC)" },
    { key: "hardness_outer_max", label: "硬度 外圈 max (HRC)" },
  ];

  async function save() {
    setBusy(true); setMsg(null);
    const patch: any = {};
    for (const r of rows) {
      const s = vals[r.key];
      patch[r.key] = s === "" || s == null ? null : parseFloat(s.replace(",", "."));
    }
    try {
      await upsertTolerances(product.id, patch);
      setMsg("Gespeichert.");
      onSaved();
    } catch (e: any) { setMsg(e.message); }
    setBusy(false);
  }

  return (
    <div className="border-t border-ink/10 bg-muted/50 p-4">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink/60">
        Toleranzen · leere Felder = "nicht in DB" (Prüfpunkt wird trotzdem angezeigt, aber nicht ausgewertet)
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {rows.map((r) => (
          <label key={r.key} className="block">
            <div className="font-mono text-[10px] text-ink/60">{r.label}</div>
            <input
              value={vals[r.key] ?? ""}
              onChange={(e) => setVals({ ...vals, [r.key]: e.target.value })}
              inputMode="decimal"
              className="mt-1 w-full border-b border-ink/25 bg-transparent px-1 py-1 font-mono text-sm outline-none focus:border-ink"
            />
          </label>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button onClick={save} disabled={busy} className="bg-ink px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-paper disabled:opacity-30">
          {busy ? "…" : "Toleranzen speichern"}
        </button>
        {msg && <span className="font-mono text-[10px] text-ink/60">{msg}</span>}
      </div>
    </div>
  );
}

// ---------- Schedule ----------

function ScheduleTab({
  products, tolerances, onDone,
}: {
  products: Product[];
  tolerances: Record<string, Tolerances>;
  onDone: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [pid, setPid] = useState(products[0]?.id ?? "");
  const [date, setDate] = useState(today);
  const [qty, setQty] = useState(20);
  const [sInner, setSInner] = useState(5);
  const [sOuter, setSOuter] = useState(5);
  const [sWidth, setSWidth] = useState(5);
  const [sGen, setSGen] = useState(1);
  const [instr, setInstr] = useState<"normal" | "full_check">("normal");
  const [note, setNote] = useState("");
  const [cl, setCl] = useState<Omit<Checklist, "job_id">>({
    check_inner_dia: true, check_outer_dia: true, check_width: true,
    check_noise: false, check_vibration: false, check_radial_play: false,
    check_hardness: false, check_appearance: true, check_spin: false,
    check_cage: false, check_oil_hole: false, check_chamfer: false,
    extra_instructions: null,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const product = products.find((p) => p.id === pid);
  const tol = product ? tolerances[product.id] : null;

  async function submit() {
    if (!pid) return;
    setBusy(true); setMsg(null);
    try {
      await scheduleJob({
        product_id: pid,
        scheduled_date: date,
        quantity_total: qty,
        sample_inner: cl.check_inner_dia ? sInner : 0,
        sample_outer: cl.check_outer_dia ? sOuter : 0,
        sample_width: cl.check_width ? sWidth : 0,
        sample_general: sGen,
        instructions: instr,
        office_note: note.trim() || undefined,
        checklist: cl,
      });
      setMsg("Auftrag geplant.");
      onDone();
    } catch (e: any) { setMsg(e.message); }
    setBusy(false);
  }

  const checkboxes: { key: keyof typeof cl; label: string }[] = [
    { key: "check_inner_dia", label: "内径 Innen-Ø" },
    { key: "check_outer_dia", label: "外径 Außen-Ø" },
    { key: "check_width", label: "高度 Breite" },
    { key: "check_noise", label: "噪音 Geräusch" },
    { key: "check_vibration", label: "振动 Vibration" },
    { key: "check_radial_play", label: "游隙 Radialspiel" },
    { key: "check_hardness", label: "硬度 Härte" },
    { key: "check_appearance", label: "外观 Optik" },
    { key: "check_spin", label: "转动 Lauf" },
    { key: "check_cage", label: "保持器 Käfig" },
    { key: "check_oil_hole", label: "油孔 Öl-Bohrung" },
    { key: "check_chamfer", label: "倒角 Fase" },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[420px,1fr]">
      <div className="border border-ink/20 bg-card p-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/50">Neuer Prüfauftrag</div>
        <h2 className="mt-1 font-display text-xl">Prüfung planen</h2>

        <Field label="Produkt">
          <select value={pid} onChange={(e) => setPid(e.target.value)} className="mt-1 w-full border border-ink/25 bg-transparent px-2 py-2 font-mono text-sm">
            <option value="">— wählen —</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.reference}</option>)}
          </select>
        </Field>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Field label="Termin"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></Field>
          <Field label="Gesamt-Menge"><input type="number" min={1} value={qty} onChange={(e) => setQty(parseInt(e.target.value || "0", 10))} className={inputCls} /></Field>
        </div>

        <div className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-ink/60">Prüfmenge pro Maß</div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Field label="Innen-Ø"><input type="number" min={0} value={sInner} onChange={(e) => setSInner(parseInt(e.target.value || "0", 10))} className={inputCls} disabled={!cl.check_inner_dia} /></Field>
          <Field label="Außen-Ø"><input type="number" min={0} value={sOuter} onChange={(e) => setSOuter(parseInt(e.target.value || "0", 10))} className={inputCls} disabled={!cl.check_outer_dia} /></Field>
          <Field label="Breite"><input type="number" min={0} value={sWidth} onChange={(e) => setSWidth(parseInt(e.target.value || "0", 10))} className={inputCls} disabled={!cl.check_width} /></Field>
        </div>
        <Field label="Prüfmenge übrige Punkte (allgemein)">
          <input type="number" min={1} value={sGen} onChange={(e) => setSGen(parseInt(e.target.value || "1", 10))} className={inputCls} />
        </Field>

        <div className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-ink/60">Was soll geprüft werden?</div>
        <div className="mt-2 grid grid-cols-2 gap-1">
          {checkboxes.map((cb) => {
            const disabled = false;
            const cp = CHECKPOINTS.find((c) => c.checklistKey === cb.key);
            const hasTol = cp && !cp.visual && ((cp.tolMinKey && tol?.[cp.tolMinKey] != null) || (cp.tolMaxKey && tol?.[cp.tolMaxKey] != null));
            const noTol = cp && !cp.visual && !hasTol;
            return (
              <label key={cb.key} className={`flex items-center gap-2 font-mono text-xs ${disabled ? "opacity-40" : ""}`}>
                <input
                  type="checkbox"
                  checked={cl[cb.key] as boolean}
                  onChange={(e) => setCl({ ...cl, [cb.key]: e.target.checked })}
                />
                <span>{cb.label}</span>
                {noTol && cb.key !== "check_appearance" && <span className="rounded-sm bg-ink/10 px-1 text-[9px] uppercase tracking-widest text-ink/50">keine tol.</span>}
              </label>
            );
          })}
        </div>

        <Field label="Zusatz-Anweisung">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="mt-1 w-full border border-ink/20 bg-transparent px-2 py-1 font-mono text-xs" />
        </Field>

        <label className="mt-4 flex items-center gap-2 font-mono text-xs">
          <input type="checkbox" checked={instr === "full_check"} onChange={(e) => setInstr(e.target.checked ? "full_check" : "normal")} />
          Full Check (blockiert andere Aufträge)
        </label>

        {msg && <div className="mt-3 font-mono text-[10px] text-ink/60">{msg}</div>}
        <button onClick={submit} disabled={!pid || busy} className="mt-4 w-full bg-ink px-4 py-3 font-mono text-xs uppercase tracking-[0.22em] text-paper disabled:opacity-30 hover:bg-ink/85">
          {busy ? "…" : "Auftrag einplanen"}
        </button>
      </div>

      <div className="border border-ink/20 bg-card p-4 font-mono text-xs text-ink/60">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em]">Vorschau Toleranzen für {product?.reference ?? "—"}</div>
        {product && tol ? (
          <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1">
            {Object.entries(tol).filter(([k, v]) => k !== "product_id" && k !== "unit_dim" && k !== "updated_at" && v != null).map(([k, v]) => (
              <li key={k}><span className="text-ink/50">{k}:</span> <b>{String(v)}</b></li>
            ))}
          </ul>
        ) : <div className="mt-2 text-ink/40">Keine Toleranzen in DB — Prüfer trägt Messwerte ein, es erfolgt aber keine automatische Bewertung.</div>}
      </div>
    </div>
  );
}

// ---------- Decisions ----------

function DecisionsTab({ jobs, products, onDone }: { jobs: TestJob[]; products: Product[]; onDone: () => void }) {
  const pending = jobs.filter((j) => j.status === "awaiting_decision");
  const ids = pending.map((j) => j.id);
  const stations = useStations(ids);
  const pOf = (id: string) => products.find((p) => p.id === id);

  if (pending.length === 0) {
    return <div className="border border-ink/20 bg-card p-8 text-center font-mono text-sm text-ink/40">Keine Freigaben ausstehend.</div>;
  }

  return (
    <div className="space-y-4">
      {pending.map((j) => {
        const p = pOf(j.product_id);
        const sts = stations.data[j.id] ?? [];
        const fails = sts.filter((s) => s.result === "fail").length;
        return (
          <div key={j.id} className="border border-ink/25 bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/15 px-5 py-3">
              <div className="flex items-center gap-3">
                {p && <ProductChip product={p} />}
                <span className="font-mono text-[10px] text-ink/50">{j.scheduled_date} · {j.quantity_total} Stk</span>
              </div>
              {fails > 0
                ? <span className="rounded-sm bg-destructive/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-destructive">{fails} Abweichung(en)</span>
                : <span className="rounded-sm bg-ok/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ok">Ohne Auffälligkeit</span>}
            </div>
            <ul className="divide-y divide-ink/10">
              {sts.map((s) => {
                const cp = getCheckpoint(s.checkpoint_key);
                return (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-2 text-sm">
                    <div>
                      <div>{cp?.labelCn} · {cp?.label}</div>
                      <div className="font-mono text-[10px] text-ink/50">von {s.claimed_by ?? "—"} · {s.claimed_date ?? "—"}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs">{formatMeasurements(s.measurements)}</span>
                      <span className={`rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${s.result === "ok" ? "bg-ok/15 text-ok" : s.result === "fail" ? "bg-destructive/15 text-destructive" : "bg-ink/10 text-ink/60"}`}>
                        {s.result === "ok" ? "OK" : s.result === "fail" ? "NIO" : "—"}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap gap-2 border-t border-ink/10 p-4">
              <DecisionButton label="Freigeben" tone="ok" onClick={async () => { await decideJob(j.id, "pass", undefined, !!p?.has_laser_marking); onDone(); }} />
              <DecisionButton label="Erneut prüfen" tone="ink" onClick={async () => { await decideJob(j.id, "retest", undefined, !!p?.has_laser_marking); onDone(); }} />
              <DecisionButton label="Sperren" tone="destructive" onClick={async () => { await decideJob(j.id, "reject", undefined, !!p?.has_laser_marking); onDone(); }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DecisionButton({ label, tone, onClick }: { label: string; tone: "ok" | "ink" | "destructive"; onClick: () => void }) {
  const cls = tone === "ok" ? "bg-ok text-paper" : tone === "destructive" ? "bg-destructive text-destructive-foreground" : "bg-ink text-paper";
  return <button onClick={onClick} className={`${cls} px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] hover:opacity-85`}>{label}</button>;
}

function formatMeasurements(m: any): string {
  if (!m) return "—";
  if (Array.isArray(m?.values)) return m.values.join(", ");
  if (m?.value != null) return String(m.value);
  if (m?.visual) return m.visual === "ok" ? "i.O." : "n.i.O.";
  return "—";
}
