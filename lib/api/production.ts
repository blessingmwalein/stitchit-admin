import { apiFetch, buildQuery, createCrudApi } from "./client";
import type { ListParams } from "@/lib/types/common";
import type { ProductionJob } from "@/lib/types/production";

export const productionApi = {
  ...createCrudApi<ProductionJob>("/production/jobs"),
  kanban: (params?: ListParams) =>
    apiFetch<{ stageDefs: any[]; columns: Record<string, ProductionJob[]> }>(`/production/jobs/kanban${buildQuery(params)}`),
  startStage: (jobId: string, stageId: string) =>
    apiFetch(`/production/jobs/${jobId}/stages/${stageId}/start`, { method: "POST" }),
  completeStage: (jobId: string, stageId: string, data?: { notes?: string; timeSpentMinutes?: number }) =>
    apiFetch(`/production/jobs/${jobId}/stages/${stageId}/complete`, { method: "POST", body: data }),
  assignStage: (jobId: string, stageId: string, userId: string) =>
    apiFetch(`/production/jobs/${jobId}/stages/${stageId}/assign`, { method: "PATCH", body: { userId } }),
  uploadStageImage: (jobId: string, stageId: string, formData: FormData) =>
    apiFetch(`/production/jobs/${jobId}/stages/${stageId}/images`, {
      method: "POST",
      body: formData as any,
    }),
  allocations: (jobId: string) =>
    apiFetch<any[]>(`/production/jobs/${jobId}/allocations`),
  planAllocation: (jobId: string, data: { materialId: string; plannedQty: number }) =>
    apiFetch(`/production/jobs/${jobId}/allocations/plan`, { method: "POST", body: data }),
  issueAllocation: (jobId: string, data: { materialId: string; warehouseId: string; qty: number; note?: string }) =>
    apiFetch(`/production/jobs/${jobId}/allocations/issue`, { method: "POST", body: data }),
  recordWaste: (jobId: string, data: { materialId: string; warehouseId: string; wasteQty: number; note?: string }) =>
    apiFetch(`/production/jobs/${jobId}/allocations/waste`, { method: "POST", body: data }),
  finalize: (jobId: string, data: { actualWidthCm?: number; actualHeightCm?: number; finalNotes?: string; completedAt?: string }) =>
    apiFetch<{ job: ProductionJob; finishedProduct: { id: string } }>(`/production/jobs/${jobId}/finalize`, { method: "POST", body: data }),
};
