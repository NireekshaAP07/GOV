import {
  demoActivity,
  demoDashboard,
  demoMaterials,
  demoNational,
  demoReviews,
} from "../data/demo";
import type {
  DashboardData,
  Material,
  NationalMaterial,
  ReviewItem,
} from "../types";

const baseUrl = (import.meta.env.VITE_API_BASE_URL || "/api").replace(
  /\/$/,
  "",
);
class ApiError extends Error {}
let demoMode = false;
const listeners = new Set<() => void>();
let reviewStore = [...demoReviews];
let materialStore = [...demoMaterials];
let nationalStore = [...demoNational];
let nextDemoId = 100;

function setDemoMode(value: boolean) {
  if (demoMode === value) return;
  demoMode = value;
  listeners.forEach((listener) => listener());
}

export const apiMode = {
  getSnapshot: () => demoMode,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, init);
  if (!response.ok) {
    const error = await response.text();
    setDemoMode(false);
    throw new ApiError(error || `Request failed (${response.status})`);
  }
  setDemoMode(false);
  return response.json() as Promise<T>;
}

async function withFallback<T>(
  live: () => Promise<T>,
  fallback: () => T | Promise<T>,
): Promise<T> {
  try {
    return await live();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    setDemoMode(true);
    return fallback();
  }
}

const demoSearch = (query: string, filters: Record<string, string> = {}) => {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return materialStore
    .filter((item) => {
      const text =
        `${item.cpse_code ?? ""} ${item.legacy_material_code} ${item.original_description} ${item.category ?? ""} ${item.material ?? ""} ${item.grade ?? ""}`.toLowerCase();
      return (
        terms.every((term) => text.includes(term)) &&
        Object.entries(filters).every(([key, value]) => {
          if (!value) return true;
          if (key === "mapping_status")
            return (
              (item.mapping?.status ??
                (item.national_material ? "APPROVED" : "UNMAPPED")) === value
            );
          if (key === "confidence")
            return (
              (item.mapping?.confidence ?? item.similarity ?? 0) >=
              Number(value.replace("%", "")) / 100
            );
          return (
            String(
              (item as unknown as Record<string, unknown>)[key] ?? "",
            ).toLowerCase() === value.toLowerCase()
          );
        })
      );
    })
    .map((material) => ({
      ...material,
      similarity: material.similarity ?? 0.86,
    }));
};

export const api = {
  dashboard: () =>
    withFallback(
      () => request<DashboardData>("/analytics/dashboard"),
      () => demoDashboard,
    ),
  searchMaterials: (query: string, filters: Record<string, string> = {}) =>
    withFallback(
      async () => {
        const params = new URLSearchParams({ q: query || "bolt" });
        Object.entries(filters).forEach(([key, value]) => {
          if (value && key !== "mapping_status")
            params.set(
              key,
              key === "confidence"
                ? String(Number(value.replace("%", "")) / 100)
                : value,
            );
        });
        const payload = await request<{
          results: Array<{
            material: Material;
            cpse: { code: string; name: string };
            similarity: number;
            mapping?: Material["mapping"];
            national_material?: Material["national_material"];
          }>;
        }>(`/materials/search?${params}`);
        return payload.results
          .map((row) => ({
            ...row.material,
            category:
              row.material.category ??
              String(row.material.fingerprint.category ?? ""),
            material:
              row.material.material ??
              String(row.material.fingerprint.material ?? ""),
            grade:
              row.material.grade ??
              String(row.material.fingerprint.grade ?? ""),
            unit:
              row.material.unit ??
              String(row.material.fingerprint.unit ?? "EA"),
            cpse_code: row.cpse.code,
            cpse_name: row.cpse.name,
            similarity: row.similarity,
            mapping: row.mapping,
            national_material: row.national_material,
          }))
          .filter((item) => {
            const status =
              item.mapping?.status ??
              (item.national_material ? "APPROVED" : "UNMAPPED");
            const confidence = item.mapping?.confidence ?? item.similarity ?? 0;
            return (
              (!filters.mapping_status || status === filters.mapping_status) &&
              (!filters.confidence ||
                confidence >= Number(filters.confidence.replace("%", "")) / 100)
            );
          });
      },
      () => demoSearch(query || "bolt", filters),
    ),
  getMaterial: (id: number) =>
    withFallback(
      () => request<Material>(`/materials/${id}`),
      () => materialStore.find((item) => item.id === id) ?? materialStore[0],
    ),
  reviews: () =>
    withFallback(
      () => request<ReviewItem[]>("/reviews/pending"),
      () => reviewStore,
    ),
  decideReview: (
    id: number,
    decision: "approve" | "reject" | "modify",
    reviewer: string,
    comments: string,
    standardDescription?: string,
  ) =>
    withFallback(
      async () => {
        const path = `/reviews/${id}/${decision}`;
        return request<{
          review_id: number;
          decision: string;
          national_code?: string;
        }>(path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reviewer,
            comments,
            standard_description: standardDescription,
          }),
        });
      },
      () => {
        const current = reviewStore.find((item) => item.review_id === id);
        reviewStore = reviewStore.filter((item) => item.review_id !== id);
        let nationalCode: string | undefined;
        if (current && decision !== "reject") {
          nationalCode = `NMC-${String(nextDemoId++).padStart(8, "0")}`;
          nationalStore = [
            ...nationalStore,
            {
              id: nextDemoId,
              national_code: nationalCode,
              standard_description:
                standardDescription ||
                current.material_a.normalized_description,
              category: current.material_a.category ?? undefined,
              material: current.material_a.material ?? undefined,
              grade: current.material_a.grade ?? undefined,
              technical_attributes: current.material_a.fingerprint,
              version: 1,
              approval_status: "APPROVED",
              cpse_mappings: 2,
            },
          ];
        }
        return {
          review_id: id,
          decision: decision.toUpperCase(),
          national_code: nationalCode,
        };
      },
    ),
  recommend: () =>
    withFallback(
      () =>
        request<{ count: number; recommendations: unknown[] }>(
          "/materials/recommend",
          { method: "POST" },
        ),
      () => ({ count: reviewStore.length, recommendations: reviewStore }),
    ),
  nationalMaterials: () =>
    withFallback(
      async () => {
        const rows = await request<NationalMaterial[]>("/national-materials");
        return Promise.all(
          rows.map(async (row) => ({
            ...row,
            cpse_mappings: (
              await request<{ mappings: unknown[] }>(
                `/mappings/${encodeURIComponent(row.national_code)}`,
              )
            ).mappings.length,
          })),
        );
      },
      () => nationalStore,
    ),
  getNational: (id: number) =>
    withFallback(
      () => request<NationalMaterial>(`/national-materials/${id}`),
      () => nationalStore.find((item) => item.id === id) ?? nationalStore[0],
    ),
  mappings: (code: string) =>
    withFallback(
      () =>
        request<{
          national_code: string;
          mappings: Array<{
            cpse_code: string;
            cpse_name: string;
            legacy_material_code: string;
            original_description: string;
            confidence: number;
            status: string;
          }>;
        }>(`/mappings/${encodeURIComponent(code)}`),
      () => ({
        national_code: code,
        mappings: (code === "NMC-00000002"
          ? materialStore.filter((item) => item.id === 6 || item.id === 7)
          : materialStore.filter((item) => item.id <= 3)
        ).map((item) => ({
          cpse_code: item.cpse_code!,
          cpse_name: item.cpse_name!,
          legacy_material_code: item.legacy_material_code,
          original_description: item.original_description,
          confidence: 0.98,
          status: "APPROVED",
        })),
      }),
    ),
  clusters: () =>
    withFallback(
      () =>
        request<{
          clusters: Array<{ cluster_id: number; material_ids: number[] }>;
        }>("/analytics/clusters"),
      () => ({
        clusters: [
          { cluster_id: 184, material_ids: [1, 2, 3] },
          { cluster_id: 192, material_ids: [6, 7] },
        ],
      }),
    ),
  procurement: () =>
    withFallback(
      () =>
        request<{ opportunities: Array<Record<string, unknown>> }>(
          "/analytics/procurement-opportunities",
        ),
      () => ({
        opportunities: [
          {
            material: "Industrial Bearing 6205",
            participating_cpses: { BHEL: 1200, NTPC: 1350, SAIL: 1180 },
            organization_count: 3,
            combined_demand: 3730,
            historical_spend: 4476000,
            supplier_overlap: ["Eastern Industrial Supply"],
            opportunity_flag: "Potential Collaborative Procurement Opportunity",
          },
        ],
      }),
    ),
  importMaterials: (file: File, cpseCode: string, cpseName: string) =>
    withFallback(
      async () => {
        const form = new FormData();
        form.append("file", file);
        return request<{
          imported: number;
          errors: Array<{ row: number; error: string }>;
        }>(
          `/materials/import?cpse_code=${encodeURIComponent(cpseCode)}&cpse_name=${encodeURIComponent(cpseName)}`,
          { method: "POST", body: form },
        );
      },
      async () => {
        if (!file.name.toLowerCase().endsWith(".csv"))
          throw new Error(
            "Demo mode can preview CSV imports only. Reconnect the backend to import Excel files.",
          );
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(Boolean);
        const rows = lines.slice(1).map((line) => line.split(","));
        let imported = 0;
        rows.forEach(([code, description]) => {
          if (!code || !description) return;
          materialStore.push({
            id: nextDemoId++,
            cpse_id: 99,
            cpse_code: cpseCode,
            cpse_name: cpseName,
            legacy_material_code: code.trim(),
            original_description: description.trim(),
            normalized_description: description.trim().toUpperCase(),
            unit: "EA",
            fingerprint: {},
          });
          imported += 1;
        });
        return { imported, errors: [] };
      },
    ),
  demoActivity: () => demoActivity,
};

export function useApiMode() {
  return ReactUseSyncExternalStore(
    apiMode.subscribe,
    apiMode.getSnapshot,
    apiMode.getSnapshot,
  );
}

import { useSyncExternalStore as ReactUseSyncExternalStore } from "react";
