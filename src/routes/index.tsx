import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RoleSelect } from "@/components/qc/RoleSelect";
import { OfficeView } from "@/components/qc/OfficeView";
import { WorkerView } from "@/components/qc/WorkerView";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Inspection line — QC-System" },
      { name: "description", content: "Quality control: products, tolerances, inspection jobs, laser marking, packing." },
    ],
  }),
  component: HomePage,
});

type Session = { role: "office" | "worker"; name: string };
const KEY = "qc-session-v2";

function HomePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setSession(JSON.parse(raw));
    } catch { /* ignore */ }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    if (session) localStorage.setItem(KEY, JSON.stringify(session));
    else localStorage.removeItem(KEY);
  }, [session, ready]);

  if (!ready) return null;
  if (!session) return <RoleSelect onSelect={(role, name) => setSession({ role, name })} />;
  const switchRole = () => setSession(null);
  return session.role === "office"
    ? <OfficeView onSwitchRole={switchRole} />
    : <WorkerView workerName={session.name} onSwitchRole={switchRole} />;
}
