import { createFileRoute } from "@tanstack/react-router";
import { InspectionDemo } from "@/components/InspectionDemo";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Prüfstrecke — Vom Papier zur geführten Qualitätskontrolle" },
      {
        name: "description",
        content:
          "Konzept & Stufenplan für eine geführte Wareneingangsprüfung: AQL-Stichprobe, SAP B1-Anbindung, Tablet-Erfassung am Prüfplatz.",
      },
    ],
  }),
});

function Stamp({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-sm border border-ink/70 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink/80">
      {children}
    </span>
  );
}

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="border-t border-ink/15">
      <div className="mx-auto max-w-6xl px-6 py-20 md:px-10 md:py-28">
        <div className="mb-12 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.22em] text-ink/50">
              {eyebrow}
            </div>
            <h2 className="max-w-3xl text-4xl leading-[1.05] md:text-5xl">{title}</h2>
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}

function Index() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Top rail */}
      <header className="border-b border-ink/15">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-10">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 tape-stripes rounded-[2px]" aria-hidden />
            <span className="font-mono text-xs uppercase tracking-[0.22em]">
              Prüfstrecke / v0.1
            </span>
          </div>
          <nav className="hidden gap-8 font-mono text-[11px] uppercase tracking-[0.22em] text-ink/60 md:flex">
            <a href="#konzept" className="hover:text-ink">01 Konzept</a>
            <a href="#demo" className="hover:text-ink text-accent">Demo</a>
            <a href="#technik" className="hover:text-ink">02 Technik</a>
            <a href="#organisation" className="hover:text-ink">03 Organisation</a>
            <a href="#stufen" className="hover:text-ink">04 Stufenplan</a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-ink/15">
        <div className="absolute inset-0 grid-paper opacity-70" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 py-24 md:px-10 md:py-36">
          <div className="mb-8 flex flex-wrap items-center gap-3">
            <Stamp>Konzeptpapier</Stamp>
            <Stamp>Wareneingang · QS</Stamp>
            <Stamp>Abschlussbericht</Stamp>
          </div>
          <h1 className="max-w-4xl text-5xl leading-[1.02] md:text-7xl">
            Vom Kuli auf dem Klemmbrett zur{" "}
            <em className="font-normal italic text-ink/70">geführten Prüfstrecke</em>
            <span className="text-accent">.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink/70 md:text-xl">
            Eine ehrliche Bestandsaufnahme: Was ein digitales Prüfsystem für den
            Wareneingang wirklich leisten müsste, was es technisch braucht — und
            warum der eigentliche Aufwand nicht in der Software liegt.
          </p>

          <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { k: "1.124+", v: "Referenzen mit Toleranzen" },
              { k: "4–8 Wo.", v: "Prototyp bei fähigem Entwickler" },
              { k: "3–6 Mo.", v: "Solides produktives System" },
            ].map((s) => (
              <div
                key={s.k}
                className="border border-ink/20 bg-card/60 px-5 py-6 backdrop-blur-sm"
              >
                <div className="font-display text-4xl">{s.k}</div>
                <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink/60">
                  {s.v}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 01 — Konzept: Prüfstrecke */}
      <Section id="konzept" eyebrow="01 — Was das System tun müsste" title="Eine geführte Prüfstrecke, Schritt für Schritt.">
        <div className="grid gap-10 md:grid-cols-12">
          <p className="text-lg leading-relaxed text-ink/80 md:col-span-5">
            Der Kern ist ein <strong>geführter Ablauf</strong>: Lieferung anmelden,
            AQL-Stichprobe vorschlagen, Prüfpunkte am Tablet abarbeiten, Auffälligkeiten
            eskalieren, finale Freigabe im Büro. Ergebnisliste und Statistik fallen
            automatisch raus.
          </p>

          <ol className="relative md:col-span-7">
            <div
              className="absolute left-4 top-2 bottom-2 w-px bg-ink/20"
              aria-hidden
            />
            {[
              {
                n: "01",
                t: "Anmeldung",
                d: "Order-Nr. scannen oder aus SAP B1 ziehen. PO → Wareneingang, die Daten existieren dort schon.",
              },
              {
                n: "02",
                t: "AQL-Vorschlag",
                d: "Stichprobengröße automatisch nach AQL. Toleranzen aus der Referenzdatenbank direkt am Schritt.",
              },
              {
                n: "03",
                t: "Prüfung am Tablet",
                d: "Maße, Geräusch, Optik. Eingabe direkt am jeweiligen Prüfpunkt — nicht danach, nicht auf Papier.",
              },
              {
                n: "04",
                t: "Eskalation",
                d: "Bei Auffälligkeit schlägt das System erweiterte Stichprobe oder Vollprüfung vor und dokumentiert sie.",
              },
              {
                n: "05",
                t: "Büro-Freigabe",
                d: "Der Fall läuft in die Queue für die finale Entscheidung. Report, KPIs, Trends: automatisch.",
              },
            ].map((s) => (
              <li key={s.n} className="relative flex gap-6 py-5 pl-0">
                <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ink/40 bg-background font-mono text-[10px] tracking-widest">
                  {s.n}
                </div>
                <div>
                  <div className="font-display text-xl">{s.t}</div>
                  <div className="mt-1 text-ink/70">{s.d}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* 02 — Technik */}
      <Section
        id="technik"
        eyebrow="02 — Technisch weniger als man denkt"
        title="Datenbank, drei Masken, eine SAP-B1-Anbindung."
      >
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              tag: "DB",
              t: "Stammdaten & Toleranzen",
              d: "Referenzen und Toleranzen existieren bereits — sonst wäre Runde 1 nicht standardisiert. Sie brauchen einen sauberen Ort.",
            },
            {
              tag: "UI",
              t: "Drei Masken",
              d: "Anmeldung · Prüfschritte · Büro-Freigabe. Mehr nicht. Alles darüber hinaus ist Feature-Creep.",
            },
            {
              tag: "API",
              t: "SAP Business One",
              d: "Service Layer liefert Wareneingangsdaten. Kein Reverse Engineering, keine Custom-Integration.",
            },
          ].map((c) => (
            <div key={c.t} className="border border-ink/20 bg-card p-8">
              <div className="mb-6 inline-block tape-stripes px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-paper">
                {c.tag}
              </div>
              <div className="font-display text-2xl leading-tight">{c.t}</div>
              <p className="mt-3 text-ink/70">{c.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 border border-ink/25 bg-card">
          <div className="flex items-center justify-between border-b border-ink/15 px-6 py-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink/60">
              Aufwandsschätzung
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink/40">
              // ehrlich, nicht optimistisch
            </span>
          </div>
          <div className="grid gap-0 md:grid-cols-2">
            <div className="border-b border-ink/15 p-8 md:border-b-0 md:border-r">
              <div className="font-mono text-xs uppercase tracking-widest text-ink/50">
                Prototyp
              </div>
              <div className="mt-2 font-display text-5xl">4–8 Wochen</div>
              <p className="mt-3 text-ink/70">
                Ein fähiger Entwickler baut einen funktionierenden Prototyp — genug
                um den Ablauf am Prüfplatz zu validieren.
              </p>
            </div>
            <div className="p-8">
              <div className="font-mono text-xs uppercase tracking-widest text-ink/50">
                Produktiv
              </div>
              <div className="mt-2 font-display text-5xl">3–6 Monate</div>
              <p className="mt-3 text-ink/70">
                Solides produktives System inkl. Fehlerbehandlung, Rollen,
                Audit-Trail und SAP-Anbindung im Regelbetrieb.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* 03 — Organisation */}
      <Section
        id="organisation"
        eyebrow="03 — Organisatorisch deutlich mehr"
        title="Hier liegt der eigentliche Aufwand — chronisch unterschätzt."
      >
        <div className="grid gap-px overflow-hidden border border-ink/20 bg-ink/20 md:grid-cols-2">
          {[
            {
              n: "A",
              t: "Hardware am Prüfplatz",
              d: "Tablets in einer Werkstattumgebung mit öligen Händen. Klingt banal, entscheidet aber über Akzeptanz. Ist die Eingabe langsamer als der Kuli, wird das System umgangen — Datenmüll oder Nacherfassung.",
            },
            {
              n: "B",
              t: "Der Faktor Mensch",
              d: "Prüfer arbeiten seit Jahren mit Papier. Ein System, das jeden Schritt erzwingt, kann als Kontrolle empfunden werden — besonders wenn Prüferdaten plötzlich auswertbar sind. Braucht Einbindung, nicht Verordnung.",
            },
            {
              n: "C",
              t: "Stammdatenpflege",
              d: "Wer pflegt Toleranzen für 1.124+ Referenzen? Wer ergänzt neue Defektkategorien? Ohne klaren Owner verrottet das System still vor sich hin.",
            },
            {
              n: "D",
              t: "Ausfallszenario",
              d: "Was passiert, wenn das WLAN im Prüfraum hängt? Papier-Fallback muss definiert sein — sonst steht der Wareneingang.",
            },
          ].map((r) => (
            <div key={r.n} className="bg-card p-8">
              <div className="flex items-start gap-5">
                <div className="font-display text-5xl text-accent">{r.n}</div>
                <div>
                  <div className="font-display text-2xl leading-tight">{r.t}</div>
                  <p className="mt-3 text-ink/70">{r.d}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 04 — Stufenplan */}
      <Section
        id="stufen"
        eyebrow="04 — Empfehlungsarchitektur"
        title="Ein Pfad in drei Stufen — kein Alles-oder-nichts."
      >
        <p className="mb-12 max-w-3xl text-lg leading-relaxed text-ink/70">
          Für eine 30-Personen-Firma ist der Eigenbau vermutlich überdimensioniert.
          Realistisch ist eine Zwischenstufe: das <strong>Excel-Template als Pilot</strong>
          {" "}validiert den Workflow ohne Investition — und liefert Daten, die schon
          maschinenlesbar sind.
        </p>

        <div className="space-y-6">
          {[
            {
              n: "Stufe 1",
              t: "Template",
              cost: "sofort · kostenlos",
              d: "Excel mit Dropdowns, Zwei-Blöcken und Prüfumfang-Feld. Validiert die Struktur, die Kategorien, den Workflow. Die Daten sind bereits maschinenlesbar.",
              color: "bg-card",
            },
            {
              n: "Stufe 2",
              t: "Zentrale Ablage + Auswertung",
              cost: "Skript-Apparat aus dem Praktikum",
              d: "Gesammelte Templates werden automatisch ausgewertet. Erste KPIs, Trends, Fehlerbilder — ohne dass jemand manuell in Excel rechnet.",
              color: "bg-secondary",
            },
            {
              n: "Stufe 3",
              t: "Geführte Erfassung",
              cost: "Investitionsentscheidung auf belastbarer Datengrundlage",
              d: "Die App mit SAP-B1-Anbindung, AQL, Tablet-Erfassung, Eskalations-Workflow. Datenstruktur, Kategorien und Prozesslogik sind dann schon erprobt.",
              color: "bg-ink text-paper",
            },
          ].map((s, i) => (
            <div
              key={s.n}
              className={`grid grid-cols-12 items-start gap-6 border border-ink/25 p-8 ${s.color}`}
            >
              <div className="col-span-12 md:col-span-3">
                <div
                  className={`font-mono text-[11px] uppercase tracking-[0.22em] ${
                    i === 2 ? "text-paper/60" : "text-ink/50"
                  }`}
                >
                  {s.n}
                </div>
                <div className="mt-1 font-display text-4xl leading-none">{s.t}</div>
              </div>
              <div className="col-span-12 md:col-span-6">
                <p className={i === 2 ? "text-paper/85" : "text-ink/75"}>{s.d}</p>
              </div>
              <div className="col-span-12 md:col-span-3">
                <div
                  className={`font-mono text-[11px] uppercase tracking-[0.18em] ${
                    i === 2 ? "text-accent" : "text-ink/50"
                  }`}
                >
                  Aufwand
                </div>
                <div
                  className={`mt-1 text-sm ${i === 2 ? "text-paper" : "text-ink"}`}
                >
                  {s.cost}
                </div>
              </div>
            </div>
          ))}
        </div>

        <blockquote className="mt-16 border-l-4 border-accent bg-card p-8 md:p-10">
          <p className="font-display text-2xl italic leading-snug md:text-3xl">
            &bdquo;Jede Stufe liefert für sich schon Wert — und macht die nächste
            zur informierten Entscheidung, nicht zum Sprung ins Ungewisse.&ldquo;
          </p>
          <footer className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-ink/50">
            — Empfehlung für den Abschlussbericht
          </footer>
        </blockquote>
      </Section>

      {/* Footer */}
      <footer className="border-t border-ink/15">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 md:flex-row md:items-center md:justify-between md:px-10">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 tape-stripes rounded-[2px]" aria-hidden />
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink/60">
              Prüfstrecke — Konzeptpapier
            </span>
          </div>
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink/40">
            QS · Wareneingang · SAP B1 · AQL
          </div>
        </div>
      </footer>
    </main>
  );
}
