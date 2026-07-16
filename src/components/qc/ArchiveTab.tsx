import { useMemo, useState } from "react";
import {
  useStations, useReturns, getCheckpoint,
  type TestJob, type Product, type Station, type JobReturn,
} from "@/lib/qcData";
import { ProductChip } from "./Shell";

// Full-history timeline for completed (done) orders.
// Every entry is derived from timestamps already stored on test_jobs / job_stations / job_returns.

export function ArchiveTab({ jobs, products }: { jobs: TestJob[]; products: Product[] }) {
  const done = useMemo(
    () => jobs.filter((j) => j.status === "done").sort((a, b) => (b.shipped_at ?? b.packed_at ?? b.created_at).localeCompare(a.shipped_at ?? a.packed_at ?? a.created_at)),
    [jobs],
  );

  const [openId, setOpenId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!query) return done;
    return done.filter((j) => {
      const p = products.find((x) => x.id === j.product_id);
      const hay = `${p?.reference ?? ""} ${j.order_number ?? ""} ${j.customer ?? ""} ${j.supplier ?? ""} ${j.inspection_tag ?? ""}`.toLowerCase();
      return hay.includes(query);
    });
  }, [query, done, products]);

  const stations = useStations(done.map((j) => j.id));
  const returns = useReturns();

  const pOf = (id: string) => products.find((p) => p.id === id);

  return (
    <div className="space-y-4">
      <div className="border border-ink/20 bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/50">Archiv-Suche</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Referenz, Order-Nr., Kunde, Lieferant oder Prüf-Etikett…"
            className="flex-1 border-b border-ink/25 bg-transparent py-1 font-mono text-sm outline-none focus:border-ink"
          />
          <span className="font-mono text-[10px] text-ink/50">{filtered.length} / {done.length}</span>
        </div>
      </div>

      <div className="border border-ink/20 bg-card">
        <div className="border-b border-ink/15 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ink/50">
          Abgeschlossene Bestellungen · Belegkette für SAP
        </div>
        <div className="divide-y divide-ink/10">
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center font-mono text-xs text-ink/40">
              — noch keine abgeschlossenen Aufträge —
            </div>
          )}
          {filtered.map((j) => {
            const p = pOf(j.product_id);
            const isOpen = openId === j.id;
            return (
              <div key={j.id}>
                <button
                  onClick={() => setOpenId(isOpen ? null : j.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    {p && <ProductChip product={p} orderNumber={j.order_number} inspectionTag={j.inspection_tag} />}
                    <span className="font-mono text-[10px] text-ink/50">
                      {j.customer ?? "—"} ← {j.supplier ?? "—"} · {j.incoming_qty ?? j.quantity_total} Stk
                      {j.shipment_mode && ` · ${j.shipment_mode === "air" ? "Luft" : "See"} → ${j.destination_country ?? "—"}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-ink/50">
                      {j.shipped_at ? new Date(j.shipped_at).toLocaleDateString() : ""}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/60">
                      {isOpen ? "▲ Belegkette" : "▼ Belegkette"}
                    </span>
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-ink/10 bg-muted/40 px-4 py-4">
                    <Timeline
                      job={j}
                      product={p}
                      stations={stations.data[j.id] ?? []}
                      returns={returns.data.filter((r) => r.job_id === j.id)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------- Timeline ----------

type Entry = {
  ts: string | null;
  phase: string;
  title: string;
  detail?: string;
  actor?: string | null;
  tone?: "ok" | "fail" | "info" | "warn";
};

function Timeline({
  job, product, stations, returns,
}: { job: TestJob; product: Product | undefined; stations: Station[]; returns: JobReturn[] }) {
  const entries: Entry[] = [];

  // 1) Order created (SAP entry point)
  entries.push({
    ts: job.created_at,
    phase: "SAP · Bestellung",
    title: `Bestellung ${job.order_number ?? "—"} angelegt`,
    detail: `${job.customer ?? "Kunde ?"} ← ${job.supplier ?? "Lieferant ?"} · ${job.incoming_qty ?? job.quantity_total} Stk · Ref ${product?.reference ?? "?"}`,
    tone: "info",
  });

  // 2) Goods receipt
  if (job.received_at) {
    entries.push({
      ts: job.received_at,
      phase: "Lager · Warenannahme",
      title: "Wareneingang gebucht",
      detail: job.storage_location ? `Lagerort: ${job.storage_location}` : undefined,
      actor: job.received_by,
    });
  }

  // 3) Transport to inspection
  if (job.transported_at) {
    entries.push({
      ts: job.transported_at,
      phase: "Logistik · Transport",
      title: "Ware ins Prüfzentrum gebracht",
      detail: job.inspection_tag ? `Prüf-Etikett: ${job.inspection_tag}` : undefined,
      actor: job.transported_by,
    });
  }

  // 4) Each station completion
  for (const s of stations) {
    if (s.status !== "done" || !s.completed_at) continue;
    const cp = getCheckpoint(s.checkpoint_key);
    const label = cp?.label ?? s.checkpoint_key;
    let detail: string | undefined;
    if (s.measurements && typeof s.measurements === "object") {
      const vals = Object.values(s.measurements).filter((v) => v != null);
      if (vals.length) detail = `Messwerte: ${vals.join(", ")}${cp?.unit ? ` ${cp.unit}` : ""}`;
    }
    if (s.note) detail = detail ? `${detail} · ${s.note}` : s.note;
    entries.push({
      ts: s.completed_at,
      phase: "QC · Prüfstation",
      title: `${label}: ${s.result === "ok" ? "OK" : s.result === "fail" ? "Fail" : "geprüft"}`,
      detail,
      actor: s.claimed_by,
      tone: s.result === "fail" ? "fail" : s.result === "ok" ? "ok" : undefined,
    });
  }

  // 5) Decision
  if (job.decision) {
    const label = job.decision === "pass" ? "Freigabe erteilt" : job.decision === "reject" ? "Gesperrt" : "Nachprüfung";
    entries.push({
      ts: null, // no dedicated column; sits between last station and marking/packing
      phase: "Büro · Entscheidung",
      title: label,
      detail: [
        job.defect_count != null && job.defect_count > 0 ? `${job.defect_count} defekte Stk` : null,
        job.decision_note,
        job.defect_note,
      ].filter(Boolean).join(" · ") || undefined,
      tone: job.decision === "pass" ? "ok" : job.decision === "reject" ? "fail" : "warn",
    });
  }

  // 6) Returns
  for (const r of returns) {
    if (r.status === "done" && r.done_at) {
      entries.push({
        ts: r.done_at,
        phase: "Logistik · Rücksendung",
        title: `Rücksendung abgewickelt · ${r.quantity} Stk`,
        detail: r.note ?? undefined,
        actor: r.done_by,
        tone: "warn",
      });
    }
  }

  // 7) Marking
  if (job.marked_at) {
    entries.push({
      ts: job.marked_at,
      phase: "Produktion · Marking",
      title: "Lasermarkierung abgeschlossen",
      detail: job.laser_text ?? product?.laser_text ?? undefined,
    });
  }

  // 8) Packing
  if (job.packed_at) {
    entries.push({
      ts: job.packed_at,
      phase: "Produktion · Packing",
      title: "Verpackung abgeschlossen",
      detail: job.packing_type ?? product?.packing_type ?? undefined,
    });
  }

  // 9) Shipment
  if (job.shipped_at) {
    entries.push({
      ts: job.shipped_at,
      phase: "SAP · Versand",
      title: "Ware versendet",
      detail: `${job.shipment_mode === "air" ? "Luftfracht" : job.shipment_mode === "sea" ? "Seefracht" : "—"} → ${job.destination_country ?? "—"}`,
      tone: "info",
    });
  }

  // Sort chronologically (entries without ts sit at their insertion position, using previous ts)
  let prevTs = job.created_at;
  const sortable = entries.map((e) => {
    const ts = e.ts ?? prevTs;
    if (e.ts) prevTs = e.ts;
    return { ...e, _sortTs: ts };
  });
  sortable.sort((a, b) => a._sortTs.localeCompare(b._sortTs));

  return (
    <div className="space-y-4">
      {/* SAP summary strip */}
      <div className="grid gap-2 border border-ink/20 bg-paper p-3 text-xs md:grid-cols-4">
        <SapCell label="Order-Nr." value={job.order_number} />
        <SapCell label="Kunde" value={job.customer} />
        <SapCell label="Lieferant" value={job.supplier} />
        <SapCell label="Referenz" value={product?.reference} />
        <SapCell label="Menge" value={`${job.incoming_qty ?? job.quantity_total} Stk`} />
        <SapCell label="Defekt / Retour" value={job.defect_count ? `${job.defect_count} Stk` : "0"} />
        <SapCell label="Versand" value={job.shipment_mode ? `${job.shipment_mode === "air" ? "Luft" : "See"} → ${job.destination_country ?? "?"}` : "—"} />
        <SapCell label="Prüf-Etikett" value={job.inspection_tag} />
      </div>

      <ol className="relative border-l border-ink/25 pl-6">
        {sortable.map((e, i) => (
          <li key={i} className="relative pb-5 last:pb-0">
            <span
              className={`absolute -left-[29px] top-1 flex h-3 w-3 items-center justify-center border ${
                e.tone === "ok" ? "border-ok bg-ok/30"
                : e.tone === "fail" ? "border-destructive bg-destructive/30"
                : e.tone === "warn" ? "border-accent bg-accent/30"
                : e.tone === "info" ? "border-ink bg-ink"
                : "border-ink/50 bg-paper"
              }`}
            />
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/60">
                {e.phase}
              </div>
              <div className="font-mono text-[10px] text-ink/50">
                {e.ts ? new Date(e.ts).toLocaleString() : "—"}
                {e.actor && ` · ${e.actor}`}
              </div>
            </div>
            <div className="mt-1 font-display text-base">{e.title}</div>
            {e.detail && <div className="mt-0.5 font-mono text-xs text-ink/70">{e.detail}</div>}
          </li>
        ))}
      </ol>
    </div>
  );
}

function SapCell({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-ink/50">{label}</div>
      <div className="mt-0.5 font-mono text-xs text-ink">{value ?? "—"}</div>
    </div>
  );
}
