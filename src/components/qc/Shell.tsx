import type { TestJob, Product } from "@/lib/qcData";

export function AppShell({
  title,
  subtitle,
  role,
  onSwitchRole,
  tab,
  setTab,
  tabs,
  children,
}: {
  title: string;
  subtitle?: string;
  role: "office" | "worker";
  onSwitchRole: () => void;
  tab: string;
  setTab: (t: string) => void;
  tabs: { id: string; label: string; badge?: number }[];
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-ink/15 bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink/50">
              Warenprozess
            </div>
            <div className="font-display text-lg leading-none">{title}</div>
            {subtitle && <div className="font-mono text-[10px] text-ink/50">{subtitle}</div>}
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="rounded-sm border border-ink/25 px-2 py-1 uppercase tracking-[0.18em]">
              {role === "office" ? "Büro" : "Arbeiter"}
            </span>
            <button
              onClick={onSwitchRole}
              className="border border-ink/25 px-2 py-1 uppercase tracking-[0.18em] hover:border-ink"
            >
              Rolle wechseln
            </button>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl flex-wrap gap-1 px-6 pb-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 border-b-2 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] ${
                tab === t.id ? "border-ink text-ink" : "border-transparent text-ink/50 hover:text-ink"
              }`}
            >
              {t.label}
              {typeof t.badge === "number" && (
                <span
                  className={`inline-flex h-5 min-w-5 items-center justify-center rounded-sm px-1 text-[10px] ${
                    tab === t.id ? "bg-ink text-paper" : "bg-ink/10 text-ink"
                  }`}
                >
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
    </div>
  );
}

export function StatusPill({ status }: { status: TestJob["status"] }) {
  const map: Record<TestJob["status"], { l: string; cls: string }> = {
    awaiting_receipt: { l: "Warenannahme", cls: "bg-accent/25 text-ink" },
    in_stock: { l: "Auf Lager", cls: "bg-ink/10 text-ink" },
    scheduled: { l: "Geplant", cls: "bg-muted text-ink/70" },
    in_testing: { l: "In Prüfung", cls: "bg-accent/25 text-ink" },
    awaiting_decision: { l: "Büro-Entscheid", cls: "bg-ink text-paper" },
    in_marking: { l: "Lasermarkierung", cls: "bg-ink/80 text-paper" },
    in_packing: { l: "Verpackung", cls: "bg-ok/20 text-ok" },
    in_shipment: { l: "Versand", cls: "bg-accent/40 text-ink" },
    done: { l: "Fertig", cls: "bg-ok text-paper" },
    rejected: { l: "Gesperrt", cls: "bg-destructive text-destructive-foreground" },
  };
  const v = map[status];
  return (
    <span className={`inline-block rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${v.cls}`}>
      {v.l}
    </span>
  );
}

export function ProductChip({ product, orderNumber }: { product: Product; orderNumber?: string | null }) {
  return (
    <div className="inline-flex items-center gap-2 font-mono text-xs">
      {orderNumber && <span className="rounded-sm bg-ink text-paper px-1.5 py-0.5">#{orderNumber}</span>}
      <span className="rounded-sm bg-ink/8 px-1.5 py-0.5">{product.reference}</span>
    </div>
  );
}
