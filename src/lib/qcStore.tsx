import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";

// ---------- Types ----------

export type PackingType = "Karton einzeln" | "Blister" | "Sammelkiste" | "Kunststoffbeutel";

export type Product = {
  id: string;
  reference: string; // z.B. REF-1042
  name: string;
  hasLaserMarking: boolean;
  laserText?: string;
  packingType: PackingType;
  createdAt: number;
};

export type CheckPointType = "numeric" | "visual";

export type CheckPoint = {
  id: string;
  label: string;
  spec: string;
  unit?: string;
  tolerance?: { min: number; max: number };
  type: CheckPointType;
};

export type StationStatus = "open" | "claimed" | "done";

export type Station = {
  id: string;
  cp: CheckPoint;
  status: StationStatus;
  claimedBy?: string;
  claimedDate?: string; // YYYY-MM-DD
  value?: string;
  result?: "ok" | "fail";
  note?: string;
  completedAt?: number;
};

export type JobStatus =
  | "scheduled"
  | "in_testing"
  | "awaiting_decision"
  | "in_marking"
  | "in_packing"
  | "done"
  | "rejected";

export type TestJob = {
  id: string;
  productId: string;
  scheduledDate: string; // YYYY-MM-DD
  quantity: number;
  instructions: "normal" | "full_check";
  officeNote?: string;
  status: JobStatus;
  stations: Station[];
  decision?: "pass" | "retest" | "reject";
  decisionNote?: string;
  createdAt: number;
  markedAt?: number;
  packedAt?: number;
};

export type Role = "office" | "worker";

export type Session = { role: Role; name: string } | null;

type State = {
  products: Product[];
  jobs: TestJob[];
  session: Session;
};

type Action =
  | { type: "hydrate"; state: State }
  | { type: "login"; session: Session }
  | { type: "logout" }
  | { type: "addProduct"; product: Product }
  | { type: "scheduleJob"; job: TestJob }
  | { type: "setInstructions"; jobId: string; instructions: "normal" | "full_check"; note?: string }
  | {
      type: "claimStation";
      jobId: string;
      stationId: string;
      worker: string;
      date: string;
    }
  | {
      type: "completeStation";
      jobId: string;
      stationId: string;
      value: string;
      result: "ok" | "fail";
      note?: string;
    }
  | { type: "releaseStation"; jobId: string; stationId: string }
  | { type: "decide"; jobId: string; decision: "pass" | "retest" | "reject"; note?: string }
  | { type: "completeMarking"; jobId: string }
  | { type: "completePacking"; jobId: string };

// ---------- Default checkpoints template ----------

function defaultStations(): Station[] {
  const cps: CheckPoint[] = [
    {
      id: "dim1",
      label: "Maß A (Ø)",
      spec: "18.00 ± 0.05 mm",
      unit: "mm",
      tolerance: { min: 17.95, max: 18.05 },
      type: "numeric",
    },
    {
      id: "dim2",
      label: "Maß B (L)",
      spec: "84.00 ± 0.10 mm",
      unit: "mm",
      tolerance: { min: 83.9, max: 84.1 },
      type: "numeric",
    },
    {
      id: "noise",
      label: "Geräuschprüfung",
      spec: "≤ 62 dB",
      unit: "dB",
      tolerance: { min: 0, max: 62 },
      type: "numeric",
    },
    { id: "visual", label: "Optik / Oberfläche", spec: "keine Kratzer, keine Grate", type: "visual" },
  ];
  return cps.map((cp) => ({ id: cp.id, cp, status: "open" }));
}

// ---------- Seed ----------

function seed(): State {
  const products: Product[] = [
    {
      id: "p1",
      reference: "REF-1042",
      name: "Getriebewelle Ø18",
      hasLaserMarking: true,
      laserText: "REF-1042 · LOT",
      packingType: "Karton einzeln",
      createdAt: Date.now() - 86400000 * 5,
    },
    {
      id: "p2",
      reference: "REF-0788",
      name: "Lagerbuchse 12/16",
      hasLaserMarking: false,
      packingType: "Blister",
      createdAt: Date.now() - 86400000 * 3,
    },
  ];
  const today = new Date().toISOString().slice(0, 10);
  const jobs: TestJob[] = [
    {
      id: "j1",
      productId: "p1",
      scheduledDate: today,
      quantity: 32,
      instructions: "normal",
      status: "in_testing",
      stations: defaultStations(),
      createdAt: Date.now() - 3600000,
    },
    {
      id: "j2",
      productId: "p2",
      scheduledDate: today,
      quantity: 20,
      instructions: "normal",
      status: "scheduled",
      stations: defaultStations(),
      createdAt: Date.now() - 1800000,
    },
  ];
  return { products, jobs, session: null };
}

// ---------- Reducer ----------

function updateJob(state: State, jobId: string, fn: (j: TestJob) => TestJob): State {
  return { ...state, jobs: state.jobs.map((j) => (j.id === jobId ? fn(j) : j)) };
}

function advanceIfAllDone(job: TestJob): TestJob {
  if (job.status !== "in_testing") return job;
  if (job.stations.every((s) => s.status === "done")) {
    return { ...job, status: "awaiting_decision" };
  }
  return job;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "login":
      return { ...state, session: action.session };
    case "logout":
      return { ...state, session: null };
    case "addProduct":
      return { ...state, products: [...state.products, action.product] };
    case "scheduleJob":
      return { ...state, jobs: [...state.jobs, action.job] };
    case "setInstructions":
      return updateJob(state, action.jobId, (j) => ({
        ...j,
        instructions: action.instructions,
        officeNote: action.note ?? j.officeNote,
      }));
    case "claimStation":
      return updateJob(state, action.jobId, (j) => ({
        ...j,
        status: j.status === "scheduled" ? "in_testing" : j.status,
        stations: j.stations.map((s) =>
          s.id === action.stationId && s.status === "open"
            ? { ...s, status: "claimed", claimedBy: action.worker, claimedDate: action.date }
            : s,
        ),
      }));
    case "completeStation":
      return updateJob(state, action.jobId, (j) => {
        const next = {
          ...j,
          stations: j.stations.map((s) =>
            s.id === action.stationId
              ? {
                  ...s,
                  status: "done" as const,
                  value: action.value,
                  result: action.result,
                  note: action.note,
                  completedAt: Date.now(),
                }
              : s,
          ),
        };
        return advanceIfAllDone(next);
      });
    case "releaseStation":
      return updateJob(state, action.jobId, (j) => ({
        ...j,
        stations: j.stations.map((s) =>
          s.id === action.stationId && s.status === "claimed"
            ? { ...s, status: "open", claimedBy: undefined, claimedDate: undefined }
            : s,
        ),
      }));
    case "decide": {
      return updateJob(state, action.jobId, (j) => {
        const product = state.products.find((p) => p.id === j.productId);
        let status: JobStatus = j.status;
        if (action.decision === "pass") {
          status = product?.hasLaserMarking ? "in_marking" : "in_packing";
        } else if (action.decision === "reject") {
          status = "rejected";
        } else {
          // retest → new open stations, back to in_testing
          return {
            ...j,
            decision: action.decision,
            decisionNote: action.note,
            status: "in_testing",
            stations: defaultStations(),
          };
        }
        return { ...j, decision: action.decision, decisionNote: action.note, status };
      });
    }
    case "completeMarking":
      return updateJob(state, action.jobId, (j) => ({
        ...j,
        status: "in_packing",
        markedAt: Date.now(),
      }));
    case "completePacking":
      return updateJob(state, action.jobId, (j) => ({
        ...j,
        status: "done",
        packedAt: Date.now(),
      }));
    default:
      return state;
  }
}

// ---------- Context ----------

type Ctx = {
  state: State;
  dispatch: React.Dispatch<Action>;
  today: string;
  productOf: (id: string) => Product | undefined;
  fullCheckActive: TestJob | undefined;
};

const QCContext = createContext<Ctx | null>(null);

const STORAGE_KEY = "qc-store-v1";

export function QCProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, seed);

  // hydrate
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as State;
        dispatch({ type: "hydrate", state: parsed });
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const productOf = useCallback(
    (id: string) => state.products.find((p) => p.id === id),
    [state.products],
  );

  const fullCheckActive = useMemo(
    () =>
      state.jobs.find(
        (j) =>
          j.instructions === "full_check" &&
          (j.status === "in_testing" || j.status === "scheduled"),
      ),
    [state.jobs],
  );

  return (
    <QCContext.Provider value={{ state, dispatch, today, productOf, fullCheckActive }}>
      {children}
    </QCContext.Provider>
  );
}

export function useQC() {
  const ctx = useContext(QCContext);
  if (!ctx) throw new Error("useQC outside QCProvider");
  return ctx;
}

export function newId(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export { defaultStations };
