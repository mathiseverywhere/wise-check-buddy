import { useState } from "react";
import { useQC } from "@/lib/qcStore";

export function Login() {
  const { dispatch } = useQC();
  const [name, setName] = useState("");
  const [role, setRole] = useState<"office" | "worker">("worker");

  function submit() {
    const n = name.trim() || (role === "office" ? "Büro" : "Arbeiter");
    dispatch({ type: "login", session: { role, name: n } });
  }

  return (
    <div className="min-h-screen grid-paper flex items-center justify-center p-6">
      <div className="w-full max-w-md border border-ink/25 bg-card p-8">
        <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink/50">
          QC-System · Anmeldung
        </div>
        <h1 className="mt-2 font-display text-3xl">Prüfstrecke</h1>
        <p className="mt-2 text-sm text-ink/60">
          Wähle deine Rolle. Büro plant und entscheidet, Arbeiter erfassen an den Stationen.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2">
          {(["worker", "office"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`border px-4 py-3 font-mono text-xs uppercase tracking-[0.18em] ${
                role === r
                  ? "border-ink bg-ink text-paper"
                  : "border-ink/25 hover:border-ink"
              }`}
            >
              {r === "worker" ? "Arbeiter" : "Büro"}
            </button>
          ))}
        </div>

        <label className="mt-6 block font-mono text-[10px] uppercase tracking-[0.22em] text-ink/60">
          Name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={role === "office" ? "z.B. Meier (Büro)" : "z.B. Anna"}
          className="mt-2 w-full border-b-2 border-ink/30 bg-transparent py-2 font-mono outline-none focus:border-ink"
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button
          onClick={submit}
          className="mt-8 w-full bg-ink px-4 py-3 font-mono text-xs uppercase tracking-[0.22em] text-paper hover:bg-ink/85"
        >
          Anmelden →
        </button>

        <div className="mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-ink/40">
          Demo · lokale Speicherung im Browser
        </div>
      </div>
    </div>
  );
}
