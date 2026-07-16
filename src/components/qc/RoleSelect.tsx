import { useBi, LangToggle } from "@/lib/i18n";

export function RoleSelect({ onSelect }: { onSelect: (role: "office" | "worker", name: string) => void }) {
  const bi = useBi();
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6">
        <div className="mb-4 self-end"><LangToggle /></div>
        <div className="w-full border border-ink/20 bg-card p-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink/50">{bi("Inspection line", "检验线")}</div>
          <h1 className="mt-1 font-display text-2xl">{bi("Choose role", "选择角色")}</h1>
          <p className="mt-2 font-mono text-xs text-ink/60">{bi("No login — just role selection (login later).", "无需登录 — 仅选择角色(稍后添加登录)。")}</p>

          <RoleCard
            title={bi("Office", "办公室")}
            subtitle={bi("Products, tolerances, planning, releases", "产品、公差、计划、放行")}
            onPick={(name) => onSelect("office", name)}
            defaultName={bi("Office", "办公室")}
            btnLabel={bi("Continue", "继续")}
            namePlaceholder={bi("Name (optional)", "姓名(可选)")}
          />
          <RoleCard
            title={bi("Workers", "工人")}
            subtitle={bi("Inspection stations, laser marking, packing", "检验工位、激光打标、包装")}
            onPick={(name) => onSelect("worker", name)}
            defaultName=""
            btnLabel={bi("Continue", "继续")}
            namePlaceholder={bi("Your name", "您的姓名")}
          />
        </div>
      </div>
    </div>
  );
}

function RoleCard({
  title, subtitle, onPick, defaultName, btnLabel, namePlaceholder,
}: { title: string; subtitle: string; onPick: (name: string) => void; defaultName: string; btnLabel: string; namePlaceholder: string }) {
  return (
    <div className="mt-6 border border-ink/15 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="font-display text-lg">{title}</div>
        <div className="font-mono text-[10px] text-ink/50 text-right">{subtitle}</div>
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const f = e.currentTarget as HTMLFormElement;
          const input = f.elements.namedItem("name") as HTMLInputElement;
          const name = input.value.trim() || defaultName || "Anonymous";
          onPick(name);
        }}
      >
        <input
          name="name"
          defaultValue={defaultName}
          placeholder={namePlaceholder}
          className="flex-1 border-b border-ink/30 bg-transparent px-1 py-2 font-mono text-sm outline-none focus:border-ink"
        />
        <button className="bg-ink px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] text-paper hover:bg-ink/85">
          {btnLabel}
        </button>
      </form>
    </div>
  );
}
