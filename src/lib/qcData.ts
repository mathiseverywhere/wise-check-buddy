import { supabase } from "@/integrations/supabase/client";
import { useCallback, useEffect, useState } from "react";

// ---------- Types ----------

export type Product = {
  id: string;
  reference: string;
  name: string | null;
  bearing_type: string | null;
  nominal_inner_dia: number | null;
  nominal_outer_dia: number | null;
  nominal_width: number | null;
  has_laser_marking: boolean;
  laser_text: string | null;
  packing_type: string | null;
  remark: string | null;
};

export type Tolerances = {
  product_id: string;
  inner_dia_min: number | null; inner_dia_max: number | null;
  outer_dia_min: number | null; outer_dia_max: number | null;
  width_min: number | null; width_max: number | null;
  noise_max: number | null;
  vibration_low_max: number | null; vibration_mid_max: number | null; vibration_high_max: number | null;
  radial_play_min: number | null; radial_play_max: number | null;
  hardness_inner_min: number | null; hardness_inner_max: number | null;
  hardness_outer_min: number | null; hardness_outer_max: number | null;
};

export type Checklist = {
  job_id: string;
  check_inner_dia: boolean; check_outer_dia: boolean; check_width: boolean;
  check_noise: boolean; check_vibration: boolean; check_radial_play: boolean;
  check_hardness: boolean; check_appearance: boolean; check_spin: boolean;
  check_cage: boolean; check_oil_hole: boolean; check_chamfer: boolean;
  extra_instructions: string | null;
};

export type JobStatus =
  | "awaiting_receipt" | "in_stock" | "in_transport"
  | "scheduled" | "in_testing" | "awaiting_decision"
  | "in_marking" | "in_packing"
  | "in_shipment" | "done" | "rejected";

export type TestJob = {
  id: string;
  product_id: string;
  scheduled_date: string;
  quantity_total: number;
  sample_inner: number; sample_outer: number; sample_width: number; sample_general: number;
  instructions: "normal" | "full_check";
  office_note: string | null;
  status: JobStatus;
  decision: "pass" | "retest" | "reject" | null;
  decision_note: string | null;
  marked_at: string | null;
  packed_at: string | null;
  created_at: string;
  // extended
  order_number: string | null;
  customer: string | null;
  supplier: string | null;
  incoming_qty: number | null;
  laser_text: string | null;
  storage_location: string | null;
  received_at: string | null;
  received_by: string | null;
  inspection_tag: string | null;
  transported_by: string | null;
  transported_at: string | null;
  defect_count: number | null;
  defect_note: string | null;
  shipment_mode: "air" | "sea" | null;
  destination_country: string | null;
  shipped_at: string | null;
  shipment_status: "prepared" | "shipped" | null;
};

export type Station = {
  id: string;
  job_id: string;
  checkpoint_key: string;
  status: "open" | "claimed" | "done";
  claimed_by: string | null;
  claimed_date: string | null;
  measurements: any;
  result: "ok" | "fail" | "unrated" | null;
  note: string | null;
  completed_at: string | null;
};

export type JobReturn = {
  id: string;
  job_id: string;
  quantity: number;
  note: string | null;
  status: "open" | "done";
  done_by: string | null;
  done_at: string | null;
  created_at: string;
};

// ---------- Checkpoint metadata ----------
// NOTE: user requirement — for dim checkpoints, the operator enters the DEVIATION directly (μm),
// not the raw mm measurement. So the tolerance min/max (μm) is compared directly against the input.

export type CheckpointDef = {
  key: string;
  label: string;
  labelCn: string;
  unit?: string;
  sampleField?: "sample_inner" | "sample_outer" | "sample_width" | "sample_general";
  tolMinKey?: keyof Tolerances;
  tolMaxKey?: keyof Tolerances;
  nominalKey?: "nominal_inner_dia" | "nominal_outer_dia" | "nominal_width";
  visual?: boolean;
  checklistKey: keyof Omit<Checklist, "job_id" | "extra_instructions">;
};

export const CHECKPOINTS: CheckpointDef[] = [
  { key: "inner_dia", label: "Innen-Ø Abweichung", labelCn: "内径偏差", unit: "μm",
    sampleField: "sample_inner", tolMinKey: "inner_dia_min", tolMaxKey: "inner_dia_max",
    nominalKey: "nominal_inner_dia", checklistKey: "check_inner_dia" },
  { key: "outer_dia", label: "Außen-Ø Abweichung", labelCn: "外径偏差", unit: "μm",
    sampleField: "sample_outer", tolMinKey: "outer_dia_min", tolMaxKey: "outer_dia_max",
    nominalKey: "nominal_outer_dia", checklistKey: "check_outer_dia" },
  { key: "width", label: "Breite Abweichung", labelCn: "高度偏差", unit: "μm",
    sampleField: "sample_width", tolMinKey: "width_min", tolMaxKey: "width_max",
    nominalKey: "nominal_width", checklistKey: "check_width" },
  { key: "noise", label: "Geräusch", labelCn: "噪音", unit: "dB",
    sampleField: "sample_general", tolMaxKey: "noise_max", checklistKey: "check_noise" },
  { key: "vibration_low", label: "Vibration niedrig", labelCn: "振动 低频", unit: "μm/g",
    sampleField: "sample_general", tolMaxKey: "vibration_low_max", checklistKey: "check_vibration" },
  { key: "vibration_mid", label: "Vibration mittel", labelCn: "振动 中频", unit: "μm/g",
    sampleField: "sample_general", tolMaxKey: "vibration_mid_max", checklistKey: "check_vibration" },
  { key: "vibration_high", label: "Vibration hoch", labelCn: "振动 高频", unit: "μm/g",
    sampleField: "sample_general", tolMaxKey: "vibration_high_max", checklistKey: "check_vibration" },
  { key: "radial_play", label: "Radialspiel", labelCn: "游隙", unit: "μm",
    sampleField: "sample_general", tolMinKey: "radial_play_min", tolMaxKey: "radial_play_max",
    checklistKey: "check_radial_play" },
  { key: "hardness_inner", label: "Härte Innenring", labelCn: "硬度 内圈", unit: "HRC",
    sampleField: "sample_general", tolMinKey: "hardness_inner_min", tolMaxKey: "hardness_inner_max",
    checklistKey: "check_hardness" },
  { key: "hardness_outer", label: "Härte Außenring", labelCn: "硬度 外圈", unit: "HRC",
    sampleField: "sample_general", tolMinKey: "hardness_outer_min", tolMaxKey: "hardness_outer_max",
    checklistKey: "check_hardness" },
  { key: "appearance", label: "Optik", labelCn: "外观", visual: true, checklistKey: "check_appearance" },
  { key: "spin", label: "Lauf/Rotation", labelCn: "转动", visual: true, checklistKey: "check_spin" },
  { key: "cage", label: "Käfig", labelCn: "保持器", visual: true, checklistKey: "check_cage" },
  { key: "oil_hole", label: "Öl-Bohrung", labelCn: "油孔", visual: true, checklistKey: "check_oil_hole" },
  { key: "chamfer", label: "Fase/Verrundung", labelCn: "倒角", visual: true, checklistKey: "check_chamfer" },
];

export function getCheckpoint(key: string): CheckpointDef | undefined {
  return CHECKPOINTS.find((c) => c.key === key);
}

export function activeCheckpoints(cl: Checklist | null, tol: Tolerances | null): CheckpointDef[] {
  if (!cl) return [];
  return CHECKPOINTS.filter((cp) => {
    if (!cl[cp.checklistKey]) return false;
    if (!cp.visual && (cp.tolMinKey || cp.tolMaxKey)) {
      const hasMin = cp.tolMinKey && tol?.[cp.tolMinKey] != null;
      const hasMax = cp.tolMaxKey && tol?.[cp.tolMaxKey] != null;
      if (cp.key.startsWith("vibration_") || cp.key.startsWith("hardness_")) {
        if (!hasMin && !hasMax) return false;
      }
    }
    return true;
  });
}

// Direct comparison — input value is already in the unit stored in the tolerance columns.
export function evaluateValue(
  raw: string,
  cp: CheckpointDef,
  tol: Tolerances | null,
): "ok" | "fail" | null {
  if (cp.visual) return null;
  const v = parseFloat(raw.replace(",", "."));
  if (Number.isNaN(v)) return null;
  const min = cp.tolMinKey ? tol?.[cp.tolMinKey] : null;
  const max = cp.tolMaxKey ? tol?.[cp.tolMaxKey] : null;
  if (min == null && max == null) return null;
  if (min != null && v < (min as number)) return "fail";
  if (max != null && v > (max as number)) return "fail";
  return "ok";
}

// ---------- Hooks ----------

type FetchState<T> = { data: T; loading: boolean; error: string | null; refetch: () => void };

export function useProducts(): FetchState<Product[]> {
  const [data, setData] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("products").select("*").order("reference");
    if (error) setError(error.message);
    else setData((data as Product[]) ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  return { data, loading, error, refetch: load };
}

export function useTolerancesMap(): FetchState<Record<string, Tolerances>> {
  const [data, setData] = useState<Record<string, Tolerances>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("product_tolerances").select("*");
    if (error) setError(error.message);
    else {
      const map: Record<string, Tolerances> = {};
      for (const t of (data as Tolerances[]) ?? []) map[t.product_id] = t;
      setData(map);
    }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  return { data, loading, error, refetch: load };
}

export function useJobs(): FetchState<TestJob[]> & { checklists: Record<string, Checklist> } {
  const [data, setData] = useState<TestJob[]>([]);
  const [checklists, setChecklists] = useState<Record<string, Checklist>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: jobs, error: e1 }, { data: cls, error: e2 }] = await Promise.all([
      supabase.from("test_jobs").select("*").order("created_at", { ascending: false }),
      supabase.from("job_checklist").select("*"),
    ]);
    if (e1 || e2) setError((e1 ?? e2)!.message);
    else {
      setData((jobs as TestJob[]) ?? []);
      const map: Record<string, Checklist> = {};
      for (const c of (cls as Checklist[]) ?? []) map[c.job_id] = c;
      setChecklists(map);
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
    const ch = supabase
      .channel("qc-jobs")
      .on("postgres_changes", { event: "*", schema: "public", table: "test_jobs" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "job_checklist" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);
  return { data, checklists, loading, error, refetch: load };
}

export function useStations(jobIds: string[]): FetchState<Record<string, Station[]>> {
  const [data, setData] = useState<Record<string, Station[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const key = jobIds.slice().sort().join(",");
  const load = useCallback(async () => {
    if (jobIds.length === 0) { setData({}); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("job_stations").select("*").in("job_id", jobIds);
    if (error) setError(error.message);
    else {
      const map: Record<string, Station[]> = {};
      for (const s of (data as Station[]) ?? []) {
        (map[s.job_id] ||= []).push(s);
      }
      setData(map);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    load();
    const ch = supabase
      .channel("qc-stations-" + key)
      .on("postgres_changes", { event: "*", schema: "public", table: "job_stations" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [key, load]);
  return { data, loading, error, refetch: load };
}

export function useReturns(): FetchState<JobReturn[]> {
  const [data, setData] = useState<JobReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("job_returns").select("*").order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setData((data as JobReturn[]) ?? []);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
    const ch = supabase
      .channel("qc-returns")
      .on("postgres_changes", { event: "*", schema: "public", table: "job_returns" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);
  return { data, loading, error, refetch: load };
}

// ---------- Mutations ----------

export async function addProduct(p: Omit<Product, "id"> & { tolerances?: Partial<Tolerances> }) {
  const { tolerances, ...rest } = p as any;
  const { data, error } = await supabase.from("products").insert(rest).select("*").single();
  if (error) throw error;
  const tol: any = { product_id: data.id, ...(tolerances ?? {}) };
  await supabase.from("product_tolerances").upsert(tol);
  return data as Product;
}

export async function upsertTolerances(product_id: string, patch: Partial<Tolerances>) {
  const { error } = await supabase.from("product_tolerances").upsert({ product_id, ...patch });
  if (error) throw error;
}

// Office creates the ORDER (starts at Warenannahme queue)
export async function createOrder(input: {
  order_number: string;
  product_id: string;
  customer: string;
  supplier: string;
  incoming_qty: number;
  sample_general: number;   // controlled quantity — allgemeiner Test
  sample_inner: number;
  sample_outer: number;
  sample_width: number;
  laser_text?: string | null;
  office_note?: string | null;
  checklist: Omit<Checklist, "job_id">;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: job, error } = await supabase
    .from("test_jobs")
    .insert({
      product_id: input.product_id,
      scheduled_date: today,
      quantity_total: input.incoming_qty,
      sample_inner: input.sample_inner,
      sample_outer: input.sample_outer,
      sample_width: input.sample_width,
      sample_general: input.sample_general,
      instructions: "normal",
      office_note: input.office_note ?? null,
      status: "awaiting_receipt",
      order_number: input.order_number,
      customer: input.customer,
      supplier: input.supplier,
      incoming_qty: input.incoming_qty,
      laser_text: input.laser_text ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  await supabase.from("job_checklist").insert({ job_id: job.id, ...input.checklist });
  return job as TestJob;
}

export async function receiveOrder(job_id: string, storage_location: string, worker: string) {
  const { error } = await supabase
    .from("test_jobs")
    .update({
      status: "in_stock",
      storage_location,
      received_at: new Date().toISOString(),
      received_by: worker,
    })
    .eq("id", job_id);
  if (error) throw error;
}

export async function bookToQc(job_id: string, scheduled_date: string, instructions: "normal" | "full_check") {
  const { error } = await supabase
    .from("test_jobs")
    .update({ status: "scheduled", scheduled_date, instructions })
    .eq("id", job_id);
  if (error) throw error;
}

export async function ensureStation(job_id: string, checkpoint_key: string): Promise<Station> {
  const { data: existing } = await supabase
    .from("job_stations").select("*").eq("job_id", job_id).eq("checkpoint_key", checkpoint_key).maybeSingle();
  if (existing) return existing as Station;
  const { data, error } = await supabase
    .from("job_stations")
    .insert({ job_id, checkpoint_key, status: "open" })
    .select("*").single();
  if (error) throw error;
  return data as Station;
}

export async function claimStation(id: string, worker: string, date: string) {
  const { error } = await supabase
    .from("job_stations")
    .update({ status: "claimed", claimed_by: worker, claimed_date: date })
    .eq("id", id).eq("status", "open");
  if (error) throw error;
}

export async function releaseStation(id: string) {
  const { error } = await supabase
    .from("job_stations")
    .update({ status: "open", claimed_by: null, claimed_date: null })
    .eq("id", id);
  if (error) throw error;
}

export async function completeStation(
  id: string,
  measurements: any,
  result: "ok" | "fail" | "unrated",
  note?: string,
) {
  const { error } = await supabase
    .from("job_stations")
    .update({
      status: "done",
      measurements,
      result,
      note: note ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function markJobInTesting(job_id: string) {
  await supabase.from("test_jobs").update({ status: "in_testing" }).eq("id", job_id).eq("status", "scheduled");
}

export async function advanceIfComplete(job_id: string, activeKeys: string[]) {
  const { data } = await supabase.from("job_stations").select("checkpoint_key,status").eq("job_id", job_id);
  const doneKeys = new Set((data ?? []).filter((s: any) => s.status === "done").map((s: any) => s.checkpoint_key));
  const allDone = activeKeys.every((k) => doneKeys.has(k));
  if (allDone && activeKeys.length > 0) {
    await supabase.from("test_jobs").update({ status: "awaiting_decision" }).eq("id", job_id);
  }
}

export async function decideJob(
  job_id: string,
  decision: "pass" | "retest" | "reject",
  note: string | undefined,
  productHasLaser: boolean,
  defectCount: number,
  defectNote: string | undefined,
) {
  let status: JobStatus;
  if (decision === "pass") status = productHasLaser ? "in_marking" : "in_packing";
  else if (decision === "reject") status = "rejected";
  else {
    await supabase.from("job_stations").delete().eq("job_id", job_id);
    status = "in_testing";
  }
  const { error } = await supabase
    .from("test_jobs")
    .update({
      decision,
      decision_note: note ?? null,
      status,
      defect_count: defectCount,
      defect_note: defectNote ?? null,
    })
    .eq("id", job_id);
  if (error) throw error;

  if (decision !== "retest" && defectCount > 0) {
    await supabase.from("job_returns").insert({
      job_id,
      quantity: defectCount,
      note: defectNote ?? null,
      status: "open",
    });
  }
}

export async function completeReturn(id: string, worker: string) {
  const { error } = await supabase
    .from("job_returns")
    .update({ status: "done", done_by: worker, done_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function completeMarking(job_id: string) {
  await supabase.from("test_jobs").update({ status: "in_packing", marked_at: new Date().toISOString() }).eq("id", job_id);
}

export async function completePacking(job_id: string) {
  await supabase.from("test_jobs").update({ status: "in_shipment", packed_at: new Date().toISOString() }).eq("id", job_id);
}

export async function setShipment(job_id: string, mode: "air" | "sea", destination_country: string) {
  const { error } = await supabase
    .from("test_jobs")
    .update({ shipment_mode: mode, destination_country, shipment_status: "prepared" })
    .eq("id", job_id);
  if (error) throw error;
}

export async function confirmShipment(job_id: string) {
  const { error } = await supabase
    .from("test_jobs")
    .update({ shipment_status: "shipped", shipped_at: new Date().toISOString(), status: "done" })
    .eq("id", job_id);
  if (error) throw error;
}
