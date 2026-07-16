import { useMemo, useState } from "react";
import {
  addProduct, upsertTolerances, createOrder, bookToQc, decideJob,
  setShipment, useProducts, useTolerancesMap, useJobs, useStations, useReturns,
  CHECKPOINTS, getCheckpoint,
  type Product, type Tolerances, type TestJob, type Checklist,
} from "@/lib/qcData";
import { AppShell, ProductChip, StatusPill } from "./Shell";
import { ArchiveTab } from "./ArchiveTab";
import { useBi } from "@/lib/i18n";

const PACKING = ["Single carton", "Blister", "Bulk crate", "Plastic bag"];

export function OfficeView({ onSwitchRole }: { onSwitchRole: () => void }) {
  const [tab, setTab] = useState<"overview" | "products" | "order" | "book" | "decisions" | "shipment" | "archive">("overview");
  const bi = useBi();
  const products = useProducts();
  const tol = useTolerancesMap();
  const jobs = useJobs();
  const returns = useReturns();

  const counts = useMemo(() => {
    const c = { receipt: 0, stock: 0, transport: 0, testing: 0, decision: 0, marking: 0, packing: 0, shipment: 0, done: 0, rejected: 0, returns: 0 };
    for (const j of jobs.data) {
      if (j.status === "awaiting_receipt") c.receipt++;
      else if (j.status === "in_stock") c.stock++;
      else if (j.status === "in_transport") c.transport++;
      else if (j.status === "in_testing" || j.status === "scheduled") c.testing++;
      else if (j.status === "awaiting_decision") c.decision++;
      else if (j.status === "in_marking") c.marking++;
      else if (j.status === "in_packing") c.packing++;
      else if (j.status === "in_shipment") c.shipment++;
      else if (j.status === "done") c.done++;
      else if (j.status === "rejected") c.rejected++;
    }
    c.returns = returns.data.filter((r) => r.status === "open").length;
    return c;
  }, [jobs.data, returns.data]);

  return (
    <AppShell
      title={bi("Office console", "办公室控制台")}
      subtitle={bi("Order · Warehouse · QC · Release · Shipment", "订单 · 仓库 · 质检 · 放行 · 出货")}
      role="office"
      onSwitchRole={onSwitchRole}
      tab={tab}
      setTab={(t) => setTab(t as typeof tab)}
      tabs={[
        { id: "overview", label: bi("Overview", "总览") },
        { id: "products", label: bi("Products", "产品"), badge: products.data.length },
        { id: "order", label: bi("Order", "订单") },
        { id: "book", label: bi("QC planning", "质检计划"), badge: counts.stock },
        { id: "decisions", label: bi("Releases", "放行"), badge: counts.decision },
        { id: "shipment", label: bi("Shipment", "出货"), badge: counts.shipment },
        { id: "archive", label: bi("Archive", "归档"), badge: counts.done },
      ]}
    >
      <JobLocator jobs={jobs.data} products={products.data} />
      {tab === "overview" && <Overview counts={counts} jobs={jobs.data} products={products.data} />}
      {tab === "products" && <ProductsTab products={products} tolerances={tol} />}
      {tab === "order" && <OrderTab products={products.data} tolerances={tol.data} onDone={jobs.refetch} />}
      {tab === "book" && <BookingTab jobs={jobs.data.filter((j) => j.status === "in_stock")} products={products.data} onDone={jobs.refetch} />}
      {tab === "decisions" && <DecisionsTab jobs={jobs.data} products={products.data} onDone={jobs.refetch} />}
      {tab === "shipment" && <ShipmentTab jobs={jobs.data.filter((j) => j.status === "in_shipment")} products={products.data} onDone={jobs.refetch} />}
      {tab === "archive" && <ArchiveTab jobs={jobs.data} products={products.data} />}
    </AppShell>
  );
}

// ---------- Job Locator (search) ----------

const STATUS_LABEL: Record<string, string> = {
  awaiting_receipt: "Goods receipt",
  in_stock: "In stock",
  in_transport: "Transport to inspection",
  scheduled: "QC scheduled",
  in_testing: "In inspection",
  awaiting_decision: "Awaiting release",
  in_marking: "Laser marking",
  in_packing: "Packing",
  in_shipment: "Shipment",
  done: "Completed",
  rejected: "Blocked",
};

function JobLocator({ jobs, products }: { jobs: TestJob[]; products: Product[] }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();

  const results = useMemo(() => {
    if (!query) return [];
    return jobs
      .map((j) => {
        const p = products.find((x) => x.id === j.product_id);
        const ref = p?.reference ?? "";
        const hay = `${ref} ${j.order_number ?? ""} ${j.customer ?? ""} ${j.supplier ?? ""}`.toLowerCase();
        return hay.includes(query) ? { j, p } : null;
      })
      .filter(Boolean)
      .slice(0, 8) as { j: TestJob; p: Product | undefined }[];
  }, [query, jobs, products]);

  return (
    <div className="mb-4 border border-ink/20 bg-card">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/50">Search</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Reference, Order no., Customer oder Supplier …"
          className="flex-1 border-b border-ink/25 bg-transparent py-1 font-mono text-sm outline-none focus:border-ink"
        />
        {q && <button onClick={() => setQ("")} className="font-mono text-[10px] text-ink/50 hover:text-ink">×</button>}
      </div>
      {query && (
        <div className="divide-y divide-ink/10 border-t border-ink/10">
          {results.length === 0 && (
            <div className="px-4 py-3 font-mono text-xs text-ink/40">No matches.</div>
          )}
          {results.map(({ j, p }) => (
            <div key={j.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2">
              <div className="flex flex-wrap items-center gap-3">
                {p && <ProductChip product={p} orderNumber={j.order_number} />}
                <span className="font-mono text-[10px] text-ink/50">
                  {j.customer ?? "—"} ← {j.supplier ?? "—"}
                  {j.storage_location && ` · Location: ${j.storage_location}`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink/60">
                  {STATUS_LABEL[j.status] ?? j.status}
                </span>
                <StatusPill status={j.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Overview ----------

function Overview({
  counts, jobs, products,
}: {
  counts: { receipt: number; stock: number; transport: number; testing: number; decision: number; marking: number; packing: number; shipment: number; done: number; rejected: number; returns: number };
  jobs: TestJob[];
  products: Product[];
}) {
  const bi = useBi();
  const [open, setOpen] = useState<string | null>("testing");
  const pOf = (id: string) => products.find((p) => p.id === id);

  const groups = [
    { key: "receipt", label: bi("Goods receipt", "收货"), jobs: jobs.filter((j) => j.status === "awaiting_receipt") },
    { key: "stock", label: bi("In stock", "在库"), jobs: jobs.filter((j) => j.status === "in_stock") },
    { key: "transport", label: bi("Transport → Inspection", "运输 → 检验"), jobs: jobs.filter((j) => j.status === "in_transport") },
    { key: "testing", label: bi("In inspection / Scheduled", "检验中 / 已排程"), jobs: jobs.filter((j) => j.status === "in_testing" || j.status === "scheduled") },
    { key: "decision", label: bi("Awaiting release", "待放行"), jobs: jobs.filter((j) => j.status === "awaiting_decision") },
    { key: "marking", label: bi("Laser marking", "激光打标"), jobs: jobs.filter((j) => j.status === "in_marking") },
    { key: "packing", label: bi("Packing", "包装"), jobs: jobs.filter((j) => j.status === "in_packing") },
    { key: "shipment", label: bi("Shipment", "出货"), jobs: jobs.filter((j) => j.status === "in_shipment") },
    { key: "done", label: bi("Completed", "已完成"), jobs: jobs.filter((j) => j.status === "done") },
    { key: "rejected", label: bi("Blocked", "拒收"), jobs: jobs.filter((j) => j.status === "rejected") },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
        <StatCard label={bi("Goods receipt", "收货")} value={counts.receipt} />
        <StatCard label={bi("In stock", "在库")} value={counts.stock} />
        <StatCard label={bi("Transport", "运输")} value={counts.transport} tone="accent" />
        <StatCard label={bi("In testing", "检验中")} value={counts.testing} tone="accent" />
        <StatCard label={bi("Awaiting decision", "待决定")} value={counts.decision} tone="accent" />
        <StatCard label={bi("Open returns", "未处理退货")} value={counts.returns} tone="destructive" />
        <StatCard label={bi("Marking", "打标")} value={counts.marking} />
        <StatCard label={bi("Packing", "包装")} value={counts.packing} />
        <StatCard label={bi("Shipment", "出货")} value={counts.shipment} />
        <StatCard label={bi("Done", "完成")} value={counts.done} tone="ok" />
        <StatCard label={bi("Blocked", "拒收")} value={counts.rejected} tone="destructive" />
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
                {g.jobs.length === 0 && <div className="px-4 py-3 font-mono text-xs text-ink/40">— {bi("empty", "无")} —</div>}
                {g.jobs.map((j) => {
                  const p = pOf(j.product_id);
                  return (
                    <div key={j.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-3">
                        {p && <ProductChip product={p} orderNumber={j.order_number} />}
                        <span className="font-mono text-[10px] text-ink/50">
                          {j.customer ?? "—"} ← {j.supplier ?? "—"} · {j.incoming_qty ?? j.quantity_total} {bi("pcs", "件")}
                          {j.storage_location && ` · ${bi("Location", "位置")}: ${j.storage_location}`}
                        </span>
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

// ---------- Products & Tolerances (unchanged) ----------

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
          Catalog · {products.data.length}
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
        name: null,
        bearing_type: null,
        nominal_inner_dia: inner ? parseFloat(inner) : null,
        nominal_outer_dia: outer ? parseFloat(outer) : null,
        nominal_width: width ? parseFloat(width) : null,
        has_laser_marking: laser,
        laser_text: laser ? (laserText.trim() || ref.trim()) : null,
        packing_type: pack,
        remark: null,
      });
      setRef(""); setInner(""); setOuter(""); setWidth(""); setLaser(false); setLaserText("");
      onDone();
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  }

  return (
    <div className="border border-ink/20 bg-card p-5">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/50">New product</div>
      <h2 className="mt-1 font-display text-xl">Create reference</h2>

      <Field label="Reference *"><input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="61907-2RS-C3-ZEN" className={inputCls} /></Field>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <Field label="Inner Ø (mm)"><input value={inner} onChange={(e) => setInner(e.target.value)} inputMode="decimal" className={inputCls} /></Field>
        <Field label="Outer Ø (mm)"><input value={outer} onChange={(e) => setOuter(e.target.value)} inputMode="decimal" className={inputCls} /></Field>
        <Field label="Width (mm)"><input value={width} onChange={(e) => setWidth(e.target.value)} inputMode="decimal" className={inputCls} /></Field>
      </div>

      <label className="mt-4 flex items-center gap-2 font-mono text-xs">
        <input type="checkbox" checked={laser} onChange={(e) => setLaser(e.target.checked)} />
        Laser marking
      </label>
      {laser && <input value={laserText} onChange={(e) => setLaserText(e.target.value)} placeholder="Engraving text (default)" className={"mt-2 " + inputCls} />}

      <Field label="Packing (default)">
        <select value={pack} onChange={(e) => setPack(e.target.value)} className="mt-1 w-full border border-ink/25 bg-transparent px-2 py-2 font-mono text-sm">
          {PACKING.map((p) => <option key={p}>{p}</option>)}
        </select>
      </Field>

      {err && <div className="mt-3 border border-destructive/40 bg-destructive/10 p-2 font-mono text-[11px] text-destructive">{err}</div>}
      <button onClick={save} disabled={!ref.trim() || busy} className="mt-6 w-full bg-ink px-4 py-3 font-mono text-xs uppercase tracking-[0.22em] text-paper disabled:opacity-30 hover:bg-ink/85">
        {busy ? "Saving…" : "Save"}
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

  const rows: { key: keyof Tolerances; label: string }[] = [
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
      setMsg("Saved.");
      onSaved();
    } catch (e: any) { setMsg(e.message); }
    setBusy(false);
  }

  return (
    <div className="border-t border-ink/10 bg-muted/50 p-4">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink/60">
        Tolerances (μm deviation for dimensions)
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
          {busy ? "…" : "Save tolerances"}
        </button>
        {msg && <span className="font-mono text-[10px] text-ink/60">{msg}</span>}
      </div>
    </div>
  );
}

// ---------- Create order ----------

function OrderTab({
  products, tolerances, onDone,
}: {
  products: Product[];
  tolerances: Record<string, Tolerances>;
  onDone: () => void;
}) {
  const [pid, setPid] = useState(products[0]?.id ?? "");
  const [orderNumber, setOrderNumber] = useState("");
  const [customer, setCustomer] = useState("");
  const [supplier, setSupplier] = useState("");
  const [incoming, setIncoming] = useState(100);
  const [controlled, setControlled] = useState(5);
  const [sInner, setSInner] = useState(5);
  const [sOuter, setSOuter] = useState(5);
  const [sWidth, setSWidth] = useState(5);
  const [laserText, setLaserText] = useState("");
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
    if (!pid || !orderNumber.trim() || !customer.trim() || !supplier.trim()) {
      setMsg("Order no., customer and supplier are required.");
      return;
    }
    setBusy(true); setMsg(null);
    try {
      await createOrder({
        order_number: orderNumber.trim(),
        product_id: pid,
        customer: customer.trim(),
        supplier: supplier.trim(),
        incoming_qty: incoming,
        sample_general: controlled,
        sample_inner: cl.check_inner_dia ? sInner : 0,
        sample_outer: cl.check_outer_dia ? sOuter : 0,
        sample_width: cl.check_width ? sWidth : 0,
        laser_text: laserText.trim() || null,
        office_note: note.trim() || null,
        checklist: cl,
      });
      setMsg("Order created — awaiting goods receipt.");
      setOrderNumber(""); setCustomer(""); setSupplier(""); setLaserText(""); setNote("");
      onDone();
    } catch (e: any) { setMsg(e.message); }
    setBusy(false);
  }

  const checkboxes: { key: keyof typeof cl; label: string }[] = [
    { key: "check_inner_dia", label: "内径 Inner Ø" },
    { key: "check_outer_dia", label: "外径 Outer Ø" },
    { key: "check_width", label: "高度 Width" },
    { key: "check_noise", label: "噪音 Noise" },
    { key: "check_vibration", label: "振动 Vibration" },
    { key: "check_radial_play", label: "游隙 Radial play" },
    { key: "check_hardness", label: "硬度 Hardness" },
    { key: "check_appearance", label: "外观 Appearance" },
    { key: "check_spin", label: "转动 Spin" },
    { key: "check_cage", label: "保持器 Cage" },
    { key: "check_oil_hole", label: "油孔 Oil hole" },
    { key: "check_chamfer", label: "倒角 Chamfer" },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[520px,1fr]">
      <div className="border border-ink/20 bg-card p-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/50">New order</div>
        <h2 className="mt-1 font-display text-xl">Register goods receipt</h2>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Order no. *"><input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} className={inputCls} placeholder="PO-2026-0142" /></Field>
          <Field label="Reference *">
            <select value={pid} onChange={(e) => setPid(e.target.value)} className="mt-1 w-full border border-ink/25 bg-transparent px-2 py-2 font-mono text-sm">
              <option value="">— select —</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.reference}</option>)}
            </select>
          </Field>
          <Field label="Customer *"><input value={customer} onChange={(e) => setCustomer(e.target.value)} className={inputCls} /></Field>
          <Field label="Supplier *"><input value={supplier} onChange={(e) => setSupplier(e.target.value)} className={inputCls} /></Field>
          <Field label="Incoming Quantity"><input type="number" min={1} value={incoming} onChange={(e) => setIncoming(parseInt(e.target.value || "0", 10))} className={inputCls} /></Field>
          <Field label="Controlled quantity (general)"><input type="number" min={1} value={controlled} onChange={(e) => setControlled(parseInt(e.target.value || "0", 10))} className={inputCls} /></Field>
        </div>

        <div className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-ink/60">Sample size per dimension</div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Field label="Inner Ø"><input type="number" min={0} value={sInner} onChange={(e) => setSInner(parseInt(e.target.value || "0", 10))} className={inputCls} disabled={!cl.check_inner_dia} /></Field>
          <Field label="Outer Ø"><input type="number" min={0} value={sOuter} onChange={(e) => setSOuter(parseInt(e.target.value || "0", 10))} className={inputCls} disabled={!cl.check_outer_dia} /></Field>
          <Field label="Width"><input type="number" min={0} value={sWidth} onChange={(e) => setSWidth(parseInt(e.target.value || "0", 10))} className={inputCls} disabled={!cl.check_width} /></Field>
        </div>

        <Field label="Laser marking text (free text, empty = no laser)">
          <input value={laserText} onChange={(e) => setLaserText(e.target.value)} className={inputCls} placeholder={product?.laser_text ?? "—"} />
        </Field>

        <div className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-ink/60">What should be inspected?</div>
        <div className="mt-2 grid grid-cols-2 gap-1">
          {checkboxes.map((cb) => {
            const cp = CHECKPOINTS.find((c) => c.checklistKey === cb.key);
            const hasTol = cp && !cp.visual && ((cp.tolMinKey && tol?.[cp.tolMinKey] != null) || (cp.tolMaxKey && tol?.[cp.tolMaxKey] != null));
            const noTol = cp && !cp.visual && !hasTol;
            return (
              <label key={cb.key} className="flex items-center gap-2 font-mono text-xs">
                <input type="checkbox" checked={cl[cb.key] as boolean} onChange={(e) => setCl({ ...cl, [cb.key]: e.target.checked })} />
                <span>{cb.label}</span>
                {noTol && cb.key !== "check_appearance" && <span className="rounded-sm bg-ink/10 px-1 text-[9px] uppercase tracking-widest text-ink/50">no tol.</span>}
              </label>
            );
          })}
        </div>

        <Field label="Additional instruction">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="mt-1 w-full border border-ink/20 bg-transparent px-2 py-1 font-mono text-xs" />
        </Field>

        {msg && <div className="mt-3 font-mono text-[10px] text-ink/60">{msg}</div>}
        <button onClick={submit} disabled={busy} className="mt-4 w-full bg-ink px-4 py-3 font-mono text-xs uppercase tracking-[0.22em] text-paper disabled:opacity-30 hover:bg-ink/85">
          {busy ? "…" : "Create order"}
        </button>
      </div>

      <div className="border border-ink/20 bg-card p-4 font-mono text-xs text-ink/60">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em]">Tolerance preview for {product?.reference ?? "—"}</div>
        {product && tol ? (
          <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1">
            {Object.entries(tol).filter(([k, v]) => k !== "product_id" && k !== "unit_dim" && k !== "updated_at" && v != null).map(([k, v]) => (
              <li key={k}><span className="text-ink/50">{k}:</span> <b>{String(v)}</b></li>
            ))}
          </ul>
        ) : <div className="mt-2 text-ink/40">No tolerances in DB — inspector enters values, no automatic evaluation.</div>}
        <div className="mt-4 text-ink/50">Flow: Order → Goods receipt → Transport → Inspection → <b>Release (with packing + shipping mode)</b> → Marking → Packing → Shipment confirmation.</div>
      </div>
    </div>
  );
}

// ---------- QC planning (from stock) ----------

function BookingTab({ jobs, products, onDone }: { jobs: TestJob[]; products: Product[]; onDone: () => void }) {
  if (jobs.length === 0) return <div className="border border-ink/20 bg-card p-8 text-center font-mono text-sm text-ink/40">No stock waiting for QC planning.</div>;
  return (
    <div className="space-y-3">
      {jobs.map((j) => {
        const p = products.find((x) => x.id === j.product_id);
        return <BookingCard key={j.id} job={j} product={p} onDone={onDone} />;
      })}
    </div>
  );
}

function BookingCard({ job, product, onDone }: { job: TestJob; product: Product | undefined; onDone: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [full, setFull] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await bookToQc(job.id, date, full ? "full_check" : "normal");
      onDone();
    } finally { setBusy(false); }
  }

  return (
    <div className="border border-ink/25 bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {product && <ProductChip product={product} orderNumber={job.order_number} />}
          <div className="mt-1 font-mono text-[10px] text-ink/50">
            {job.customer} ← {job.supplier} · {job.incoming_qty} pcs · Location: <b>{job.storage_location ?? "?"}</b> · received {job.received_by ?? "—"}
          </div>
          <div className="mt-1 font-mono text-[10px] text-ink/50">
            Samples I{job.sample_inner}/A{job.sample_outer}/B{job.sample_width}, gen. {job.sample_general}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/60">
            Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="ml-2 border-b border-ink/30 bg-transparent py-1 font-mono text-xs" />
          </label>
          <label className="flex items-center gap-1 font-mono text-xs">
            <input type="checkbox" checked={full} onChange={(e) => setFull(e.target.checked)} />
            Full check
          </label>
          <button onClick={submit} disabled={busy} className="bg-ink px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] text-paper disabled:opacity-30 hover:bg-ink/85">
            {busy ? "…" : "Book to QC"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Releases ----------

function DecisionsTab({ jobs, products, onDone }: { jobs: TestJob[]; products: Product[]; onDone: () => void }) {
  const pending = jobs.filter((j) => j.status === "awaiting_decision");
  const ids = pending.map((j) => j.id);
  const stations = useStations(ids);
  const pOf = (id: string) => products.find((p) => p.id === id);

  if (pending.length === 0) {
    return <div className="border border-ink/20 bg-card p-8 text-center font-mono text-sm text-ink/40">No pending releases.</div>;
  }

  return (
    <div className="space-y-4">
      {pending.map((j) => (
        <DecisionCard key={j.id} job={j} product={pOf(j.product_id) ?? null} stations={stations.data[j.id] ?? []} onDone={onDone} />
      ))}
    </div>
  );
}

function DecisionCard({ job, product, stations, onDone }: { job: TestJob; product: Product | null; stations: any[]; onDone: () => void }) {
  const fails = stations.filter((s) => s.result === "fail").length;
  const [defectCount, setDefectCount] = useState(fails);
  const [defectNote, setDefectNote] = useState("");
  const [decisionNote, setDecisionNote] = useState("");
  const [packingType, setPackingType] = useState<string>(job.packing_type ?? product?.packing_type ?? PACKING[0]);
  const [mode, setMode] = useState<"air" | "sea">(job.shipment_mode ?? "sea");
  const [country, setCountry] = useState(job.destination_country ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function decide(kind: "pass" | "retest" | "reject") {
    if (kind === "pass" && (!packingType.trim() || !country.trim())) {
      setErr("Packing type and destination country are required for release.");
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      await decideJob(
        job.id, kind, decisionNote || undefined,
        !!product?.has_laser_marking || !!job.laser_text,
        defectCount, defectNote || undefined,
        kind === "pass"
          ? { packing_type: packingType, shipment_mode: mode, destination_country: country.trim() }
          : undefined,
      );
      onDone();
    } finally { setBusy(false); }
  }

  return (
    <div className="border border-ink/25 bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/15 px-5 py-3">
        <div className="flex items-center gap-3">
          {product && <ProductChip product={product} orderNumber={job.order_number} inspectionTag={job.inspection_tag} />}
          <span className="font-mono text-[10px] text-ink/50">{job.customer} · {job.incoming_qty} Stk</span>
        </div>
        {fails > 0
          ? <span className="rounded-sm bg-destructive/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-destructive">{fails} checkpoint deviation(s)</span>
          : <span className="rounded-sm bg-ok/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ok">No issues</span>}
      </div>
      <ul className="divide-y divide-ink/10">
        {stations.map((s) => {
          const cp = getCheckpoint(s.checkpoint_key);
          return (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-2 text-sm">
              <div>
                <div>{cp?.labelCn} · {cp?.label}</div>
                <div className="font-mono text-[10px] text-ink/50">by {s.claimed_by ?? "—"} · {s.claimed_date ?? "—"}</div>
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

      <div className="grid gap-3 border-t border-ink/10 p-4 md:grid-cols-2">
        <label className="block">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/60">Number of defective bearings</div>
          <input type="number" min={0} value={defectCount} onChange={(e) => setDefectCount(parseInt(e.target.value || "0", 10))} className={inputCls} />
        </label>
        <label className="block">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/60">Return note</div>
          <input value={defectNote} onChange={(e) => setDefectNote(e.target.value)} className={inputCls} placeholder="e.g. scrap removed, batch X…" />
        </label>
        <label className="md:col-span-2 block">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/60">Decision note</div>
          <input value={decisionNote} onChange={(e) => setDecisionNote(e.target.value)} className={inputCls} />
        </label>
      </div>

      <div className="border-t border-ink/10 bg-muted/40 p-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/60">
          Required for release · Packing &amp; Shipment
        </div>
        <div className="mt-2 grid gap-3 md:grid-cols-3">
          <label className="block">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/60">Packing type *</div>
            <select value={packingType} onChange={(e) => setPackingType(e.target.value)} className="mt-1 w-full border border-ink/25 bg-transparent px-2 py-2 font-mono text-sm">
              {PACKING.map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
          <label className="block">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/60">Shipping mode *</div>
            <select value={mode} onChange={(e) => setMode(e.target.value as any)} className="mt-1 w-full border border-ink/25 bg-transparent px-2 py-2 font-mono text-sm">
              <option value="sea">Sea freight</option>
              <option value="air">Air freight</option>
            </select>
          </label>
          <label className="block">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/60">Destination country *</div>
            <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. Germany" className={inputCls} />
          </label>
        </div>
      </div>

      {err && <div className="border-t border-destructive/40 bg-destructive/10 px-4 py-2 font-mono text-[11px] text-destructive">{err}</div>}
      <div className="flex flex-wrap gap-2 border-t border-ink/10 p-4">
        <button disabled={busy} onClick={() => decide("pass")} className="bg-ok px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] text-paper hover:opacity-85 disabled:opacity-30">Release → Marking/Packing</button>
        <button disabled={busy} onClick={() => decide("retest")} className="bg-ink px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] text-paper hover:opacity-85 disabled:opacity-30">Re-inspect</button>
        <button disabled={busy} onClick={() => decide("reject")} className="bg-destructive px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] text-destructive-foreground hover:opacity-85 disabled:opacity-30">Block completely</button>
      </div>
    </div>
  );
}

function formatMeasurements(m: any): string {
  if (!m) return "—";
  if (Array.isArray(m?.values)) return m.values.join(", ");
  if (m?.value != null) return String(m.value);
  if (m?.visual) return m.visual === "ok" ? "OK" : "n.OK";
  return "—";
}

// ---------- Shipment ----------

function ShipmentTab({ jobs, products, onDone }: { jobs: TestJob[]; products: Product[]; onDone: () => void }) {
  if (jobs.length === 0) return <div className="border border-ink/20 bg-card p-8 text-center font-mono text-sm text-ink/40">Keine Jobs im Shipment.</div>;
  return (
    <div className="space-y-3">
      {jobs.map((j) => {
        const p = products.find((x) => x.id === j.product_id);
        return <ShipmentCard key={j.id} job={j} product={p} onDone={onDone} />;
      })}
    </div>
  );
}

function ShipmentCard({ job, product, onDone }: { job: TestJob; product: Product | undefined; onDone: () => void }) {
  const [mode, setMode] = useState<"air" | "sea">(job.shipment_mode ?? "sea");
  const [country, setCountry] = useState(job.destination_country ?? "");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!country.trim()) return;
    setBusy(true);
    try { await setShipment(job.id, mode, country.trim()); onDone(); } finally { setBusy(false); }
  }

  return (
    <div className="border border-ink/25 bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {product && <ProductChip product={product} orderNumber={job.order_number} />}
          <div className="mt-1 font-mono text-[10px] text-ink/50">
            {job.customer} · {job.incoming_qty} pcs · Status: <b>{job.shipment_status ?? "not instructed"}</b>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select value={mode} onChange={(e) => setMode(e.target.value as any)} className="border border-ink/25 bg-transparent px-2 py-2 font-mono text-xs">
            <option value="sea">Sea freight</option>
            <option value="air">Air freight</option>
          </select>
          <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Destination country (e.g. Germany)" className="border-b border-ink/30 bg-transparent px-1 py-2 font-mono text-xs" />
          <button onClick={submit} disabled={busy || !country.trim()} className="bg-ink px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] text-paper disabled:opacity-30 hover:bg-ink/85">
            {busy ? "…" : job.shipment_status ? "Update" : "An Workers"}
          </button>
        </div>
      </div>
    </div>
  );
}
