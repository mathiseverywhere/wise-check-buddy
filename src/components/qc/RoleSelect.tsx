export function RoleSelect({ onSelect }: { onSelect: (role: "office" | "worker", name: string) => void }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6">
        <div className="w-full border border-ink/20 bg-card p-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink/50">Prüfstrecke</div>
          <h1 className="mt-1 font-display text-2xl">Rolle wählen</h1>
          <p className="mt-2 font-mono text-xs text-ink/60">Kein Login — nur Rollenauswahl (Login kommt später).</p>

          <RoleCard
            title="Büro"
            subtitle="Produkte, Toleranzen, Planung, Freigaben"
            onPick={(name) => onSelect("office", name)}
            defaultName="Büro"
          />
          <RoleCard
            title="Arbeiter"
            subtitle="Prüfstationen, Lasermarkierung, Verpackung"
            onPick={(name) => onSelect("worker", name)}
            defaultName=""
          />
        </div>
      </div>
    </div>
  );
}

function RoleCard({
  title, subtitle, onPick, defaultName,
}: { title: string; subtitle: string; onPick: (name: string) => void; defaultName: string }) {
  return (
    <div className="mt-6 border border-ink/15 p-4">
      <div className="flex items-baseline justify-between">
        <div className="font-display text-lg">{title}</div>
        <div className="font-mono text-[10px] text-ink/50">{subtitle}</div>
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const f = e.currentTarget as HTMLFormElement;
          const input = f.elements.namedItem("name") as HTMLInputElement;
          const name = input.value.trim() || (title === "Büro" ? "Büro" : "Anonym");
          onPick(name);
        }}
      >
        <input
          name="name"
          defaultValue={defaultName}
          placeholder={title === "Büro" ? "Name (optional)" : "Dein Name"}
          className="flex-1 border-b border-ink/30 bg-transparent px-1 py-2 font-mono text-sm outline-none focus:border-ink"
        />
        <button className="bg-ink px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] text-paper hover:bg-ink/85">
          Weiter
        </button>
      </form>
    </div>
  );
}
