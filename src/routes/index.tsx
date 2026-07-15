import { createFileRoute } from "@tanstack/react-router";
import { QCProvider, useQC } from "@/lib/qcStore";
import { Login } from "@/components/qc/Login";
import { OfficeView } from "@/components/qc/OfficeView";
import { WorkerView } from "@/components/qc/WorkerView";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Prüfstrecke — QC-System" },
      {
        name: "description",
        content:
          "Interaktive Qualitätskontrolle: Produkte, Terminplanung, Prüfstationen mit Warteschlange, Lasermarkierung und Verpackung.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <QCProvider>
      <Router />
    </QCProvider>
  );
}

function Router() {
  const { state } = useQC();
  if (!state.session) return <Login />;
  return state.session.role === "office" ? <OfficeView /> : <WorkerView />;
}
