import type { Trace, ModelStats } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "";

export async function fetchTraces(limit?: number): Promise<Trace[]> {
  const params = new URLSearchParams();
  if (limit) params.set("limit", String(limit));
  const res = await fetch(`${API_URL}/api/traces?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch traces: ${res.status}`);
  return res.json();
}

export async function fetchStats(): Promise<ModelStats[]> {
  const res = await fetch(`${API_URL}/api/stats`);
  if (!res.ok) throw new Error(`Failed to fetch stats: ${res.status}`);
  return res.json();
}

export async function fetchModels(): Promise<string[]> {
  const res = await fetch(`${API_URL}/api/models`);
  if (!res.ok) throw new Error(`Failed to fetch models: ${res.status}`);
  return res.json();
}
