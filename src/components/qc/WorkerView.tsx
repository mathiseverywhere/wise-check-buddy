import { useMemo, useState } from "react";
import { useQC, type Station, type TestJob } from "@/lib/qcStore";
import { AppShell, ProductChip, StatusPill } from "./Shell";

export function WorkerView() {
  const { state } = useQC();
  const [tab, setTab] = useState<"testing" | "marking" | "packing">("testing");

  const testingJobs = state.jobs.filter((j) => j.status === "in_testing" || j.status === "scheduled");
  const markingJobs = state.jobs.filter((j) => j.status === "in_marking");
  const packingJobs = state.jobs.filter((j) => j.status === "in_packing");

  return (
    <AppShell
      title="Arbeitsplatz"
      subtitle="Prüfstationen · Marking · Packing"
      tab={tab}
      setTab={(t) => setTab(t as typeof tab)}
      tabs={[
        { id: "testing", label: "Prüfung", badge: testingJobs.length },
        { id: "marking", label: "Lasermarkierung", badge: markingJobs.length },
        { id: "packing", label: "Verpackung", badge: packingJobs.length },
      ]}
    >
      {tab === "testing" && <TestingTab jobs={testingJobs} />}
      {tab === "marking" && <MarkingTab jobs={markingJobs} />}
      {tab === "packing" && <PackingTab jobs={packingJobs} />}
    </AppShell>
  );
}

// ---------- Testing ----------

function TestingTab({ jobs }: { jobs: TestJob[] }) {
  const { productOf, fullCheckActive } = useQC();
  const [selectedId, setSelectedId] = useState<string | null>(jobs[0]?.id ?? null);
  const job = useMemo(() => jobs.find((j) => j.id === selectedId) ?? jobs[0], [jobs, selectedId]);

  const blockedByFullCheck =
    fullCheckActive && job && fullCheckActive.id !== job.id && job.stations.every((s) => s.status === "open");

  return (
    <div className="grid gap-4 md:grid-cols-[320px,1fr]">
      <aside className="border border-ink/20 bg-card">
        <div className="border-b border-ink/15 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ink/50">
          Aufträge · {jobs.length}
        </div>
        <ul className="divide-y divide-ink/10">
          {jobs.length === 0 && <li className="p-4 font-mono text-xs text-ink/40">— keine offenen —</li>}
          {jobs.map((j) => {
            const p = productOf(j.productId);
            const done = j.stations.filter((s) => s.status === "done").length;
            const isFC = j.instructions === "full_check";
            const active = job?.id === j.id;
            return (
              <li key={j.id}>
                <button
                  onClick={() => setSelectedId(j.id)}
                  className={`block w-full px-4 py-3 text-left transition ${
                    active ? "bg-ink text-paper" : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm">{p?.reference}</span>
                    {isFC && (
                      <span className="tape-stripes px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-paper">
                        Full
                      </span>
                    )}
                  </div>
                  <div className={`mt-0.5 text-xs ${active ? "text-paper/70" : "text-ink/60"}`}>
                    {p?.name}
                  </div>
                  <div className={`mt-1 font-mono text-[10px] ${active ? "text-paper/60" : "text-ink/50"}`}>
                    {j.scheduledDate} · {done}/{j.stations.length} Stationen
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <section>
        {!job && (
          <div className="border border-ink/20 bg-card p-10 text-center font-mono text-sm text-ink/40">
            Kein Auftrag ausgewählt.
          </div>
        )}
        {job && (
          <JobDetail
            job={job}
            blocked={!!blockedByFullCheck}
            fullCheckOtherRef={
              blockedByFullCheck && fullCheckActive
                ? productOf(fullCheckActive.productId)?.reference
                : undefined
            }
          />
        )}
      </section>
    </div>
  );
}

function JobDetail({
  job,
  blocked,
  fullCheckOtherRef,
}: {
  job: TestJob;
  blocked: boolean;
  fullCheckOtherRef?: string;
}) {
  const { state, dispatch, productOf, today } = useQC();
  const product = productOf(job.productId);
  const worker = state.session!.name;
  const [openStation, setOpenStation] = useState<string | null>(null);

  const doneCount = job.stations.filter((s) => s.status === "done").length;
  const failCount = job.stations.filter((s) => s.result === "fail").length;
  const myClaimedToday = job.stations.some(
    (s) => s.status === "claimed" && s.claimedBy === worker && s.claimedDate === today,
  );

  return (
    <div className="border border-ink/25 bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/15 px-6 py-4">
        <div>
          {product && <ProductChip product={product} />}
          <div className="mt-1 font-mono text-[10px] text-ink/50">
            Auftrag {job.id} · {job.scheduledDate} · Menge {job.quantity}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {job.instructions === "full_check" && (
            <span className="tape-stripes px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-paper">
              Full Check · alle Prüfpunkte zwingend
            </span>
          )}
          <StatusPill status={job.status} />
        </div>
      </div>

      {blocked && (
        <div className="border-b border-accent/40 bg-accent/10 px-6 py-3 font-mono text-xs">
          Full Check auf {fullCheckOtherRef ?? "einem anderen Auftrag"} aktiv — dieser Auftrag darf nicht angefangen werden.
        </div>
      )}

      {job.officeNote && (
        <div className="border-b border-ink/10 bg-muted px-6 py-2 font-mono text-xs">
          Büro-Hinweis: {job.officeNote}
        </div>
      )}

      <div className="grid gap-0 md:grid-cols-2">
        <div className="border-b border-ink/10 md:border-b-0 md:border-r">
          <div className="border-b border-ink/10 px-6 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink/50">
            Stationen · {doneCount}/{job.stations.length}
          </div>
          <ul className="divide-y divide-ink/10">
            {job.stations.map((s) => {
              const highlight = s.result === "fail";
              const mine = s.claimedBy === worker;
              const active = openStation === s.id;
              return (
                <li
                  key={s.id}
                  className={`px-6 py-3 ${highlight ? "bg-destructive/8" : ""} ${active ? "bg-muted" : ""}`}
                >
                  <button
                    onClick={() => setOpenStation(active ? null : s.id)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={highlight ? "font-semibold text-destructive" : ""}>{s.cp.label}</span>
                        {highlight && (
                          <span className="rounded-sm bg-destructive/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-destructive">
                            außer Toleranz
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[10px] text-ink/50">
                        Soll: {s.cp.spec}
                        {s.claimedBy && ` · ${s.claimedBy}${s.claimedDate ? ` (${s.claimedDate})` : ""}`}
                      </div>
                    </div>
                    <StationBadge s={s} mine={mine} />
                  </button>

                  {active && (
                    <StationForm
                      key={s.id + s.status}
                      station={s}
                      canClaim={!blocked && s.status === "open" && !myClaimedToday}
                      claimHint={
                        myClaimedToday && s.status === "open"
                          ? "Heute ist bereits eine Station in Bearbeitung."
                          : blocked
                            ? "Blockiert durch Full Check."
                            : undefined
                      }
                      onClaim={() =>
                        dispatch({
                          type: "claimStation",
                          jobId: job.id,
                          stationId: s.id,
                          worker,
                          date: today,
                        })
                      }
                      onRelease={() =>
                        dispatch({ type: "releaseStation", jobId: job.id, stationId: s.id })
                      }
                      onSubmit={(value, result, note) =>
                        dispatch({
                          type: "completeStation",
                          jobId: job.id,
                          stationId: s.id,
                          value,
                          result,
                          note,
                        })
                      }
                      isMine={mine}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="p-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/50">Fortschritt</div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink/10">
            <div className="h-full bg-ink" style={{ width: `${(doneCount / job.stations.length) * 100}%` }} />
          </div>
          <div className="mt-1 font-mono text-[10px] text-ink/50">
            {doneCount} von {job.stations.length}
          </div>

          <div className="mt-6 space-y-2 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-ink/50">Abweichungen</span>
              <span className={failCount > 0 ? "text-destructive" : "text-ok"}>{failCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink/50">Menge</span>
              <span>{job.quantity} Stk</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink/50">Nach Abschluss</span>
              <span>{product?.hasLaserMarking ? "→ Lasermarkierung" : "→ Verpackung"}</span>
            </div>
          </div>

          {job.status === "awaiting_decision" && (
            <div className="mt-6 border-l-4 border-ink bg-muted p-4 font-mono text-xs">
              Alle Stationen abgeschlossen. Wartet auf Büro-Freigabe.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StationBadge({ s, mine }: { s: Station; mine: boolean }) {
  if (s.status === "done") {
    return (
      <span
        className={`rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${
          s.result === "ok" ? "bg-ok/15 text-ok" : "bg-destructive/15 text-destructive"
        }`}
      >
        {s.result === "ok" ? "OK · " + s.value : "NIO · " + s.value}
      </span>
    );
  }
  if (s.status === "claimed") {
    return (
      <span
        className={`rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${
          mine ? "bg-ink text-paper" : "bg-accent/25 text-ink"
        }`}
      >
        {mine ? "Meine Station" : "belegt"}
      </span>
    );
  }
  return (
    <span className="rounded-sm border border-ink/30 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em]">
      offen
    </span>
  );
}

function StationForm({
  station,
  canClaim,
  claimHint,
  isMine,
  onClaim,
  onRelease,
  onSubmit,
}: {
  station: Station;
  canClaim: boolean;
  claimHint?: string;
  isMine: boolean;
  onClaim: () => void;
  onRelease: () => void;
  onSubmit: (v: string, r: "ok" | "fail", note?: string) => void;
}) {
  const [value, setValue] = useState("");
  const [visual, setVisual] = useState<"ok" | "fail" | null>(null);
  const [note, setNote] = useState("");

  const evaluate = (raw: string): "ok" | "fail" | null => {
    if (station.cp.type === "numeric" && station.cp.tolerance) {
      const v = parseFloat(raw.replace(",", "."));
      if (Number.isNaN(v)) return null;
      return v >= station.cp.tolerance.min && v <= station.cp.tolerance.max ? "ok" : "fail";
    }
    return null;
  };

  if (station.status === "done") {
    return (
      <div className="mt-3 rounded-sm bg-muted p-3 font-mono text-xs">
        Ergebnis: <b>{station.value}</b> · {station.result === "ok" ? "in Toleranz" : "außer Toleranz"} · von {station.claimedBy}
        {station.note && <div className="mt-1 text-ink/60">Notiz: {station.note}</div>}
      </div>
    );
  }

  if (station.status === "open") {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          onClick={onClaim}
          disabled={!canClaim}
          className="bg-ink px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] text-paper disabled:opacity-30 hover:bg-ink/85"
        >
          Station übernehmen
        </button>
        {claimHint && <span className="font-mono text-xs text-ink/50">{claimHint}</span>}
      </div>
    );
  }

  // claimed
  if (!isMine) {
    return (
      <div className="mt-3 font-mono text-xs text-ink/60">
        Belegt durch {station.claimedBy}. Warteschlange — nächste Station wählen.
      </div>
    );
  }

  const preview = station.cp.type === "numeric" ? evaluate(value) : visual;

  return (
    <div className="mt-3 space-y-3">
      {station.cp.type === "numeric" ? (
        <div className="flex items-end gap-3">
          <input
            autoFocus
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0.00"
            className="w-40 border-b-2 border-ink/30 bg-transparent py-2 font-mono text-2xl outline-none focus:border-ink"
          />
          {station.cp.unit && <span className="pb-2 font-mono text-sm text-ink/50">{station.cp.unit}</span>}
          {preview && (
            <span
              className={`ml-auto rounded-sm px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${
                preview === "ok" ? "bg-ok/15 text-ok" : "bg-destructive/15 text-destructive"
              }`}
            >
              {preview === "ok" ? "in Toleranz" : "außerhalb"}
            </span>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => setVisual("ok")}
            className={`border px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] ${
              visual === "ok" ? "border-ok bg-ok/15 text-ok" : "border-ink/25"
            }`}
          >
            ✓ i.O.
          </button>
          <button
            onClick={() => setVisual("fail")}
            className={`border px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] ${
              visual === "fail" ? "border-destructive bg-destructive/15 text-destructive" : "border-ink/25"
            }`}
          >
            ✕ n.i.O.
          </button>
        </div>
      )}

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Notiz (optional)"
        rows={2}
        className="w-full border border-ink/20 bg-transparent px-2 py-1 font-mono text-xs"
      />

      <div className="flex gap-2">
        <button
          disabled={!preview}
          onClick={() => {
            if (station.cp.type === "numeric") {
              const r = evaluate(value);
              if (r) onSubmit(value, r, note || undefined);
            } else if (visual) {
              onSubmit(visual === "ok" ? "OK" : "NIO", visual, note || undefined);
            }
          }}
          className="bg-ink px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] text-paper disabled:opacity-30 hover:bg-ink/85"
        >
          Ergebnis bestätigen
        </button>
        <button
          onClick={onRelease}
          className="border border-ink/25 px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] hover:border-ink"
        >
          Freigeben
        </button>
      </div>
    </div>
  );
}

// ---------- Marking ----------

function MarkingTab({ jobs }: { jobs: TestJob[] }) {
  const { dispatch, productOf } = useQC();
  if (jobs.length === 0) {
    return (
      <div className="border border-ink/20 bg-card p-10 text-center font-mono text-sm text-ink/40">
        Keine Produkte in Lasermarkierung.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {jobs.map((j) => {
        const p = productOf(j.productId);
        return (
          <div key={j.id} className="flex flex-wrap items-center justify-between gap-3 border border-ink/20 bg-card p-4">
            <div>
              {p && <ProductChip product={p} />}
              <div className="mt-1 font-mono text-[10px] text-ink/50">
                Menge {j.quantity} · Gravur: <b>{p?.laserText ?? p?.reference}</b>
              </div>
            </div>
            <button
              onClick={() => dispatch({ type: "completeMarking", jobId: j.id })}
              className="bg-ink px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] text-paper hover:bg-ink/85"
            >
              Markierung fertig → Verpackung
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Packing ----------

function PackingTab({ jobs }: { jobs: TestJob[] }) {
  const { dispatch, productOf } = useQC();
  if (jobs.length === 0) {
    return (
      <div className="border border-ink/20 bg-card p-10 text-center font-mono text-sm text-ink/40">
        Keine Produkte in Verpackung.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {jobs.map((j) => {
        const p = productOf(j.productId);
        return (
          <div key={j.id} className="flex flex-wrap items-center justify-between gap-3 border border-ink/20 bg-card p-4">
            <div>
              {p && <ProductChip product={p} />}
              <div className="mt-1 font-mono text-[10px] text-ink/50">
                Menge {j.quantity} · Verpackung: <b>{p?.packingType}</b>
                {p?.hasLaserMarking && j.markedAt ? " · Lasermarkierung erledigt" : ""}
              </div>
            </div>
            <button
              onClick={() => dispatch({ type: "completePacking", jobId: j.id })}
              className="bg-ok px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] text-paper hover:opacity-90"
            >
              Verpackung abschließen ✓
            </button>
          </div>
        );
      })}
    </div>
  );
}
