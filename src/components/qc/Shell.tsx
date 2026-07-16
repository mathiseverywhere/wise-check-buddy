import type { TestJob, Product } from "@/lib/qcData";
import { LangToggle, useBi } from "@/lib/i18n";

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
  const bi = useBi();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-ink/15 bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink/50">
              {bi("Warehouse process", "仓库流程")}
            </div>
            <div className="font-display text-lg leading-none">{title}</div>
            {subtitle && <div className="font-mono text-[10px] text-ink/50">{subtitle}</div>}
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <LangToggle />
            <span className="rounded-sm border border-ink/25 px-2 py-1 uppercase tracking-[0.18em]">
              {role === "office" ? bi("Office", "办公室") : bi("Workers", "工人")}
            </span>
            <button
              onClick={onSwitchRole}
              className="border border-ink/25 px-2 py-1 uppercase tracking-[0.18em] hover:border-ink"
            >
              {bi("Switch role", "切换角色")}
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
  const bi = useBi();
  const map: Record<TestJob["status"], { en: string; zh: string; cls: string }> = {
    awaiting_receipt: { en: "Goods receipt", zh: "收货", cls: "bg-accent/25 text-ink" },
    in_stock: { en: "In stock", zh: "在库", cls: "bg-ink/10 text-ink" },
    in_transport: { en: "Transport", zh: "运输中", cls: "bg-accent/40 text-ink" },
    scheduled: { en: "Scheduled", zh: "已排程", cls: "bg-muted text-ink/70" },
    in_testing: { en: "In inspection", zh: "检验中", cls: "bg-accent/25 text-ink" },
    awaiting_decision: { en: "Office decision", zh: "待办公室决定", cls: "bg-ink text-paper" },
    in_marking: { en: "Laser marking", zh: "激光打标", cls: "bg-ink/80 text-paper" },
    in_packing: { en: "Packing", zh: "包装", cls: "bg-ok/20 text-ok" },
    in_shipment: { en: "Shipment", zh: "出货", cls: "bg-accent/40 text-ink" },
    done: { en: "Done", zh: "完成", cls: "bg-ok text-paper" },
    rejected: { en: "Blocked", zh: "拒收", cls: "bg-destructive text-destructive-foreground" },
  };
  const v = map[status];
  return (
    <span className={`inline-block rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${v.cls}`}>
      {bi(v.en, v.zh)}
    </span>
  );
}

export function ProductChip({ product, orderNumber, inspectionTag }: { product: Product; orderNumber?: string | null; inspectionTag?: string | null }) {
  return (
    <div className="inline-flex items-center gap-2 font-mono text-xs">
      {orderNumber && <span className="rounded-sm bg-ink text-paper px-1.5 py-0.5">#{orderNumber}</span>}
      <span className="rounded-sm bg-ink/8 px-1.5 py-0.5">{product.reference}</span>
      {inspectionTag && <span className="rounded-sm bg-accent text-ink px-1.5 py-0.5 font-semibold">🏷 {inspectionTag}</span>}
    </div>
  );
}
