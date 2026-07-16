import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "zh" | "both";

type Ctx = { lang: Lang; setLang: (l: Lang) => void };
const LangCtx = createContext<Ctx>({ lang: "both", setLang: () => {} });

const KEY = "qc-lang-v1";

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("both");
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw === "en" || raw === "zh" || raw === "both") setLangState(raw);
    } catch { /* ignore */ }
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
  };
  return <LangCtx.Provider value={{ lang, setLang }}>{children}</LangCtx.Provider>;
}

export function useLang() { return useContext(LangCtx); }

/**
 * Bilingual string helper. Returns Chinese, English, or both depending on
 * the active language setting.
 */
export function useBi() {
  const { lang } = useContext(LangCtx);
  return (en: string, zh: string, sep = " · ") => {
    if (lang === "en") return en;
    if (lang === "zh") return zh;
    return `${en}${sep}${zh}`;
  };
}

/** JSX variant — stacks Chinese under English in "both" mode. */
export function T({ en, zh, className, inline = false }: { en: string; zh: string; className?: string; inline?: boolean }) {
  const { lang } = useContext(LangCtx);
  if (lang === "en") return <span className={className}>{en}</span>;
  if (lang === "zh") return <span className={className}>{zh}</span>;
  if (inline) return <span className={className}>{en} · {zh}</span>;
  return (
    <span className={className}>
      <span>{en}</span>
      <span className="ml-1 opacity-70">· {zh}</span>
    </span>
  );
}

export function LangToggle() {
  const { lang, setLang } = useContext(LangCtx);
  const opt = (v: Lang, label: string) => (
    <button
      key={v}
      onClick={() => setLang(v)}
      className={`px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${lang === v ? "bg-ink text-paper" : "text-ink/60 hover:text-ink"}`}
    >
      {label}
    </button>
  );
  return (
    <div className="inline-flex border border-ink/25">
      {opt("en", "EN")}
      {opt("zh", "中")}
      {opt("both", "EN·中")}
    </div>
  );
}
